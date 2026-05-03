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

  // We use an empty array for wallets to rely on the Wallet Standard.
  // This automatically supports modern wallets like Phantom, Solflare, and Backpack
  // without needing individual adapter dependencies.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
