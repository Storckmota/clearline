import "server-only";

import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import type { SolanaNetwork } from "./constants";

/**
 * Returns the active Solana network from server-side config.
 */
export function getNetwork(): SolanaNetwork {
  return config.SOLANA_NETWORK as SolanaNetwork;
}

/**
 * Returns the USDC mint PublicKey for the active network, using env-configured values.
 *
 * Server-side only. Uses USDC_MINT_DEVNET / USDC_MINT_MAINNET from lib/config.ts
 * so the mint can be overridden per deployment without code changes.
 */
export function getUsdcMint(): PublicKey {
  const network = getNetwork();
  const mintStr =
    network === "mainnet-beta" ? config.USDC_MINT_MAINNET : config.USDC_MINT_DEVNET;
  return new PublicKey(mintStr);
}
