import { PublicKey } from "@solana/web3.js";

/**
 * Solana network type used throughout the application.
 */
export type SolanaNetwork = "devnet" | "mainnet-beta";

/**
 * Public USDC mint addresses per network.
 *
 * These are well-known, publicly documented values.
 * They are safe to use in client-side code.
 *
 * Source: ARCHITECTURE.md §17 / .env.local.example
 *   devnet:       4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 *   mainnet-beta: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
export const USDC_MINT_ADDRESSES: Record<SolanaNetwork, string> = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

/**
 * Public USDC mint PublicKey instances per network.
 * Pre-constructed for convenience in client-side ATA derivation and display.
 */
export const USDC_MINTS: Record<SolanaNetwork, PublicKey> = {
  devnet: new PublicKey(USDC_MINT_ADDRESSES.devnet),
  "mainnet-beta": new PublicKey(USDC_MINT_ADDRESSES["mainnet-beta"]),
};
