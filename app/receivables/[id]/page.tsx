"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ---------------------------------------------------------------------------
// BigInt-safe USDC display — no float math, no server-only lib/usdc import.
// ---------------------------------------------------------------------------
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

function truncateKey(key: string | null | undefined): string {
  if (!key) return "Unknown";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  partial:   "bg-amber-100 text-amber-800",
  overpaid:  "bg-orange-100 text-orange-800",
  duplicate: "bg-slate-100 text-slate-600",
  unknown:   "bg-gray-100 text-gray-600",
  overdue:   "bg-red-100 text-red-700",
  pending:   "bg-gray-50 text-gray-500 border border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Types matching GET /api/receivables/[id] response
// ---------------------------------------------------------------------------
interface DetailTransaction {
  id: string;
  signature: string;
  amount_raw: number | string;
  status: string;
  classification_reason: string;
  sender_wallet: string | null;
  recipient_wallet: string;
  observed_at: string | null;
  created_at: string;
}

interface DetailReceivable {
  id: string;
  label: string;
  expected_amount_raw: number | string;
  due_date: string | null;
  reference_pubkey: string;
  solana_pay_url: string;
  status: string;
  display_status: string;
  created_at: string;
}

interface DetailData {
  receivable: DetailReceivable;
  transactions: DetailTransaction[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReceivableDetail() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState<"url" | "ref" | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setNotFound(false);

    fetch(`/api/receivables/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404 || r.status === 400) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DetailData>;
      })
      .then((json) => {
        if (cancelled || json === null) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError("Failed to load. Please try again.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id]);

  async function copyToClipboard(text: string, key: "url" | "ref") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard API unavailable — silent fail
    }
  }

  const rec = data?.receivable ?? null;
  const txs = data?.transactions ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 hover:underline"
            >
              Clearline
            </Link>
            <span className="text-gray-400 text-sm">Payment Detail</span>
          </div>
          {mounted ? (
            <WalletMultiButton />
          ) : (
            <button
              disabled
              className="text-sm px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-default"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        <Link href="/" className="text-xs text-gray-500 hover:underline self-start">
          Back to Inbox
        </Link>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Expected payment not found.
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="text-center py-16 text-red-500 text-sm">{fetchError}</div>
        )}

        {/* Detail content */}
        {!loading && !notFound && !fetchError && rec && (
          <div className="flex flex-col gap-6">

            {/* Summary card */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={rec.display_status} />
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {rec.label}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
                  {rawToHuman(rec.expected_amount_raw)} USDC expected
                </span>
                {rec.due_date && (
                  <span className="text-xs text-gray-500">Due {fmtDate(rec.due_date)}</span>
                )}
                <span className="text-xs text-gray-400">Created {fmtDate(rec.created_at)}</span>
              </div>
            </div>

            {/* Payment link + matching reference */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-5">

              {/* Payment link — payer-facing, shown first */}
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
                    {rec.solana_pay_url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(rec.solana_pay_url, "url")}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                  >
                    {copied === "url" ? "Copied" : "Copy payment link"}
                  </button>
                </div>
              </div>

              {/* Matching reference — Clearline-internal */}
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
                    {rec.reference_pubkey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(rec.reference_pubkey, "ref")}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                  >
                    {copied === "ref" ? "Copied" : "Copy reference"}
                  </button>
                </div>
              </div>
            </div>

            {/* Linked transfers */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Linked transfers
                </h2>
                {txs.length > 0 && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                    {txs.length}
                  </span>
                )}
              </div>

              {txs.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  No transfers linked yet. When a payment arrives with the matching reference, it will appear here.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={tx.status} />
                          <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
                            {rawToHuman(tx.amount_raw)} USDC
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {fmtDate(tx.observed_at ?? tx.created_at)}
                        </span>
                      </div>
                      {tx.classification_reason && tx.classification_reason !== "Unclassified" && (
                        <span className="text-xs text-gray-500 italic">
                          {tx.classification_reason}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        <span className="text-xs text-gray-400">
                          From: {truncateKey(tx.sender_wallet)}
                        </span>
                        <span className="text-xs text-gray-400">
                          To: {truncateKey(tx.recipient_wallet)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
