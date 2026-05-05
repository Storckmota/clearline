/**
 * Phase 8.2 — Parser Checks
 *
 * Verifies parseUsdcTransfer() against fixtures/helius/raw-capture.json.
 * Follows the PASS/FAIL pattern from scripts/check-classifier.ts.
 *
 * Run: npm run check:parser
 *   or: npx tsx scripts/check-parser.ts
 *
 * Exits non-zero on any failure.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { parseUsdcTransfer } from "../lib/helius";
import type { ParsedTransfer } from "../lib/helius";

// ---------------------------------------------------------------------------
// Check harness
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;

function check(label: string, got: unknown, want: unknown): void {
  const match =
    typeof got === "bigint" && typeof want === "bigint"
      ? got === want
      : JSON.stringify(got) === JSON.stringify(want);
  if (match) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label);
    console.error("  got: ", JSON.stringify(got, (_k, v) => (typeof v === "bigint" ? v.toString() + "n" : v)));
    console.error("  want:", JSON.stringify(want, (_k, v) => (typeof v === "bigint" ? v.toString() + "n" : v)));
    fail++;
  }
}

function checkNull(label: string, result: ParsedTransfer | null): void {
  if (result === null) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label, "-> expected null, got ParsedTransfer");
    fail++;
  }
}

function checkNotNull(label: string, result: ParsedTransfer | null): void {
  if (result !== null) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label, "-> expected ParsedTransfer, got null");
    fail++;
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const fixturePath = resolve(process.cwd(), "fixtures/helius/raw-capture.json");
const fixture: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));

// Known fixture values — derived from accountData, not tokenTransfers float.
const MERCHANT_WALLET = "4imzXJrDPSPjdHoo48izKv7K92PxcwCUiZHLZhgAGGBG";
const MERCHANT_ATA    = "CaUARQQrc4umBbq8ewYQkkhovgJLKCw1LHdeM6Hrbv6F";
const USDC_MINT       = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const EXPECTED_SIG    = "3oSgDJPbUCo5TNcj98hck2gBJ41JPrBR7WmPBuVy9GSmB6THkkRPD1Pg9itT8ecgPmGFFM2JMgDt9Vwc2pKuNwiS";
const WRONG_MINT      = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // mainnet USDC — wrong for devnet

// ---------------------------------------------------------------------------
// Golden path — parse real fixture
// ---------------------------------------------------------------------------

console.log("\n--- golden path ---");

const result = parseUsdcTransfer(fixture, MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT);

checkNotNull("fixture parses to non-null", result);

if (result !== null) {
  check("signature", result.signature, EXPECTED_SIG);
  check("sender_wallet", result.sender_wallet, "EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V");
  check("recipient_wallet", result.recipient_wallet, MERCHANT_WALLET);
  check("recipient_token_account", result.recipient_token_account, MERCHANT_ATA);
  check("mint", result.mint, USDC_MINT);
  check("amount_raw", result.amount_raw, BigInt(1000));
  check("decimals", result.decimals, 6);
  check("reference_candidates is empty array", result.reference_candidates, []);
  // timestamp and slot are real numbers from the fixture
  check("timestamp is number", typeof result.timestamp === "number", true);
  check("slot is number", typeof result.slot === "number", true);
}

// ---------------------------------------------------------------------------
// amount_raw is NOT the float tokenAmount (0.001 USDC = 1000 raw, not 0.001)
// ---------------------------------------------------------------------------

console.log("\n--- no floating point amount source ---");

if (result !== null) {
  check(
    "amount_raw is BigInt(1000), not float-derived",
    result.amount_raw === BigInt(1000),
    true
  );
  check(
    "amount_raw is not 1 (float 0.001 truncated to int)",
    result.amount_raw !== BigInt(1),
    true
  );
}

// ---------------------------------------------------------------------------
// Safety checks — null returns
// ---------------------------------------------------------------------------

console.log("\n--- null payload ---");

checkNull("null returns null", parseUsdcTransfer(null, MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));
checkNull("empty array returns null", parseUsdcTransfer([], MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));
checkNull("empty object returns null", parseUsdcTransfer({}, MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));
checkNull("string returns null", parseUsdcTransfer("invalid", MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));

console.log("\n--- malformed payload ---");

checkNull("missing signature returns null", parseUsdcTransfer([{ tokenTransfers: [], accountData: [], instructions: [] }], MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));
checkNull("missing tokenTransfers returns null", parseUsdcTransfer([{ signature: "abc" }], MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT));

console.log("\n--- wrong mint ---");

checkNull("wrong mint returns null", parseUsdcTransfer(fixture, MERCHANT_WALLET, MERCHANT_ATA, WRONG_MINT));

console.log("\n--- wrong recipient ---");

const WRONG_WALLET = "11111111111111111111111111111111";
checkNull("wrong merchant wallet + wrong ATA returns null", parseUsdcTransfer(fixture, WRONG_WALLET, WRONG_WALLET, USDC_MINT));

// ---------------------------------------------------------------------------
// Batch array behavior — parser must iterate all items, not only payload[0]
// ---------------------------------------------------------------------------

console.log("\n--- batched array: invalid first item, valid second item ---");

// payload[0] = malformed (no signature) — narrowTx returns null, parser must continue
// payload[1] = real fixture item — parser must find and return it
const fixtureItem = (fixture as unknown[])[0];
const batchInvalidFirst = [{ tokenTransfers: [], accountData: [], instructions: [] }, fixtureItem];
const batchResult1 = parseUsdcTransfer(batchInvalidFirst, MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT);
checkNotNull("invalid first item, valid second item → non-null", batchResult1);
if (batchResult1 !== null) {
  check("returns signature from second item", batchResult1.signature, EXPECTED_SIG);
  check("returns correct amount_raw from second item", batchResult1.amount_raw, BigInt(1000));
}

console.log("\n--- batched array: wrong mint first item, valid second item ---");

// payload[0] = valid structure but wrong mint in tokenTransfers — inner loop skips all transfers
// payload[1] = real fixture item — parser must find and return it
const wrongMintTx = {
  signature: "dummy-sig-wrong-mint",
  timestamp: 0,
  slot: 0,
  feePayer: "",
  accountData: [],
  instructions: [],
  tokenTransfers: [{
    fromTokenAccount: "FBFvZvhv36SS2r3T8GoBx3WafQ2H7PAf2Bc7C1xv3pAb",
    fromUserAccount: "EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V",
    mint: WRONG_MINT,
    toTokenAccount: MERCHANT_ATA,
    toUserAccount: MERCHANT_WALLET,
    tokenAmount: 0.001,
    tokenStandard: "Fungible",
  }],
};
const batchWrongMintFirst = [wrongMintTx, fixtureItem];
const batchResult2 = parseUsdcTransfer(batchWrongMintFirst, MERCHANT_WALLET, MERCHANT_ATA, USDC_MINT);
checkNotNull("wrong mint first item, valid second item → non-null", batchResult2);
if (batchResult2 !== null) {
  check("skips wrong-mint item, returns correct signature", batchResult2.signature, EXPECTED_SIG);
}

console.log("\n--- batched array: all items invalid → null ---");

checkNull(
  "two invalid items returns null",
  parseUsdcTransfer(
    [{ tokenTransfers: [], accountData: [], instructions: [] }, { signature: "x" }],
    MERCHANT_WALLET,
    MERCHANT_ATA,
    USDC_MINT
  )
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
