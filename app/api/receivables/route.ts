import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { toRawUnits } from "../../../lib/usdc";
import { generateReference, buildSolanaPayUrl } from "../../../lib/solana-pay";
import { getUsdcMint } from "../../../lib/solana/mint";
import { supabaseAdmin } from "../../../lib/supabase";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/receivables?merchant_wallet=<base58>
// Returns all receivables for the given merchant wallet, with linked
// transactions and a computed display_status (overdue is display-only).
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // --- Validate merchant_wallet query param ---------------------------------
  const raw = req.nextUrl.searchParams.get("merchant_wallet");

  if (!raw || raw.trim() === "") {
    return NextResponse.json(
      { error: "merchant_wallet query param is required." },
      { status: 400 }
    );
  }

  let merchantPubkey: PublicKey;
  try {
    merchantPubkey = new PublicKey(raw.trim());
  } catch {
    return NextResponse.json(
      { error: "Invalid merchant_wallet: must be a valid Solana public key." },
      { status: 400 }
    );
  }

  // --- Query Supabase -------------------------------------------------------
  const { data, error } = await supabaseAdmin
    .from("receivables")
    .select(
      `id, merchant_wallet, label, expected_amount_raw, due_date,
       reference_pubkey, solana_pay_url, status, created_at,
       transactions (
         id, signature, amount_raw, status, classification_reason,
         sender_wallet, recipient_wallet, mint, reference_pubkey,
         observed_at, created_at
       )`
    )
    .eq("merchant_wallet", merchantPubkey.toBase58())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/receivables] Supabase query failed:", error.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // --- Compute display_status (overdue is display-only, never written to DB) -
  const now = new Date();
  const receivables = (data ?? []).map((r) => ({
    ...r,
    display_status:
      r.status === "pending" && r.due_date && new Date(r.due_date) < now
        ? "overdue"
        : r.status,
  }));

  return NextResponse.json({ receivables }, { status: 200 });
}

// ---------------------------------------------------------------------------
// POST /api/receivables
// Creates an expected USDC payment and returns the receivable + Solana Pay URL.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // --- Parse body -----------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const {
    merchant_wallet,
    label,
    amount,
    due_date,
  } = body as Record<string, unknown>;

  // --- Validate merchant_wallet ---------------------------------------------
  if (typeof merchant_wallet !== "string" || merchant_wallet.trim() === "") {
    return NextResponse.json(
      { error: "merchant_wallet is required." },
      { status: 400 }
    );
  }

  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(merchant_wallet.trim());
  } catch {
    return NextResponse.json(
      { error: "Invalid merchant_wallet: must be a valid Solana public key." },
      { status: 400 }
    );
  }

  // --- Validate label -------------------------------------------------------
  if (typeof label !== "string" || label.trim() === "") {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }
  const trimmedLabel = label.trim();

  // --- Validate amount ------------------------------------------------------
  if (typeof amount !== "string") {
    return NextResponse.json(
      { error: "amount is required as a decimal string (e.g. \"100\" or \"1.5\")." },
      { status: 400 }
    );
  }

  let rawUnits: bigint;
  try {
    rawUnits = toRawUnits(amount);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid amount.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // --- Validate due_date (optional) ----------------------------------------
  // Accept ISO-like date strings only. Reject ambiguous or invalid values.
  let dueDateIso: string | null = null;
  if (due_date !== undefined && due_date !== null) {
    if (typeof due_date !== "string") {
      return NextResponse.json(
        { error: "due_date must be an ISO date string (e.g. \"2026-05-10\")." },
        { status: 400 }
      );
    }
    // Require YYYY-MM-DD or full ISO-8601 format — reject bare timestamps, etc.
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
    if (!ISO_DATE_RE.test(due_date.trim())) {
      return NextResponse.json(
        { error: "due_date must be an ISO date string (e.g. \"2026-05-10\")." },
        { status: 400 }
      );
    }
    const parsed = new Date(due_date.trim());
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "due_date must be a valid ISO date string (e.g. \"2026-05-10\")." },
        { status: 400 }
      );
    }
    dueDateIso = parsed.toISOString();
  }

  // --- Get USDC mint from server config ------------------------------------
  let usdcMint: PublicKey;
  try {
    usdcMint = getUsdcMint();
  } catch {
    console.error("[POST /api/receivables] Failed to read USDC mint from config");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // --- Generate reference public key ---------------------------------------
  const reference = generateReference();

  // --- Build Solana Pay URL ------------------------------------------------
  let solanaPayUrl: string;
  try {
    solanaPayUrl = buildSolanaPayUrl({
      recipient: recipientPubkey,
      amount,
      splToken: usdcMint,
      reference,
      label: trimmedLabel,
    }).toString();
  } catch {
    console.error("[POST /api/receivables] Failed to build Solana Pay URL");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // --- Insert into Supabase ------------------------------------------------
  const { data, error } = await supabaseAdmin
    .from("receivables")
    .insert({
      merchant_wallet: merchant_wallet.trim(),
      label: trimmedLabel,
      expected_amount_raw: rawUnits.toString(),
      due_date: dueDateIso,
      reference_pubkey: reference.toBase58(),
      solana_pay_url: solanaPayUrl,
    })
    .select(
      "id, merchant_wallet, label, expected_amount_raw, due_date, reference_pubkey, solana_pay_url, status, created_at"
    )
    .single();

  if (error) {
    console.error("[POST /api/receivables] Supabase insert failed:", error.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ receivable: data }, { status: 201 });
}
