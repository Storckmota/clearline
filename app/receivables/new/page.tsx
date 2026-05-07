"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { WalletButton } from "../../components/WalletButton";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useEffect, useState } from "react";

function rawToHuman(raw: number | string): string {
  const r = BigInt(String(raw));
  const divisor = BigInt(1_000_000);
  const whole = r / divisor;
  const frac = r % divisor;
  if (frac === BigInt(0)) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CreatedReceivable {
  id: string;
  label: string;
  expected_amount_raw: number | string;
  due_date: string | null;
  reference_pubkey: string;
  solana_pay_url: string;
  status: string;
  created_at: string;
}

export default function NewReceivable() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedReceivable | null>(null);
  const [copied, setCopied] = useState<"ref" | "url" | null>(null);
  const [sessionCreated, setSessionCreated] = useState<CreatedReceivable[]>([]);

  useEffect(() => { setMounted(true); }, []);

  function reset() {
    setLabel("");
    setAmount("");
    setDueDate("");
    setFormError(null);
    setCreated(null);
    setCopied(null);
    // sessionCreated preserved — shows cumulative count across resets
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedLabel = label.trim();
    const trimmedAmount = amount.trim();

    if (!trimmedLabel) {
      setFormError("Label is required.");
      return;
    }
    if (!trimmedAmount) {
      setFormError("Amount is required.");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    const body: Record<string, string> = {
      merchant_wallet: publicKey!.toBase58(),
      label: trimmedLabel,
      amount: trimmedAmount,
    };
    if (dueDate) body.due_date = dueDate;

    try {
      const res = await fetch("/api/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { receivable?: CreatedReceivable; error?: string };
      if (!res.ok) {
        setFormError(json.error ?? `Error ${res.status}`);
        return;
      }
      const rec = json.receivable!;
      setCreated(rec);
      setSessionCreated((prev) => [...prev, rec]);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text: string, key: "ref" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard API unavailable — silent fail
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#06090f] font-sans">
      {/* Header */}
      <header className="border-b border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#06090f]/90 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:underline"
            >
              Clearline
            </Link>
            <span className="text-gray-400 text-sm">New Expected Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 active:scale-95 cursor-pointer bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/90 dark:text-slate-950 dark:hover:bg-white self-start mb-2"
        >
          ← Back to Inbox
        </Link>

        {/* Not connected */}
        {mounted && !publicKey && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Connect your wallet to create an expected payment.
          </div>
        )}

        {/* Session list — persists across create-another resets */}
        {mounted && publicKey && sessionCreated.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Created this session ({sessionCreated.length})
            </span>
            <div className="flex flex-col gap-1">
              {sessionCreated.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-4 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-md"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {rec.label}
                  </span>
                  <span className="text-xs font-mono text-gray-500 shrink-0">
                    {rawToHuman(rec.expected_amount_raw)} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success card */}
        {mounted && publicKey && created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              Expected payment created and added to your inbox.
            </p>

            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Created
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {created.label}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
                  {rawToHuman(created.expected_amount_raw)} USDC
                </span>
                {created.due_date && (
                  <span className="text-xs text-gray-500">Due {fmtDate(created.due_date)}</span>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <QRCode value={created.solana_pay_url} size={180} />
                  </div>
                  <span className="text-xs text-gray-400">
                    Scan with a Solana Pay wallet (Phantom · Solflare)
                  </span>
                </div>

                {/* Payment link */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      Payment link
                    </span>
                    <span className="text-xs text-gray-400">
                      Send this link to your payer. When they pay, Clearline uses the matching reference to classify the incoming USDC transfer.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                      {created.solana_pay_url}
                    </code>
                    <button
                      onClick={() => copyToClipboard(created.solana_pay_url, "url")}
                      className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                    >
                      {copied === "url" ? "Copied" : "Copy payment link"}
                    </button>
                  </div>
                </div>

                {/* Matching reference */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      Matching reference
                    </span>
                    <span className="text-xs text-gray-400">
                      Used by Clearline to match this expected payment on Solana. You usually do not need to send this alone.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                      {created.reference_pubkey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(created.reference_pubkey, "ref")}
                      className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                    >
                      {copied === "ref" ? "Copied" : "Copy reference"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={reset}
                className="text-sm px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300"
              >
                Create another expected payment
              </button>
              <Link
                href="/"
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Back to Payment Inbox
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        {mounted && publicKey && !created && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="label"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-widest"
                >
                  Label
                </label>
                <input
                  id="label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="What is this payment for?"
                  disabled={submitting}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="amount"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-widest"
                >
                  Amount (USDC)
                </label>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Expected USDC amount"
                  disabled={submitting}
                  className="text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="due_date"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-widest"
                >
                  Due Date{" "}
                  <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                />
                <span className="text-xs text-gray-400">Optional due date for tracking overdue payments.</span>
              </div>

              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="self-start text-sm px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Expected Payment"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
