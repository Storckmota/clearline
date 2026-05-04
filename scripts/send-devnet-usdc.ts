/**
 * Devnet-only scripted USDC transfer for Clearline demo and testing.
 *
 * Usage:
 *   npm run send:devnet-usdc -- --recipient <merchant_wallet> --amount <decimal> [--reference <pubkey>]
 *
 * Transfer modes:
 *   Exact / partial / overpaid:   include --reference <pubkey>
 *   Raw unknown (no reference):   omit --reference
 *
 * Required env (set in .env.local):
 *   SOLANA_NETWORK       must be exactly "devnet"
 *   PAYER_KEYPAIR_PATH   path to [u8;64] JSON keypair file
 *
 * Optional env:
 *   SOLANA_RPC_URL       devnet RPC endpoint (must contain "devnet"; falls back to public devnet)
 *
 * Security:
 *   - Fails closed: SOLANA_NETWORK must be exactly "devnet".
 *   - USDC mint is hardcoded to devnet value — no override accepted.
 *   - Never prints private key bytes or keypair file path.
 *   - Only loads allowlisted keys from .env.local.
 *   - Does not import lib/config.ts, lib/solana/mint.ts, or lib/supabase.ts.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { toRawUnits, toHumanAmount, USDC_DECIMALS } from "../lib/usdc";
import { deriveUsdcAta } from "../lib/derive-ata";
import { USDC_MINT_ADDRESSES } from "../lib/solana/constants";

// ---------------------------------------------------------------------------
// .env.local loader — allowlisted keys only, never imports app secrets
// ---------------------------------------------------------------------------

const ENV_ALLOWLIST = new Set(["SOLANA_NETWORK", "SOLANA_RPC_URL", "PAYER_KEYPAIR_PATH"]);

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    // Only load allowlisted keys. Never override vars already set in the process environment.
    if (key && val && ENV_ALLOWLIST.has(key) && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// CLI arg parser
// ---------------------------------------------------------------------------

interface CliArgs {
  recipient: string;
  amount: string;
  reference?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: Partial<CliArgs> = {};

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const next = args[i + 1];
    if (flag === "--recipient" && next) { result.recipient = next; i++; }
    else if (flag === "--amount" && next) { result.amount = next; i++; }
    else if (flag === "--reference" && next) { result.reference = next; i++; }
  }

  if (!result.recipient) {
    console.error("Error: --recipient <merchant_wallet> is required.");
    process.exit(1);
  }
  if (!result.amount) {
    console.error("Error: --amount <decimal_usdc> is required.");
    process.exit(1);
  }

  return result as CliArgs;
}

// ---------------------------------------------------------------------------
// Devnet safety guards — fail closed before any signing or sending path
// ---------------------------------------------------------------------------

function assertDevnet(): void {
  // SOLANA_NETWORK must be present and exactly "devnet".
  const network = process.env.SOLANA_NETWORK;
  if (network !== "devnet") {
    console.error(
      'Error: SOLANA_NETWORK must be set to "devnet". This script is devnet-only.'
    );
    process.exit(1);
  }

  // If SOLANA_RPC_URL is set it must look like a devnet endpoint.
  // Fail closed: any URL that does not contain "devnet" is rejected.
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (rpcUrl) {
    const lower = rpcUrl.toLowerCase();
    if (!lower.includes("devnet")) {
      console.error(
        'Error: SOLANA_RPC_URL does not appear to be a devnet endpoint. ' +
        'It must contain "devnet" (e.g. api.devnet.solana.com or devnet.helius-rpc.com).'
      );
      process.exit(1);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnvLocal();

  // Fail closed before anything that reads wallets or sends transactions.
  assertDevnet();

  const args = parseArgs();

  // Validate recipient
  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(args.recipient);
  } catch {
    console.error("Error: --recipient is not a valid Solana public key.");
    process.exit(1);
  }

  // Validate amount
  let amountRaw: bigint;
  try {
    amountRaw = toRawUnits(args.amount);
  } catch (e) {
    console.error(`Error: --amount is invalid. ${(e as Error).message}`);
    process.exit(1);
  }
  if (amountRaw <= BigInt(0)) {
    console.error("Error: --amount must be greater than zero.");
    process.exit(1);
  }

  // Validate optional reference
  let referencePubkey: PublicKey | undefined;
  if (args.reference) {
    try {
      referencePubkey = new PublicKey(args.reference);
    } catch {
      console.error("Error: --reference is not a valid Solana public key.");
      process.exit(1);
    }
  }

  // Load payer keypair — never print path or key bytes on failure.
  let payer: Keypair;
  try {
    const keypairPath = process.env.PAYER_KEYPAIR_PATH;
    if (!keypairPath) throw new Error("not set");
    const resolvedPath = resolve(process.cwd(), keypairPath);
    if (!existsSync(resolvedPath)) throw new Error("file not found");
    const raw = JSON.parse(readFileSync(resolvedPath, "utf8")) as number[];
    if (!Array.isArray(raw) || raw.length !== 64) throw new Error("invalid format");
    payer = Keypair.fromSecretKey(Uint8Array.from(raw));
  } catch {
    console.error("Error: PAYER_KEYPAIR_PATH is missing or keypair could not be loaded.");
    process.exit(1);
  }

  // RPC connection — public devnet fallback if SOLANA_RPC_URL is unset.
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const effectiveRpcUrl = rpcUrl || "https://api.devnet.solana.com";
  if (!rpcUrl) {
    console.log("Info: SOLANA_RPC_URL not set. Using public devnet fallback (rate-limited).");
  }
  const connection = new Connection(effectiveRpcUrl, "confirmed");

  // USDC mint — hardcoded devnet value, no env override accepted.
  const usdcMint = new PublicKey(USDC_MINT_ADDRESSES.devnet);

  // Print transfer summary — no secrets, no paths.
  console.log("\n--- Clearline Devnet USDC Transfer ---");
  console.log(`Payer:      ${payer.publicKey.toBase58()}`);
  console.log(`Recipient:  ${recipientPubkey.toBase58()}`);
  console.log(`Amount:     ${args.amount} USDC (${amountRaw} raw)`);
  console.log(`Reference:  ${referencePubkey ? referencePubkey.toBase58() : "(none — raw unknown transfer)"}`);
  console.log(`Mint:       ${USDC_MINT_ADDRESSES.devnet}`);
  console.log(`RPC:        ${rpcUrl ? "(configured devnet)" : "public devnet fallback"}`);

  // Derive ATAs offline — no RPC needed.
  const payerAta = deriveUsdcAta(payer.publicKey, "devnet");
  const recipientAta = deriveUsdcAta(recipientPubkey, "devnet");

  // Check payer SOL balance (fees).
  const solBalance = await connection.getBalance(payer.publicKey);
  const MIN_SOL = 10_000_000; // 0.01 SOL in lamports
  if (solBalance < MIN_SOL) {
    console.error(
      `Error: Payer SOL balance too low (${solBalance} lamports). Need ≥ 0.01 SOL for fees.`
    );
    console.error(`  Fund: solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }

  // Check payer USDC balance.
  let payerUsdcRaw: bigint;
  try {
    const bal = await connection.getTokenAccountBalance(payerAta);
    payerUsdcRaw = BigInt(bal.value.amount);
  } catch {
    console.error(
      "Error: Payer USDC token account not found or inaccessible. Ensure the payer has devnet USDC."
    );
    console.error(`  Payer ATA: ${payerAta.toBase58()}`);
    process.exit(1);
  }
  if (payerUsdcRaw < amountRaw) {
    console.error(
      `Error: Insufficient USDC. Payer has ${toHumanAmount(payerUsdcRaw)} USDC, needs ${args.amount} USDC.`
    );
    process.exit(1);
  }
  console.log(`Payer USDC: ${toHumanAmount(payerUsdcRaw)} USDC`);

  // Build transaction.
  const transaction = new Transaction();

  // Create recipient ATA if it does not exist.
  // @solana/pay createTransfer throws if recipient ATA is missing —
  // handle explicitly so ATA creation and transfer are atomic.
  const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
  if (!recipientAtaInfo) {
    console.log("Info: Recipient USDC ATA does not exist. Adding creation instruction.");
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientAta,
        recipientPubkey,
        usdcMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Transfer instruction.
  const transferIx = createTransferCheckedInstruction(
    payerAta,
    usdcMint,
    recipientAta,
    payer.publicKey,
    amountRaw,
    USDC_DECIMALS,
    [],
    TOKEN_PROGRAM_ID
  );

  // Attach reference as a readonly non-signer key on the transfer instruction.
  // This is how Solana Pay embeds the reference so it appears in account keys.
  if (referencePubkey) {
    transferIx.keys.push({ pubkey: referencePubkey, isWritable: false, isSigner: false });
  }

  transaction.add(transferIx);

  // Send and confirm.
  console.log("\nSending transaction...");
  let signature: string;
  try {
    signature = await sendAndConfirmTransaction(connection, transaction, [payer], {
      commitment: "confirmed",
    });
  } catch (e) {
    console.error("Error: Transaction failed.", (e as Error).message);
    process.exit(1);
  }

  console.log(`\nSignature: ${signature}`);
  console.log(`Explorer:  https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log("\nDone.");
}

main().catch((e: unknown) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
