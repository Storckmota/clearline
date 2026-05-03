import { Keypair, PublicKey } from "@solana/web3.js";
import { encodeURL } from "@solana/pay";
import BigNumber from "bignumber.js";

/**
 * Generates a fresh Solana reference public key for payment matching.
 * Only the public key is returned. The private key is never stored or exposed.
 */
export function generateReference(): PublicKey {
  return Keypair.generate().publicKey;
}

export interface SolanaPayUrlParams {
  /** Merchant owner wallet — the payment recipient. NOT the ATA. */
  recipient: PublicKey;
  /**
   * Human-readable USDC amount as a decimal string.
   * e.g. "1" for 1 USDC, "100" for 100 USDC.
   */
  amount: string;
  /** USDC mint public key for the active network. */
  splToken: PublicKey;
  /** Reference public key used for payment matching. */
  reference: PublicKey;
  /** Human-readable label for the payment. */
  label: string;
  /** Optional short message shown in wallets. */
  message?: string;
}

/**
 * Builds a Solana Pay transfer request URL.
 *
 * The recipient is the merchant's OWNER wallet, not the USDC ATA.
 * Solana Pay wallets derive the ATA internally from recipient + splToken.
 *
 * Client-safe: no server-only imports, no lib/config.ts, no lib/supabase.ts.
 */
export function buildSolanaPayUrl(params: SolanaPayUrlParams): URL {
  const { recipient, amount, splToken, reference, label, message } = params;
  return encodeURL({
    recipient,
    amount: new BigNumber(amount),
    splToken,
    reference,
    label,
    message,
  });
}
