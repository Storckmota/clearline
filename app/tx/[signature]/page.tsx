"use client";

import Link from "next/link";
import { WalletButton } from "../../components/WalletButton";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ---------------------------------------------------------------------------
// BigInt-safe USDC display — same pattern as all other pages.
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
// Status badge — same map and component as other pages.
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
// Types matching GET /api/transactions/[signature] response
// ---------------------------------------------------------------------------
interface ProofTransaction {
  id: string;
  signature: string;
  amount_raw: number | string;
  status: string;
  classification_reason: string;
  sender_wallet: string | null;
  recipient_wallet: string;
  observed_at: string | null;
  created_at: string;
  receivable_id: string | null;
}

interface ProofReceivable {
  id: string;
  label: string;
  expected_amount_raw: number | string;
  due_date: string | null;
  status: string;
}

interface ProofData {
  transaction: ProofTransaction;
  receivable: ProofReceivable | null;
  explorer_url: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TransactionProof() {
  const params = useParams();
  const signature = Array.isArray(params.signature)
    ? params.signature[0]
    : (params.signature ?? "");

  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!signature) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setNotFound(false);

    fetch(`/api/transactions/${encodeURIComponent(signature)}`)
      .then((r) => {
        if (r.status === 404 || r.status === 400) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ProofData>;
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
  }, [signature]);

  async function copySignature() {
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silent fail
    }
  }

  const tx = data?.transaction ?? null;
  const rec = data?.receivable ?? null;
  const explorerUrl = data?.explorer_url ?? null;

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
            <span className="text-gray-400 text-sm">Transaction Proof</span>
          </div>
          <WalletButton />
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
            Transaction not found.
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="text-center py-16 text-red-500 text-sm">{fetchError}</div>
        )}

        {/* Proof content */}
        {!loading && !notFound && !fetchError && tx && (
          <div className="flex flex-col gap-6">

            {/* Summary */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-3">
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

            {/* Classification */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Classification
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                {tx.classification_reason || "Not classified."}
              </p>
            </div>

            {/* Transaction details */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Transaction Details
              </span>

              {/* Signature */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Signature</span>
                <div className="flex items-start gap-2">
                  <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                    {tx.signature}
                  </code>
                  <button
                    onClick={copySignature}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Sender */}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Sender</span>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {truncateKey(tx.sender_wallet)}
                </span>
              </div>

              {/* Recipient */}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Recipient</span>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {truncateKey(tx.recipient_wallet)}
                </span>
              </div>
            </div>

            {/* Linked expected payment */}
            <div className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Linked Expected Payment
              </span>
              {rec ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={rec.status} />
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {rec.label}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {rawToHuman(rec.expected_amount_raw)} USDC expected
                  </span>
                  <Link
                    href={`/receivables/${rec.id}`}
                    className="text-xs text-gray-500 hover:underline self-start"
                  >
                    View expected payment →
                  </Link>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Not linked.</span>
              )}
            </div>

            {/* Solana Explorer link */}
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-xs px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                View on Solana Explorer →
              </a>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
