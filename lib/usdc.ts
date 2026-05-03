import BigNumber from "bignumber.js";

/**
 * USDC uses 6 decimal places on Solana.
 * 1 USDC = 1_000_000 raw base units.
 * 100 USDC = 100_000_000 raw base units.
 */
export const USDC_DECIMALS = 6;

/**
 * Converts a human-readable USDC amount string to raw integer base units.
 *
 * Uses BigNumber internally to avoid floating-point errors.
 * All comparisons and storage use raw base units.
 *
 * @param humanAmount - decimal string, e.g. "100", "1.5", "0.000001"
 * @returns bigint raw units, e.g. 100000000n for "100"
 *
 * Only strict decimal notation is accepted: digits, optional dot, more digits.
 * Scientific notation (1e3), hex (0x10), leading/trailing dots (.5, 1.) are rejected.
 *
 * @throws if amount is empty, non-decimal-format, negative, or has more than 6 decimal places
 */
export function toRawUnits(humanAmount: string): bigint {
  const trimmed = humanAmount.trim();

  if (trimmed === "") {
    throw new Error("USDC amount must not be empty.");
  }

  // Reject scientific notation, hex, and any non-standard decimal format.
  // Valid: "100", "1.5", "0.000001". Invalid: "1e3", "0x10", ".5", "1.".
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("USDC amount must be a plain decimal string (e.g. \"1.5\").");
  }

  const bn = new BigNumber(trimmed);

  if (bn.isNaN()) {
    throw new Error("USDC amount must be a valid number.");
  }

  if (bn.isNegative()) {
    throw new Error("USDC amount must not be negative.");
  }

  const dp = bn.decimalPlaces();
  if (dp !== null && dp > USDC_DECIMALS) {
    throw new Error(
      `USDC amount must not have more than ${USDC_DECIMALS} decimal places.`
    );
  }

  // shiftedBy(+6) is exact integer arithmetic — no floating point involved.
  const raw = bn.shiftedBy(USDC_DECIMALS).integerValue(BigNumber.ROUND_DOWN);

  return BigInt(raw.toFixed(0));
}

/**
 * Converts raw integer USDC base units to a human-readable decimal string.
 *
 * @param rawAmount - raw base units as bigint or numeric string
 *   number is intentionally excluded: JS number can lose precision for large
 *   raw unit values before BigNumber ever sees it.
 * @returns human-readable string, e.g. "100" for 100000000, "1.5" for 1500000
 *
 * @throws if rawAmount is negative, non-integer, or non-numeric
 */
export function toHumanAmount(rawAmount: bigint | string): string {
  const bn = new BigNumber(rawAmount.toString());

  if (bn.isNaN()) {
    throw new Error("Raw USDC amount must be a valid number.");
  }

  if (bn.isNegative()) {
    throw new Error("Raw USDC amount must not be negative.");
  }

  if (!bn.isInteger()) {
    throw new Error("Raw USDC amount must be an integer.");
  }

  // shiftedBy(-6) is exact. toFixed() with no args returns the minimum
  // decimal places needed to represent the value exactly (no trailing zeros).
  return bn.shiftedBy(-USDC_DECIMALS).toFixed();
}
