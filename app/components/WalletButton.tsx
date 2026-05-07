"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

// ---------------------------------------------------------------------------
// Custom wallet connect button.
//
// Why not WalletMultiButton?
// With WalletProvider autoConnect={false}, the library's WalletMultiButton
// only calls select() when the user picks a wallet from the modal — it does
// NOT call connect() automatically after selection. The result is a required
// second click. This component fixes that by tracking explicit user intent
// (connectRequested) and calling connect() the moment a wallet is selected.
//
// autoConnect behaviour is preserved: connectRequested starts false so the
// connect() call never fires on page load from stale adapter state.
// ---------------------------------------------------------------------------

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { publicKey, wallet, connect, disconnect, connecting, connected } =
    useWallet();
  const { setVisible } = useWalletModal();
  const [connectRequested, setConnectRequested] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // After user selects a wallet from the modal, call connect() automatically.
  // connectRequested gate ensures this never fires on page load.
  useEffect(() => {
    if (!mounted || !connectRequested || !wallet || connected || connecting) return;
    connect().catch(() => {
      setConnectRequested(false);
    });
  }, [mounted, connectRequested, wallet, connected, connecting, connect]);

  // Clear intent once connection succeeds.
  useEffect(() => {
    if (connected) setConnectRequested(false);
  }, [connected]);

  // Close menu on click outside the dropdown container.
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Close menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  // Pre-mount: non-interactive placeholder — cannot swallow clicks, no hydration mismatch.
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-28 rounded-lg bg-gray-100 dark:bg-gray-800 pointer-events-none"
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Disconnected / connecting state
  // ---------------------------------------------------------------------------

  function handleConnectClick() {
    if (wallet && !connecting) {
      setConnectRequested(true);
      connect().catch(() => setConnectRequested(false));
      return;
    }
    setConnectRequested(true);
    setVisible(true);
  }

  if (connecting) {
    return (
      <button
        disabled
        className="text-sm px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default font-medium select-none"
      >
        Connecting…
      </button>
    );
  }

  if (!connected || !publicKey) {
    return (
      <button
        onClick={handleConnectClick}
        className="text-sm px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer select-none"
      >
        Connect
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Connected state — address button + dropdown menu
  // ---------------------------------------------------------------------------

  const a = publicKey.toBase58();

  function handleCopy() {
    navigator.clipboard.writeText(a).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setMenuOpen(false);
  }

  function handleChangeWallet() {
    setMenuOpen(false);
    void disconnect()
      .catch(() => {})
      .then(() => {
        setConnectRequested(true);
        setVisible(true);
      });
  }

  function handleDisconnect() {
    setMenuOpen(false);
    setCopied(false);
    setConnectRequested(false);
    disconnect().catch(() => {});
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="text-sm px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        {copied ? "Copied!" : `${a.slice(0, 4)}…${a.slice(-4)}`}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={handleCopy}
            className="w-full text-left text-sm px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Copy address
          </button>
          <button
            onClick={handleChangeWallet}
            className="w-full text-left text-sm px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Change wallet
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full text-left text-sm px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
