import "server-only";

import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import type { SolanaNetwork } from "./constants";

const VALID_NETWORKS: readonly SolanaNetwork[] = ["devnet", "mainnet-beta"];

/**
 * Returns the active Solana network from server-side config.
 * Throws loudly if SOLANA_NETWORK is missing or not a recognized value.
 */
export function getNetwork(): SolanaNetwork {
  const raw = config.SOLANA_NETWORK;
  if (!VALID_NETWORKS.includes(raw as SolanaNetwork)) {
    throw new Error('Invalid SOLANA_NETWORK. Must be "devnet" or "mainnet-beta".');
  }
  return raw as SolanaNetwork;
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
