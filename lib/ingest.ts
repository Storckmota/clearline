import "server-only";
import { PublicKey } from "@solana/web3.js";
import { config } from "./config";
import { supabaseAdmin } from "./supabase";
import { parseUsdcTransfer } from "./helius";
import { getTransactionAccountKeys, findReferenceMatch } from "./rpc";
import { classify } from "./classify";
import { deriveUsdcAta } from "./derive-ata";
import type { SolanaNetwork } from "./solana/constants";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IngestStatus =
  | "duplicate_sig"
  | "no_transfer"
  | "ingest_error"
  | "paid"
  | "partial"
  | "overpaid"
  | "duplicate"
  | "unknown";

export interface IngestResult {
  status: IngestStatus;
  signature?: string;
  transaction_id?: string;
  classification_reason?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface MatchableReceivable {
  id: string;
  reference_pubkey: string;
  status: "pending" | "paid" | "partial" | "overpaid";
  expected_amount_raw: string | number;
}

// ---------------------------------------------------------------------------
// Signature extraction — logging / observability only
//
// NOT used for dedupe or insert. The dedupe signature always comes from
// parsed.signature so it is guaranteed to match the inserted row.
// Exported for unit testing.
// ---------------------------------------------------------------------------

/**
 * Extract the first non-empty string signature from a Helius payload array.
 * Used for observability logging when no valid transfer is parsed.
 * Do NOT use this for dedupe — use parsed.signature instead.
 */
export function extractSignatureFromPayload(payload: unknown): string | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  for (const item of payload) {
    if (item === null || typeof item !== "object") continue;
    const sig = (item as Record<string, unknown>).signature;
    if (typeof sig === "string" && sig !== "") return sig;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main ingestion function
// ---------------------------------------------------------------------------

/**
 * Process a Helius enhanced webhook payload end-to-end:
 *   1. Resolve merchant identity from config
 *   2. Parse USDC transfer (pure, cheap — must precede dedupe)
 *   3. Dedupe by parsed.signature (always matches the row that will be inserted)
 *   4. Insert transaction row (before classification)
 *   5. Reference match (parser candidates → DB, then RPC fallback)
 *   6. Classify
 *   7. Update transaction with final status/reason/reference
 *   8. Update receivable status for paid/partial/overpaid
 *
 * Always returns — never throws. Caller always returns 200 to Helius.
 */
export async function ingest(payload: unknown): Promise<IngestResult> {
  // Step 1: Resolve merchant identity (needed by parser)
  const network = config.SOLANA_NETWORK as SolanaNetwork;
  const usdcMint =
    network === "mainnet-beta" ? config.USDC_MINT_MAINNET : config.USDC_MINT_DEVNET;

  const merchantWallet = config.RECIPIENT_WALLET;
  if (!merchantWallet) {
    console.error("[ingest] RECIPIENT_WALLET not configured");
    return { status: "ingest_error" };
  }

  let merchantAta: string;
  if (config.RECIPIENT_USDC_ATA) {
    merchantAta = config.RECIPIENT_USDC_ATA;
  } else {
    try {
      merchantAta = deriveUsdcAta(new PublicKey(merchantWallet), network).toBase58();
    } catch (e) {
      console.error("[ingest] Failed to derive merchant ATA:", e);
      return { status: "ingest_error" };
    }
  }

  // Step 2: Parse USDC transfer (pure, cheap — before any DB access)
  const parsed = parseUsdcTransfer(payload, merchantWallet, merchantAta, usdcMint);
  if (parsed === null) {
    // Use shell signature for logging only — do not dedupe on it.
    const shellSig = extractSignatureFromPayload(payload);
    console.log(`[ingest] No USDC transfer in payload — shell sig: ${shellSig?.slice(0, 12) ?? "none"}…`);
    return { status: "no_transfer", signature: shellSig ?? undefined };
  }

  // Step 3: Dedupe by parsed.signature — guaranteed to match the row that will be inserted.
  let dedupeError = false;
  try {
    const { data: existing, error: queryError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("signature", parsed.signature)
      .maybeSingle();

    if (queryError) {
      console.error(`[ingest] Dedupe query error: ${queryError.code}`);
      dedupeError = true;
    } else if (existing) {
      console.log(`[ingest] Duplicate signature — ${parsed.signature.slice(0, 12)}…`);
      return { status: "duplicate_sig", signature: parsed.signature };
    }
  } catch (e) {
    console.error("[ingest] Dedupe query threw:", e);
    dedupeError = true;
  }

  if (dedupeError) {
    return { status: "ingest_error", signature: parsed.signature };
  }

  // Step 4: Insert transaction row (status/reason will be updated after classification)
  let transactionId: string;
  try {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        signature: parsed.signature,
        sender_wallet: parsed.sender_wallet,
        recipient_wallet: parsed.recipient_wallet,
        mint: parsed.mint,
        amount_raw: String(parsed.amount_raw),
        observed_at: parsed.timestamp !== null
          ? new Date(parsed.timestamp * 1000).toISOString()
          : null,
        raw_payload: payload,
        status: "unknown",
        classification_reason: "Unclassified",
      })
      .select("id")
      .single();

    if (insertError) {
      // 23505 = unique_violation — race condition, treat as duplicate
      if (insertError.code === "23505") {
        console.log(`[ingest] Race condition — duplicate on insert: ${parsed.signature.slice(0, 12)}…`);
        return { status: "duplicate_sig", signature: parsed.signature };
      }
      console.error(`[ingest] Insert error: ${insertError.code}`);
      return { status: "ingest_error", signature: parsed.signature };
    }

    transactionId = (inserted as { id: string }).id;
  } catch (e) {
    console.error("[ingest] Insert threw:", e);
    return { status: "ingest_error", signature: parsed.signature };
  }

  // Step 5: Reference matching
  let matchedReceivable: MatchableReceivable | null = null;
  let rpcAttempted = false;
  let rpcFailed = false;

  // 5a: Try parser candidates first (no network needed)
  if (parsed.reference_candidates.length > 0) {
    try {
      const { data: rows, error: refError } = await supabaseAdmin
        .from("receivables")
        .select("id, reference_pubkey, status, expected_amount_raw")
        .in("reference_pubkey", parsed.reference_candidates);

      if (refError) {
        console.error(`[ingest] Receivable lookup error: ${refError.code}`);
      } else if (rows && rows.length > 0) {
        const candidates = (rows as MatchableReceivable[]).map(r => r.reference_pubkey);
        const winner = findReferenceMatch(parsed.reference_candidates, candidates);
        if (winner) {
          matchedReceivable = (rows as MatchableReceivable[]).find(r => r.reference_pubkey === winner) ?? null;
        }
      }
    } catch (e) {
      console.error("[ingest] Receivable lookup threw:", e);
    }
  }

  // 5b: RPC fallback if no parser match
  if (matchedReceivable === null) {
    rpcAttempted = true;
    let rpcKeys: string[] = [];
    try {
      rpcKeys = await getTransactionAccountKeys(parsed.signature, config.SOLANA_RPC_URL);
    } catch {
      rpcKeys = [];
    }

    if (rpcKeys.length === 0) {
      rpcFailed = true;
    } else {
      try {
        const { data: allReceivables, error: rpcRefError } = await supabaseAdmin
          .from("receivables")
          .select("id, reference_pubkey, status, expected_amount_raw");

        if (rpcRefError) {
          console.error(`[ingest] RPC receivable lookup error: ${rpcRefError.code}`);
          rpcFailed = true;
        } else if (allReceivables && allReceivables.length > 0) {
          const candidates = (allReceivables as MatchableReceivable[]).map(r => r.reference_pubkey);
          const winner = findReferenceMatch(rpcKeys, candidates);
          if (winner) {
            matchedReceivable = (allReceivables as MatchableReceivable[]).find(r => r.reference_pubkey === winner) ?? null;
          }
        }
      } catch (e) {
        console.error("[ingest] RPC receivable lookup threw:", e);
        rpcFailed = true;
      }
    }
  }

  // Step 6: Classify
  const classifyInput = matchedReceivable
    ? {
        status: matchedReceivable.status,
        expected_amount_raw: String(matchedReceivable.expected_amount_raw),
      }
    : null;

  let classifyResult = classify(classifyInput, { amount_raw: String(parsed.amount_raw) });

  // Override reason when RPC was attempted and failed with no reference found
  if (matchedReceivable === null && rpcAttempted && rpcFailed) {
    classifyResult = {
      status: classifyResult.status,
      reason: "Reference not found; RPC fallback failed",
    };
  }

  // Step 7: Update transaction with final classification
  const referencePubkey = matchedReceivable?.reference_pubkey ?? null;
  const receivableId = matchedReceivable?.id ?? null;

  try {
    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update({
        status: classifyResult.status,
        classification_reason: classifyResult.reason,
        reference_pubkey: referencePubkey,
        receivable_id: receivableId,
      })
      .eq("id", transactionId);

    if (updateError) {
      console.error(`[ingest] Transaction update error: ${updateError.code}`);
    }
  } catch (e) {
    console.error("[ingest] Transaction update threw:", e);
  }

  // Step 8: Update receivable status for paid/partial/overpaid only
  if (
    matchedReceivable !== null &&
    (classifyResult.status === "paid" ||
      classifyResult.status === "partial" ||
      classifyResult.status === "overpaid")
  ) {
    try {
      const { error: receivableUpdateError } = await supabaseAdmin
        .from("receivables")
        .update({ status: classifyResult.status })
        .eq("id", matchedReceivable.id);

      if (receivableUpdateError) {
        console.error(`[ingest] Receivable update error: ${receivableUpdateError.code}`);
      }
    } catch (e) {
      console.error("[ingest] Receivable update threw:", e);
    }
  }

  return {
    status: classifyResult.status,
    signature: parsed.signature,
    transaction_id: transactionId,
    classification_reason: classifyResult.reason,
  };
}
