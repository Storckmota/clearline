import { toHumanAmount } from "./usdc";

// ---------------------------------------------------------------------------
// Local input types — minimal structural types for classifier inputs only.
// These are not shared DB schema types. Callers (ingestion pipeline, resolve
// endpoint) are responsible for converting Supabase-returned numbers to
// bigint or string before calling classify().
// ---------------------------------------------------------------------------

interface ClassifiableReceivable {
  status: "pending" | "paid" | "partial" | "overpaid";
  expected_amount_raw: bigint | string;
}

interface ClassifiableTransaction {
  amount_raw: bigint | string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type ClassifyStatus =
  | "paid"
  | "partial"
  | "overpaid"
  | "duplicate"
  | "unknown";

export interface ClassifyResult {
  status: ClassifyStatus;
  reason: string;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Pure classification function.
 *
 * Rules applied in strict order:
 *   1. No receivable         → unknown
 *   2. Receivable paid       → duplicate
 *   3. received === expected → paid
 *   4. received <  expected  → partial
 *   5. received >  expected  → overpaid
 *
 * Amounts are compared as bigint — no floating point math.
 * overdue is a display-only state and is never produced here.
 *
 * @param receivable - matched receivable row, or null if no reference match
 * @param transaction - object containing amount_raw (bigint or string)
 */
export function classify(
  receivable: ClassifiableReceivable | null,
  transaction: ClassifiableTransaction
): ClassifyResult {
  // Rule 1: no matching receivable
  if (receivable === null) {
    return {
      status: "unknown",
      reason: "Unknown: no matching Solana Pay reference found.",
    };
  }

  // Rule 2: receivable already fully paid → business duplicate
  // partial/overpaid receivables can still receive further payments.
  if (receivable.status === "paid") {
    return {
      status: "duplicate",
      reason: "Duplicate: expected payment already marked paid.",
    };
  }

  // Convert to bigint for exact integer comparison — no floating point.
  const expected = BigInt(receivable.expected_amount_raw);
  const received = BigInt(transaction.amount_raw);

  const exp = toHumanAmount(expected);
  const rec = toHumanAmount(received);

  // Rule 3: exact match
  if (received === expected) {
    return {
      status: "paid",
      reason: `Exact match: expected ${exp} USDC, received ${rec} USDC, reference matched.`,
    };
  }

  // Rule 4: partial payment
  if (received < expected) {
    return {
      status: "partial",
      reason: `Partial: expected ${exp} USDC, received ${rec} USDC, reference matched.`,
    };
  }

  // Rule 5: overpaid (received > expected)
  return {
    status: "overpaid",
    reason: `Overpaid: expected ${exp} USDC, received ${rec} USDC, reference matched.`,
  };
}
