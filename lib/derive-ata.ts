import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export const USDC_MINTS = {
  devnet: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  "mainnet-beta": new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};

/**
 * Derives the USDC Associated Token Account (ATA) for a given wallet public key.
 * This is synchronous and does not require an RPC connection.
 * @param walletPubKey The wallet's public key
 * @param network The Solana network ("devnet" or "mainnet-beta")
 * @returns The PublicKey of the USDC ATA
 */
export function deriveUsdcAta(walletPubKey: PublicKey, network: "devnet" | "mainnet-beta" = "devnet"): PublicKey {
  const mint = USDC_MINTS[network];
  // getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
  return getAssociatedTokenAddressSync(mint, walletPubKey, false);
}
