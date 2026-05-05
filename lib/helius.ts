/**
 * lib/helius.ts — Helius enhanced transaction parser
 *
 * Pure parser. No env access. No DB access. No server-only import.
 * Importable by API routes and scripts alike.
 *
 * Run parser checks: npm run check:parser
 */

// ---------------------------------------------------------------------------
// Internal structural types — matched against real Helius enhancedTransaction
// ---------------------------------------------------------------------------

interface HeliusTokenTransfer {
  fromTokenAccount: string;
  fromUserAccount: string;
  mint: string;
  toTokenAccount: string;
  toUserAccount: string;
  tokenAmount: number; // float — display only, never use for amount_raw
  tokenStandard: string;
}

interface HeliusEnhancedTransaction {
  signature: string;
  timestamp: number;
  slot: number;
  feePayer: string;
  accountData: unknown[];
  tokenTransfers: unknown[];
  instructions: unknown[];
  transactionError: unknown;
}

// ---------------------------------------------------------------------------
// Public output type
// ---------------------------------------------------------------------------

export interface ParsedTransfer {
  signature: string;
  sender_wallet: string;
  recipient_wallet: string;
  recipient_token_account: string;
  mint: string;
  amount_raw: bigint;
  decimals: number;
  timestamp: number | null;
  slot: number | null;
  reference_candidates: string[];
}

// ---------------------------------------------------------------------------
// Well-known program IDs excluded from reference candidate extraction
// ---------------------------------------------------------------------------

const KNOWN_PROGRAM_IDS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   // Token Program
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bVV",  // Associated Token Program
  "11111111111111111111111111111111",                // System Program
]);

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

function isArr(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Narrow unknown to HeliusEnhancedTransaction — returns null if required
// fields are absent or wrong type.
// ---------------------------------------------------------------------------

function narrowTx(v: unknown): HeliusEnhancedTransaction | null {
  if (!isObj(v)) return null;
  if (!isStr(v.signature) || v.signature === "") return null;
  if (!isArr(v.tokenTransfers)) return null;
  if (!isArr(v.accountData)) return null;
  if (!isArr(v.instructions)) return null;
  return v as unknown as HeliusEnhancedTransaction;
}

// ---------------------------------------------------------------------------
// Look up positive raw token amount from accountData for a given ATA + mint.
// Uses rawTokenAmount.tokenAmount (string integer) — never the float field.
// Returns null if not found or amount is non-positive.
// ---------------------------------------------------------------------------

function findRawAmount(
  accountData: unknown[],
  tokenAccount: string,
  expectedMint: string
): { amount_raw: bigint; decimals: number } | null {
  for (const entry of accountData) {
    if (!isObj(entry)) continue;
    if (entry.account !== tokenAccount) continue;
    if (!isArr(entry.tokenBalanceChanges)) continue;

    for (const tbc of entry.tokenBalanceChanges) {
      if (!isObj(tbc)) continue;
      if (tbc.mint !== expectedMint) continue;

      const raw = tbc.rawTokenAmount;
      if (!isObj(raw)) continue;
      if (!isStr(raw.tokenAmount)) continue;
      if (!isNum(raw.decimals)) continue;

      let amount_raw: bigint;
      try {
        amount_raw = BigInt(raw.tokenAmount);
      } catch {
        continue;
      }

      // Only accept positive amounts — incoming credit to this account
      if (amount_raw <= BigInt(0)) continue;

      return { amount_raw, decimals: raw.decimals as number };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extract reference candidates from instruction account lists.
// Excludes all known participants (sender, recipient, mint, feePayer) and
// known program IDs. Any remaining key is a potential Solana Pay reference.
// ---------------------------------------------------------------------------

function extractReferenceCandidates(
  instructions: unknown[],
  knownAccounts: Set<string>
): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const ix of instructions) {
    if (!isObj(ix)) continue;
    if (!isArr(ix.accounts)) continue;

    for (const acct of ix.accounts) {
      if (!isStr(acct)) continue;
      if (knownAccounts.has(acct)) continue;
      if (KNOWN_PROGRAM_IDS.has(acct)) continue;
      if (seen.has(acct)) continue;
      seen.add(acct);
      candidates.push(acct);
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse the first valid incoming USDC transfer from a Helius enhanced webhook payload.
 *
 * Iterates all transaction objects in the payload array, and all tokenTransfers within
 * each transaction. Returns the first valid match found anywhere in the batch.
 * amount_raw is derived from accountData[].tokenBalanceChanges[].rawTokenAmount.tokenAmount
 * (a string integer). The floating-point tokenTransfers[].tokenAmount field is never used.
 *
 * @param payload        - raw Helius enhanced payload (unknown array)
 * @param merchantWallet - expected recipient wallet owner pubkey (base58)
 * @param merchantAta    - expected recipient USDC ATA pubkey (base58)
 * @param expectedMint   - expected USDC mint pubkey (base58)
 * @returns ParsedTransfer for the first valid match, or null if none found
 *
 * Never throws. Returns null for any malformed, unexpected, or non-matching payload.
 */
export function parseUsdcTransfer(
  payload: unknown,
  merchantWallet: string,
  merchantAta: string,
  expectedMint: string
): ParsedTransfer | null {
  try {
    if (!isArr(payload) || payload.length === 0) return null;

    for (const item of payload) {
      const tx = narrowTx(item);
      if (tx === null) continue;

      for (const rawTt of tx.tokenTransfers) {
        if (!isObj(rawTt)) continue;
        const tt = rawTt as unknown as HeliusTokenTransfer;

        // Validate mint
        if (!isStr(tt.mint) || tt.mint !== expectedMint) continue;

        // Validate destination — must match merchant wallet owner or merchant ATA
        if (!isStr(tt.toUserAccount) || !isStr(tt.toTokenAccount)) continue;
        if (tt.toUserAccount !== merchantWallet && tt.toTokenAccount !== merchantAta) continue;

        // Validate source fields
        if (!isStr(tt.fromUserAccount) || tt.fromUserAccount === "") continue;
        if (!isStr(tt.fromTokenAccount) || tt.fromTokenAccount === "") continue;

        // Derive amount_raw from accountData — rawTokenAmount.tokenAmount is a string integer.
        // tokenTransfers[].tokenAmount is a float and must never be used for amount_raw.
        const amountResult = findRawAmount(tx.accountData, tt.toTokenAccount, expectedMint);
        if (amountResult === null) continue;

        // Build known-accounts exclusion set for reference candidate filtering
        const knownAccounts = new Set([
          tt.fromUserAccount,
          tt.fromTokenAccount,
          tt.toUserAccount,
          tt.toTokenAccount,
          expectedMint,
        ]);
        if (isStr(tx.feePayer) && tx.feePayer !== "") {
          knownAccounts.add(tx.feePayer);
        }

        return {
          signature: tx.signature,
          sender_wallet: tt.fromUserAccount,
          recipient_wallet: tt.toUserAccount,
          recipient_token_account: tt.toTokenAccount,
          mint: tt.mint,
          amount_raw: amountResult.amount_raw,
          decimals: amountResult.decimals,
          timestamp: isNum(tx.timestamp) ? tx.timestamp : null,
          slot: isNum(tx.slot) ? tx.slot : null,
          reference_candidates: extractReferenceCandidates(tx.instructions, knownAccounts),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
