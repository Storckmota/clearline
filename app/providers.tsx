"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  // Use a public devnet endpoint for the client-side ConnectionProvider to avoid
  // exposing private RPC URLs to the client.
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // Empty wallets array relies on Wallet Standard — supports Phantom, Solflare, Backpack
  // without individual adapter packages. autoConnect=false prevents stale localStorage
  // sessions from restoring the wrong wallet on page load.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
