/**
 * Phase 3.3 — Classifier Checks
 *
 * Verifies all classification statuses and required reason strings by
 * importing and executing the real classify() from lib/classify.ts.
 *
 * Run: npm run check:classifier
 *   or: npx tsx scripts/check-classifier.ts
 *
 * Exits non-zero on any failure.
 * Required by TASKS.md §3.3 and ACCEPTANCE_CRITERIA.md §12–13.
 */

import { classify } from "../lib/classify";
import type { ClassifyResult } from "../lib/classify";

// ---------------------------------------------------------------------------
// Check harness
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;

function check(
  label: string,
  result: ClassifyResult,
  expectedStatus: string,
  expectedReason: string
): void {
  const statusOk = result.status === expectedStatus;
  const reasonOk = result.reason === expectedReason;
  if (statusOk && reasonOk) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label);
    if (!statusOk) {
      console.error("  status: got", JSON.stringify(result.status), "want", JSON.stringify(expectedStatus));
    }
    if (!reasonOk) {
      console.error("  reason: got ", JSON.stringify(result.reason));
      console.error("  reason: want", JSON.stringify(expectedReason));
    }
    fail++;
  }
}

function checkNot(label: string, result: ClassifyResult, forbiddenStatus: string): void {
  if (result.status === forbiddenStatus) {
    console.error("FAIL", label, "-> got forbidden status", JSON.stringify(result.status));
    fail++;
  } else {
    console.log("PASS", label, "-> did not produce", JSON.stringify(forbiddenStatus));
    pass++;
  }
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

// String raw amounts: bigint literals require ES2020+ target but tsconfig targets
// ES2017. classify() accepts bigint | string, so strings test the same logic path.
const PENDING_100  = { status: "pending"  as const, expected_amount_raw: "100000000" };
const PARTIAL_100  = { status: "partial"  as const, expected_amount_raw: "100000000" };
const OVERPAID_100 = { status: "overpaid" as const, expected_amount_raw: "100000000" };
const PAID_100     = { status: "paid"     as const, expected_amount_raw: "100000000" };

const TX_100  = { amount_raw: "100000000" };  // exact
const TX_60   = { amount_raw:  "60000000" };  // partial
const TX_120  = { amount_raw: "120000000" };  // overpaid

// ---------------------------------------------------------------------------
// Unknown (Rule 1)
// ---------------------------------------------------------------------------

console.log("\n--- unknown ---");

check(
  "null receivable → unknown",
  classify(null, TX_100),
  "unknown",
  "Unknown: no matching Solana Pay reference found."
);

check(
  "null receivable, any amount → unknown (not classified by amount)",
  classify(null, TX_60),
  "unknown",
  "Unknown: no matching Solana Pay reference found."
);

// ---------------------------------------------------------------------------
// Duplicate (Rule 2)
// ---------------------------------------------------------------------------

console.log("\n--- duplicate ---");

check(
  "paid receivable + exact amount → duplicate",
  classify(PAID_100, TX_100),
  "duplicate",
  "Duplicate: expected payment already marked paid."
);

check(
  "paid receivable + partial amount → duplicate (not partial)",
  classify(PAID_100, TX_60),
  "duplicate",
  "Duplicate: expected payment already marked paid."
);

check(
  "paid receivable + overpaid amount → duplicate (not overpaid)",
  classify(PAID_100, TX_120),
  "duplicate",
  "Duplicate: expected payment already marked paid."
);

// ---------------------------------------------------------------------------
// Paid (Rule 3)
// ---------------------------------------------------------------------------

console.log("\n--- paid ---");

check(
  "pending receivable + exact amount → paid",
  classify(PENDING_100, TX_100),
  "paid",
  "Exact match: expected 100 USDC, received 100 USDC, reference matched."
);

check(
  "partial receivable + exact amount → paid (not duplicate)",
  classify(PARTIAL_100, TX_100),
  "paid",
  "Exact match: expected 100 USDC, received 100 USDC, reference matched."
);

check(
  "overpaid receivable + exact amount → paid (not duplicate)",
  classify(OVERPAID_100, TX_100),
  "paid",
  "Exact match: expected 100 USDC, received 100 USDC, reference matched."
);

check(
  "string raw amounts → paid",
  classify(
    { status: "pending", expected_amount_raw: "100000000" },
    { amount_raw: "100000000" }
  ),
  "paid",
  "Exact match: expected 100 USDC, received 100 USDC, reference matched."
);

// ---------------------------------------------------------------------------
// Partial (Rule 4)
// ---------------------------------------------------------------------------

console.log("\n--- partial ---");

check(
  "pending receivable + 60 of 100 USDC → partial",
  classify(PENDING_100, TX_60),
  "partial",
  "Partial: expected 100 USDC, received 60 USDC, reference matched."
);

check(
  "partial receivable + lower amount → partial (not duplicate)",
  classify(PARTIAL_100, TX_60),
  "partial",
  "Partial: expected 100 USDC, received 60 USDC, reference matched."
);

check(
  "fractional USDC partial",
  classify(
    { status: "pending", expected_amount_raw: "100000000" },
    { amount_raw: "1500000" }
  ),
  "partial",
  "Partial: expected 100 USDC, received 1.5 USDC, reference matched."
);

check(
  "1 raw unit partial",
  classify(PENDING_100, { amount_raw: "1" }),
  "partial",
  "Partial: expected 100 USDC, received 0.000001 USDC, reference matched."
);

// ---------------------------------------------------------------------------
// Overpaid (Rule 5)
// ---------------------------------------------------------------------------

console.log("\n--- overpaid ---");

check(
  "pending receivable + 120 of 100 USDC → overpaid",
  classify(PENDING_100, TX_120),
  "overpaid",
  "Overpaid: expected 100 USDC, received 120 USDC, reference matched."
);

check(
  "overpaid receivable + higher amount → overpaid (not duplicate)",
  classify(OVERPAID_100, TX_120),
  "overpaid",
  "Overpaid: expected 100 USDC, received 120 USDC, reference matched."
);

// ---------------------------------------------------------------------------
// overdue is never a classification status
// ---------------------------------------------------------------------------

console.log("\n--- overdue never produced ---");

checkNot(
  "pending receivable → never overdue",
  classify(PENDING_100, TX_100),
  "overdue"
);

checkNot(
  "null receivable → never overdue",
  classify(null, TX_100),
  "overdue"
);

// ---------------------------------------------------------------------------
// Rule order: duplicate checked before amount comparison
// ---------------------------------------------------------------------------

console.log("\n--- rule order ---");

check(
  "paid receivable takes precedence over amount comparison",
  classify(PAID_100, { amount_raw: "200000000" }),
  "duplicate",
  "Duplicate: expected payment already marked paid."
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
