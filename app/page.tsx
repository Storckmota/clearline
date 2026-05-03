"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";
import { deriveUsdcAta } from "../lib/derive-ata";
import { USDC_MINTS } from "../lib/solana/constants";
import { generateReference, buildSolanaPayUrl } from "../lib/solana-pay";

export default function Home() {
  const { publicKey } = useWallet();

  const usdcAta = useMemo(() => {
    if (!publicKey) return null;
    try {
      return deriveUsdcAta(publicKey, "devnet");
    } catch (err) {
      console.error("Failed to derive ATA:", err);
      return null;
    }
  }, [publicKey]);

  // Generate a stable reference pubkey once per wallet connection.
  // Phase 4 (POST /api/receivables) will persist references to Supabase.
  const reference = useMemo(() => {
    if (!publicKey) return null;
    return generateReference();
  }, [publicKey]);

  const solanaPayUrl = useMemo(() => {
    if (!publicKey || !reference) return null;
    try {
      return buildSolanaPayUrl({
        recipient: publicKey,
        amount: "1",
        splToken: USDC_MINTS["devnet"],
        reference,
        label: "Clearline Demo",
        message: "USDC Payment",
      });
    } catch (err) {
      console.error("Failed to build Solana Pay URL:", err);
      return null;
    }
  }, [publicKey, reference]);

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <main className="flex flex-col items-center gap-6 w-full max-w-md bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-8 rounded-xl shadow-sm">
        <h1 className="text-xl font-semibold">Clearline Merchant</h1>

        <WalletMultiButton />

        {publicKey ? (
          <div className="w-full flex flex-col gap-4 mt-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 font-medium">Merchant Wallet (Connected)</span>
              <code className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
                {publicKey.toBase58()}
              </code>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-500 font-medium">Derived USDC ATA (Devnet)</span>
              {usdcAta ? (
                <code className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
                  {usdcAta.toBase58()}
                </code>
              ) : (
                <span className="text-red-500 text-xs">Failed to derive ATA</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-500 font-medium">Reference Pubkey</span>
              {reference ? (
                <code className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
                  {reference.toBase58()}
                </code>
              ) : (
                <span className="text-red-500 text-xs">Failed to generate reference</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-500 font-medium">Solana Pay URL (1 USDC · Devnet)</span>
              {solanaPayUrl ? (
                <code className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
                  {solanaPayUrl.toString()}
                </code>
              ) : (
                <span className="text-red-500 text-xs">Failed to generate Solana Pay URL</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm mt-4 text-center">
            Connect your wallet to start.
          </p>
        )}
      </main>
    </div>
  );
}
