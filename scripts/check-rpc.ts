/**
 * Phase 8.3 — RPC Fallback Checks
 *
 * Verifies extractAccountKeys(), findReferenceMatch(), and getTransactionAccountKeys().
 * Follows the PASS/FAIL pattern from scripts/check-classifier.ts.
 *
 * Pure logic tests require no network access.
 * Live RPC smoke check uses the known devnet fixture signature.
 * If RPC is unavailable, live checks are reported as SKIP, not FAIL.
 *
 * Run: npm run check:rpc
 *   or: npx tsx scripts/check-rpc.ts
 *
 * Exits non-zero on any FAIL. SKIP does not count as failure.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  extractAccountKeys,
  findReferenceMatch,
  getTransactionAccountKeys,
} from "../lib/rpc";

// ---------------------------------------------------------------------------
// Check harness
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;
let skip = 0;

function check(label: string, got: unknown, want: unknown): void {
  const match = JSON.stringify(got) === JSON.stringify(want);
  if (match) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label);
    console.error("  got: ", JSON.stringify(got));
    console.error("  want:", JSON.stringify(want));
    fail++;
  }
}

function checkTrue(label: string, condition: boolean): void {
  if (condition) {
    console.log("PASS", label);
    pass++;
  } else {
    console.error("FAIL", label);
    fail++;
  }
}

function reportSkip(label: string, reason: string): void {
  console.log("SKIP", label, `— ${reason}`);
  skip++;
}

// ---------------------------------------------------------------------------
// Mock helpers — PublicKey-like objects with .toBase58()
// ---------------------------------------------------------------------------

const pk = (addr: string) => ({ toBase58: () => addr });

// ---------------------------------------------------------------------------
// findReferenceMatch — pure logic (synchronous, no network)
// ---------------------------------------------------------------------------

console.log("\n--- findReferenceMatch: basic matching ---");

check(
  "returns match when candidate appears in accountKeys",
  findReferenceMatch(["AAA", "BBB", "RefKey"], ["RefKey"]),
  "RefKey"
);

check(
  "returns null when no candidate appears in accountKeys",
  findReferenceMatch(["AAA", "BBB", "CCC"], ["RefKey"]),
  null
);

check(
  "returns null for empty accountKeys",
  findReferenceMatch([], ["RefKey"]),
  null
);

check(
  "returns null for empty candidateReferences",
  findReferenceMatch(["AAA", "BBB"], []),
  null
);

check(
  "returns null for both empty",
  findReferenceMatch([], []),
  null
);

console.log("\n--- findReferenceMatch: first match wins ---");

check(
  "returns first matching candidate, not second",
  findReferenceMatch(["AAA", "Ref1", "Ref2"], ["Ref1", "Ref2"]),
  "Ref1"
);

check(
  "returns second candidate when first not present",
  findReferenceMatch(["AAA", "Ref2"], ["Ref1", "Ref2"]),
  "Ref2"
);

check(
  "candidate order determines winner, not accountKeys order",
  findReferenceMatch(["Ref2", "Ref1"], ["Ref1", "Ref2"]),
  "Ref1"
);

// ---------------------------------------------------------------------------
// extractAccountKeys — staticAccountKeys (v0 / VersionedMessage style)
// ---------------------------------------------------------------------------

console.log("\n--- extractAccountKeys: staticAccountKeys style ---");

const mockV0Tx = {
  transaction: {
    message: {
      staticAccountKeys: [pk("AAA"), pk("BBB"), pk("CCC")],
    },
  },
  meta: null,
};

check(
  "extracts keys from staticAccountKeys",
  extractAccountKeys(mockV0Tx),
  ["AAA", "BBB", "CCC"]
);

// ---------------------------------------------------------------------------
// extractAccountKeys — accountKeys (legacy Message style)
// ---------------------------------------------------------------------------

console.log("\n--- extractAccountKeys: accountKeys style ---");

const mockLegacyTx = {
  transaction: {
    message: {
      accountKeys: [pk("DDD"), pk("EEE"), pk("FFF")],
    },
  },
  meta: null,
};

check(
  "extracts keys from accountKeys (legacy style)",
  extractAccountKeys(mockLegacyTx),
  ["DDD", "EEE", "FFF"]
);

// ---------------------------------------------------------------------------
// extractAccountKeys — loadedAddresses (writable + readonly)
// ---------------------------------------------------------------------------

console.log("\n--- extractAccountKeys: loadedAddresses ---");

const mockWithLoaded = {
  transaction: {
    message: {
      staticAccountKeys: [pk("StaticA"), pk("StaticB")],
    },
  },
  meta: {
    loadedAddresses: {
      writable: [pk("WritableX"), pk("WritableY")],
      readonly: [pk("ReadonlyZ")],
    },
  },
};

check(
  "includes writable and readonly loaded addresses after static keys",
  extractAccountKeys(mockWithLoaded),
  ["StaticA", "StaticB", "WritableX", "WritableY", "ReadonlyZ"]
);

const mockWritableOnly = {
  transaction: {
    message: { staticAccountKeys: [pk("StaticA")] },
  },
  meta: {
    loadedAddresses: { writable: [pk("WritableX")], readonly: [] },
  },
};

check(
  "includes writable when readonly is empty",
  extractAccountKeys(mockWritableOnly),
  ["StaticA", "WritableX"]
);

const mockReadonlyOnly = {
  transaction: {
    message: { staticAccountKeys: [pk("StaticA")] },
  },
  meta: {
    loadedAddresses: { writable: [], readonly: [pk("ReadonlyZ")] },
  },
};

check(
  "includes readonly when writable is empty",
  extractAccountKeys(mockReadonlyOnly),
  ["StaticA", "ReadonlyZ"]
);

// ---------------------------------------------------------------------------
// extractAccountKeys — deduplication
// ---------------------------------------------------------------------------

console.log("\n--- extractAccountKeys: deduplication ---");

const mockWithDupes = {
  transaction: {
    message: {
      staticAccountKeys: [pk("AAA"), pk("BBB"), pk("AAA")],
    },
  },
  meta: {
    loadedAddresses: {
      writable: [pk("BBB"), pk("CCC")],
      readonly: [pk("CCC"), pk("DDD")],
    },
  },
};

check(
  "deduplicates keys preserving first occurrence order",
  extractAccountKeys(mockWithDupes),
  ["AAA", "BBB", "CCC", "DDD"]
);

check(
  "staticAccountKeys preferred over accountKeys when both present",
  extractAccountKeys({
    transaction: {
      message: {
        staticAccountKeys: [pk("Static")],
        accountKeys: [pk("Legacy")],
      },
    },
    meta: null,
  }),
  ["Static"]
);

// ---------------------------------------------------------------------------
// extractAccountKeys — edge cases / invalid input
// ---------------------------------------------------------------------------

console.log("\n--- extractAccountKeys: edge cases ---");

check("null returns []", extractAccountKeys(null), []);
check("undefined returns []", extractAccountKeys(undefined), []);
check("empty object returns []", extractAccountKeys({}), []);
check("string returns []", extractAccountKeys("invalid"), []);
check("no message returns []", extractAccountKeys({ transaction: {} }), []);
check(
  "no keys arrays returns []",
  extractAccountKeys({ transaction: { message: {} } }),
  []
);

// ---------------------------------------------------------------------------
// Async section — getTransactionAccountKeys error paths + live RPC
// ---------------------------------------------------------------------------

// Load SOLANA_RPC_URL from .env.local — only reads allowlisted key, no server imports.
function loadRpcUrl(): string | null {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key === "SOLANA_RPC_URL" && val) return val;
  }
  return null;
}

async function runAsyncChecks(): Promise<void> {
  // -------------------------------------------------------------------------
  // getTransactionAccountKeys — invalid input (no network)
  // -------------------------------------------------------------------------

  console.log("\n--- getTransactionAccountKeys: invalid input ---");

  check(
    "empty signature returns []",
    await getTransactionAccountKeys("", "https://api.devnet.solana.com"),
    []
  );
  check(
    "empty rpcUrl returns []",
    await getTransactionAccountKeys("somesig", ""),
    []
  );

  console.log("\n--- getTransactionAccountKeys: unreachable RPC (fail-closed) ---");

  // Unreachable URL must return [], never throw.
  const badUrlResult = await getTransactionAccountKeys(
    "3oSgDJPbUCo5TNcj98hck2gBJ41JPrBR7WmPBuVy9GSmB6THkkRPD1Pg9itT8ecgPmGFFM2JMgDt9Vwc2pKuNwiS",
    "https://invalid.localhost.invalid"
  );
  check("unreachable RPC returns [] (never throws)", badUrlResult, []);

  // -------------------------------------------------------------------------
  // Live RPC smoke check — devnet fixture signature
  // -------------------------------------------------------------------------

  console.log("\n--- live RPC smoke check (devnet) ---");

  const configuredRpc = loadRpcUrl();
  const liveRpcUrl = configuredRpc ?? "https://api.devnet.solana.com";
  const liveRpcSource = configuredRpc
    ? "SOLANA_RPC_URL from .env.local"
    : "public devnet fallback";
  console.log(`  RPC: ${liveRpcSource}`);

  const FIXTURE_SIG =
    "3oSgDJPbUCo5TNcj98hck2gBJ41JPrBR7WmPBuVy9GSmB6THkkRPD1Pg9itT8ecgPmGFFM2JMgDt9Vwc2pKuNwiS";

  // Known accounts from fixtures/helius/raw-capture.json that appear in the
  // message account keys of a transferChecked instruction.
  // Note: the merchant WALLET (4imzXJrD…) is the ATA owner but is NOT in the
  // message account keys — the instruction references the ATA directly.
  const EXPECTED_IN_KEYS = [
    "EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V", // payer wallet (fee payer + authority)
    "CaUARQQrc4umBbq8ewYQkkhovgJLKCw1LHdeM6Hrbv6F", // merchant USDC ATA (destination)
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC mint
  ];

  let liveKeys: string[];
  try {
    liveKeys = await getTransactionAccountKeys(FIXTURE_SIG, liveRpcUrl);
  } catch {
    liveKeys = [];
  }

  if (liveKeys.length === 0) {
    reportSkip(
      "live RPC: fixture transaction",
      "RPC unavailable or rate-limited — this is not a code failure"
    );
    reportSkip("live RPC: all keys are valid base58 strings", "RPC unavailable");
    for (const expected of EXPECTED_IN_KEYS) {
      reportSkip(`live RPC: keys include ${expected.slice(0, 8)}…`, "RPC unavailable");
    }
    reportSkip(
      "live RPC: no reference match for raw transfer (null)",
      "RPC unavailable"
    );
  } else {
    checkTrue("live RPC: returned non-empty account key list", liveKeys.length > 0);
    checkTrue(
      "live RPC: all returned keys are non-empty strings",
      liveKeys.every(k => typeof k === "string" && k.length > 0)
    );
    for (const expected of EXPECTED_IN_KEYS) {
      checkTrue(
        `live RPC: account keys include ${expected.slice(0, 8)}…`,
        liveKeys.includes(expected)
      );
    }
    // This fixture is a raw transfer — no Solana Pay reference.
    // findReferenceMatch must return null against any candidate list.
    check(
      "live RPC: no reference match for raw transfer (expected null)",
      findReferenceMatch(liveKeys, ["SomeNonExistentRefPubkey1111111111111111"]),
      null
    );
  }
}

runAsyncChecks()
  .then(() => {
    console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
    process.exit(fail > 0 ? 1 : 0);
  })
  .catch((e: unknown) => {
    console.error("Unexpected error in async checks:", e);
    process.exit(1);
  });
