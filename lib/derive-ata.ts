import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { USDC_MINTS, type SolanaNetwork } from "./solana/constants";

/**
 * Derives the USDC Associated Token Account (ATA) for a given wallet public key.
 * This is synchronous and does not require an RPC connection.
 * @param walletPubKey The wallet's public key
 * @param network The Solana network ("devnet" or "mainnet-beta")
 * @returns The PublicKey of the USDC ATA
 */
export function deriveUsdcAta(walletPubKey: PublicKey, network: SolanaNetwork = "devnet"): PublicKey {
  const mint = USDC_MINTS[network];
  // getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
  return getAssociatedTokenAddressSync(mint, walletPubKey, false);
}
