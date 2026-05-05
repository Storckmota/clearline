/**
 * lib/rpc.ts — Solana RPC fallback for reference extraction
 *
 * Pure module. No env access. No DB access. No server-only import.
 * Caller provides rpcUrl. Used by lib/ingest.ts in Phase 9.
 *
 * Run checks: npm run check:rpc
 */

import { Connection } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Account key extraction
// ---------------------------------------------------------------------------

/**
 * Extract and normalize account keys from a raw RPC transaction response object.
 *
 * Handles:
 *   - message.staticAccountKeys  (VersionedMessage / v0 transactions)
 *   - message.accountKeys        (legacy transactions)
 *   - meta.loadedAddresses.writable  (Address Lookup Table)
 *   - meta.loadedAddresses.readonly  (Address Lookup Table)
 *
 * All keys normalized to base58 via .toBase58(). Deduplicated, preserving order.
 * Never throws — returns [] for any unrecognized structure.
 *
 * Exported for unit testing with mock objects in scripts/check-rpc.ts.
 */
export function extractAccountKeys(txResponse: unknown): string[] {
  try {
    if (txResponse === null || typeof txResponse !== "object") return [];
    const tx = txResponse as Record<string, unknown>;

    const transaction = tx.transaction;
    if (!transaction || typeof transaction !== "object") return [];
    const msg = (transaction as Record<string, unknown>).message;
    if (!msg || typeof msg !== "object") return [];

    const msgRecord = msg as Record<string, unknown>;

    // Support staticAccountKeys (v0 / VersionedMessage) and accountKeys (legacy Message)
    const rawKeys: unknown[] = Array.isArray(msgRecord.staticAccountKeys)
      ? (msgRecord.staticAccountKeys as unknown[])
      : Array.isArray(msgRecord.accountKeys)
      ? (msgRecord.accountKeys as unknown[])
      : [];

    const keys: string[] = rawKeys
      .filter(
        (k): k is { toBase58(): string } =>
          k !== null &&
          typeof k === "object" &&
          typeof (k as Record<string, unknown>).toBase58 === "function"
      )
      .map(k => k.toBase58());

    // Include Address Lookup Table loaded addresses when present
    const meta = tx.meta;
    if (meta !== null && meta !== undefined && typeof meta === "object") {
      const loaded = (meta as Record<string, unknown>).loadedAddresses;
      if (loaded !== null && loaded !== undefined && typeof loaded === "object") {
        const loadedRecord = loaded as Record<string, unknown>;

        if (Array.isArray(loadedRecord.writable)) {
          for (const k of loadedRecord.writable as unknown[]) {
            if (k !== null && typeof k === "object" &&
                typeof (k as Record<string, unknown>).toBase58 === "function") {
              keys.push((k as { toBase58(): string }).toBase58());
            }
          }
        }

        if (Array.isArray(loadedRecord.readonly)) {
          for (const k of loadedRecord.readonly as unknown[]) {
            if (k !== null && typeof k === "object" &&
                typeof (k as Record<string, unknown>).toBase58 === "function") {
              keys.push((k as { toBase58(): string }).toBase58());
            }
          }
        }
      }
    }

    // Deduplicate while preserving insertion order
    const seen = new Set<string>();
    const result: string[] = [];
    for (const k of keys) {
      if (!seen.has(k)) {
        seen.add(k);
        result.push(k);
      }
    }
    return result;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// RPC fetch
// ---------------------------------------------------------------------------

/**
 * Fetch all account keys from a confirmed transaction via Solana RPC.
 *
 * Uses maxSupportedTransactionVersion: 0 to support both legacy and v0 transactions.
 * Returns [] on null response, invalid input, or any caught error. Never throws.
 *
 * @param signature - base58 transaction signature
 * @param rpcUrl    - Solana RPC endpoint URL; caller provides from lib/config.ts
 */
export async function getTransactionAccountKeys(
  signature: string,
  rpcUrl: string
): Promise<string[]> {
  try {
    if (!signature || !rpcUrl) return [];
    const connection = new Connection(rpcUrl, "confirmed");
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (tx === null) return [];
    return extractAccountKeys(tx);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reference matching
// ---------------------------------------------------------------------------

/**
 * Return the first candidate reference found in accountKeys, or null.
 * Pure and synchronous — no network or DB access.
 *
 * Iterates candidateReferences in order and returns the first one that appears
 * in the accountKeys set. Caller is responsible for providing open receivable
 * reference_pubkey values as candidateReferences (Phase 9 lib/ingest.ts).
 *
 * @param accountKeys         - base58 account keys from the transaction
 * @param candidateReferences - reference_pubkey values from open receivables
 */
export function findReferenceMatch(
  accountKeys: string[],
  candidateReferences: string[]
): string | null {
  const keySet = new Set(accountKeys);
  for (const ref of candidateReferences) {
    if (keySet.has(ref)) return ref;
  }
  return null;
}
