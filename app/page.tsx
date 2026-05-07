"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { WalletButton } from "./components/WalletButton";
import { ThemeToggle } from "./components/ThemeToggle";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// BigInt-safe USDC display — no float math.
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
  paid:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  partial:   "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  overpaid:  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  duplicate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  unknown:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  overdue:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  pending:   "bg-white text-gray-500 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Types matching GET /api/receivables response
// ---------------------------------------------------------------------------
interface ApiTransaction {
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

interface ApiReceivable {
  id: string;
  label: string;
  expected_amount_raw: number | string;
  due_date: string | null;
  status: string;
  display_status: string;
  created_at: string;
  transactions: ApiTransaction[];
}

interface InboxData {
  receivables: ApiReceivable[];
  orphan_transactions: ApiTransaction[];
}

// ---------------------------------------------------------------------------
// Hero preview — static decorative card cluster, clearly labeled
// ---------------------------------------------------------------------------
const PREVIEW_ITEMS = [
  { status: "Paid",     label: "Design retainer",    amount: "2,500", borderColor: "#34d399", badge: "bg-emerald-100 text-emerald-800" },
  { status: "Partial",  label: "Q2 settlement",      amount: "800",   borderColor: "#fbbf24", badge: "bg-amber-100 text-amber-800" },
  { status: "Overpaid", label: "License renewal",    amount: "1,150", borderColor: "#fb923c", badge: "bg-orange-100 text-orange-800" },
  { status: "Unknown",  label: "No reference",       amount: "50",    borderColor: "#d1d5db", badge: "bg-gray-100 text-gray-600" },
  { status: "Pending",  label: "Contract milestone", amount: "3,000", borderColor: "#bfdbfe", badge: "bg-white text-gray-500 border border-gray-200" },
];

function HeroPreview() {
  return (
    <div className="relative w-full lg:w-80 shrink-0">
      {/* Ambient glow behind the card */}
      <div className="absolute -inset-8 rounded-3xl bg-indigo-400/8 dark:bg-indigo-400/5 blur-3xl pointer-events-none" />

      <div className="relative rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-white dark:bg-gray-900 shadow-2xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-tight">
            Payment Inbox
          </span>
          <span className="text-xs text-gray-300 dark:text-gray-600 font-medium">Example</span>
        </div>

        {/* Payment rows */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {PREVIEW_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 pl-3 pr-4 py-2.5 border-l-2"
              style={{ borderLeftColor: item.borderColor }}
            >
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${item.badge}`}>
                {item.status}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                {item.label}
              </span>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
                {item.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 text-center">
          <span className="text-xs text-gray-300 dark:text-gray-600">Static preview</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards — compact column layout
// ---------------------------------------------------------------------------
function ReceivableCard({ rec }: { rec: ApiReceivable }) {
  return (
    <Link href={`/receivables/${rec.id}`} className="block group">
      <div className="flex flex-col gap-1 px-3 py-3 min-h-[128px] bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/50 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={rec.display_status} />
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {rec.label}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {rawToHuman(rec.expected_amount_raw)} USDC
        </span>
        {rec.due_date && (
          <span className="text-xs text-gray-400">Due {fmtDate(rec.due_date)}</span>
        )}
      </div>
    </Link>
  );
}

function TransactionCard({
  tx,
  onResolve,
}: {
  tx: ApiTransaction;
  onResolve?: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 px-3 py-3 min-h-[128px] bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/50 rounded-xl shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={tx.status} />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {rawToHuman(tx.amount_raw)} USDC
          </span>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {tx.classification_reason && tx.classification_reason !== "Unclassified"
            ? tx.classification_reason
            : "Incoming transfer"}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          From: {truncateKey(tx.sender_wallet)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {tx.status === "unknown" && onResolve && (
          <button
            onClick={onResolve}
            className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-95 transition-all duration-150"
          >
            Resolve
          </button>
        )}
        <Link
          href={`/tx/${tx.signature}`}
          className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
        >
          View proof →
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResolvePanel — inline manual resolve for unknown transactions.
// devSecret lives only in React state; never persisted, logged, or in body/URL.
// ---------------------------------------------------------------------------
function ResolvePanel({
  tx,
  receivables,
  onSuccess,
  onCancel,
}: {
  tx: ApiTransaction;
  receivables: ApiReceivable[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [devSecret, setDevSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleCancel() {
    setSelectedId(null);
    setDevSecret("");
    setError(null);
    setSuccess(false);
    onCancel();
  }

  async function handleSubmit() {
    if (!selectedId || !devSecret || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-secret": devSecret,
        },
        body: JSON.stringify({
          transaction_id: tx.id,
          receivable_id: selectedId,
        }),
      });
      if (res.ok) {
        setDevSecret("");
        setSelectedId(null);
        setError(null);
        setSuccess(true);
        setTimeout(onSuccess, 800);
        return;
      }
      let msg = "Unexpected error. Please try again.";
      if (res.status === 401) {
        msg = "Unauthorized: incorrect admin key.";
      } else if (res.status === 400 || res.status === 404) {
        try {
          const data = await res.json() as { error?: string };
          if (typeof data.error === "string" && data.error) msg = data.error;
        } catch { /* keep default */ }
      } else {
        msg = "Server error. Please try again.";
      }
      setError(msg);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">
          Resolve unknown payment
        </span>
        <span><span className="text-gray-500">Amount:</span> {rawToHuman(tx.amount_raw)} USDC</span>
        <span><span className="text-gray-500">Date:</span> {fmtDate(tx.observed_at ?? tx.created_at)}</span>
        {tx.sender_wallet && (
          <span><span className="text-gray-500">Sender:</span> {truncateKey(tx.sender_wallet)}</span>
        )}
        <span><span className="text-gray-500">Recipient:</span> {truncateKey(tx.recipient_wallet)}</span>
        <span><span className="text-gray-500">Status:</span> Unknown</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Assign to expected payment
        </span>
        {receivables.length === 0 ? (
          <span className="text-xs text-gray-400">No expected payments found.</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {receivables.map((rec) => (
              <label
                key={rec.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="radio"
                  name={`resolve-${tx.id}`}
                  value={rec.id}
                  checked={selectedId === rec.id}
                  onChange={() => setSelectedId(rec.id)}
                  className="shrink-0"
                />
                <StatusBadge status={rec.display_status} />
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                  {rec.label}
                </span>
                <span className="text-xs font-mono text-gray-500 shrink-0">
                  {rawToHuman(rec.expected_amount_raw)} USDC
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Admin demo key
        </label>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={devSecret}
          onChange={(e) => setDevSecret(e.target.value)}
          className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">
          Required for this demo admin action. Not stored by Clearline.
        </span>
      </div>

      {success ? (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">Payment assigned.</span>
      ) : (
        <>
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!selectedId || !devSecret || submitting}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Resolving…" : "Assign payment"}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status guide — collapsible, includes monitored wallet note
// ---------------------------------------------------------------------------
const STATUS_GUIDE = [
  { status: "paid",      desc: "Exact amount, reference matched" },
  { status: "partial",   desc: "Less than expected received" },
  { status: "overpaid",  desc: "More than expected received" },
  { status: "duplicate", desc: "Same reference, already paid" },
  { status: "unknown",   desc: "No matching expected payment" },
  { status: "overdue",   desc: "Display-only: past due date" },
];

function StatusGuide() {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-5 py-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/50 rounded-xl shadow-md flex flex-col gap-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Status guide
        </span>
        <span className="text-xs text-gray-400 select-none">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Monitoring devnet merchant wallet: 4imzXJ…GGBG
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {STATUS_GUIDE.map(({ status, desc }) => (
              <div key={status} className="flex items-center gap-3">
                <StatusBadge status={status} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lane — board column, always rendered, shows placeholder when empty
// ---------------------------------------------------------------------------
function Lane({
  title,
  count,
  children,
  alert,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3
          className={`text-xs font-semibold uppercase tracking-widest ${
            alert
              ? "text-slate-700 dark:text-gray-300"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {title}
        </h3>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="px-3 py-5 bg-white/60 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700/50 rounded-xl text-xs text-gray-300 dark:text-gray-600 text-center">
          None
        </div>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Home() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openResolveTxId, setOpenResolveTxId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) {
      setData(null);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    fetch(`/api/receivables?merchant_wallet=${publicKey.toBase58()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<InboxData>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError("Failed to load. Please try again.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [publicKey, refreshKey]);

  // Derive inbox groups
  const receivables = data?.receivables ?? [];
  const orphanTxs = data?.orphan_transactions ?? [];

  const unknownTxs   = orphanTxs.filter((tx) => tx.status === "unknown");
  const partialRecs  = receivables.filter((r) => r.display_status === "partial");
  const overpaidRecs = receivables.filter((r) => r.display_status === "overpaid");
  const paidRecs     = receivables.filter((r) => r.display_status === "paid");
  const overdueRecs  = receivables.filter((r) => r.display_status === "overdue");
  const pendingRecs  = receivables.filter((r) => r.display_status === "pending");

  const duplicateTxs = receivables.flatMap((r) =>
    r.transactions.filter((tx) => tx.status === "duplicate")
  );

  const attentionCount =
    unknownTxs.length + partialRecs.length + overpaidRecs.length + duplicateTxs.length;

  const isEmpty =
    data !== null &&
    receivables.length === 0 &&
    orphanTxs.length === 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#06090f] font-sans">
      {/* Header */}
      <header className="border-b border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#06090f]/90 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Clearline
            </h1>
            <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              USDC Payment Inbox
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {mounted && publicKey && (
              <Link
                href="/receivables/new"
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors whitespace-nowrap"
              >
                New expected payment
              </Link>
            )}
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">

        {/* Disconnected hero */}
        {!publicKey && (
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[800px] h-64 bg-indigo-400/5 dark:bg-indigo-400/4 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row gap-12 lg:gap-16 items-start lg:items-center py-10 sm:py-16">

              {/* Left: copy */}
              <div className="flex flex-col gap-7 flex-1 max-w-lg">

                {/* Status pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-medium text-emerald-700 dark:text-emerald-400 w-fit select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Solana devnet
                </div>

                {/* Headline */}
                <div className="flex flex-col gap-3">
                  <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.08]">
                    Classify Solana<br className="hidden sm:block" /> USDC payments
                  </h2>
                  <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                    Clearline matches incoming USDC transfers to expected payments and flags partials, overpayments, duplicates, and unknowns.
                  </p>
                </div>

                {/* Value props */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="shrink-0 mt-1.5 w-0.5 self-stretch rounded-full bg-emerald-400 dark:bg-emerald-500" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Solana Pay references</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Unique reference keys match each transfer to an expected payment. No custom contracts needed.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <div className="shrink-0 mt-1.5 w-0.5 self-stretch rounded-full bg-amber-400 dark:bg-amber-500" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Needs Attention inbox</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Partials, overpayments, duplicates, and unknowns surface automatically. No block explorer, no spreadsheet.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <div className="shrink-0 mt-1.5 w-0.5 self-stretch rounded-full bg-blue-400 dark:bg-blue-500" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">On-chain proof</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Every classification links to a real transaction signature, verifiable on Solana Explorer.</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Click{" "}
                  <strong className="font-semibold text-gray-600 dark:text-gray-400">Connect</strong>{" "}
                  to open your Payment Inbox.
                </p>
              </div>

              {/* Right: preview */}
              <HeroPreview />
            </div>
          </div>
        )}

        {/* Loading */}
        {publicKey && loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="h-5 w-5 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-label="Loading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-gray-400">Loading payment inbox</span>
          </div>
        )}

        {/* Error */}
        {publicKey && !loading && fetchError && (
          <div className="text-center py-20 text-red-500 text-sm">{fetchError}</div>
        )}

        {/* Empty */}
        {publicKey && !loading && !fetchError && isEmpty && (
          <div className="text-center py-20 flex flex-col gap-2">
            <p className="text-gray-500 text-sm">No expected payments found for this wallet.</p>
            <p className="text-gray-400 text-xs">
              <Link href="/receivables/new" className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Create an expected payment
              </Link>{" "}to get started.
            </p>
          </div>
        )}

        {/* Inbox board */}
        {publicKey && !loading && !fetchError && data && !isEmpty && (
          <div className="flex flex-col gap-8">

            <StatusGuide />

            {/* Needs Attention */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
                Needs Attention{attentionCount > 0 ? ` (${attentionCount})` : ""}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Lane title="Unknown" count={unknownTxs.length} alert>
                  {unknownTxs.map((tx) => (
                    <div key={tx.id} className="flex flex-col gap-1">
                      <TransactionCard
                        tx={tx}
                        onResolve={() =>
                          setOpenResolveTxId(
                            openResolveTxId === tx.id ? null : tx.id
                          )
                        }
                      />
                      {openResolveTxId === tx.id && (
                        <ResolvePanel
                          tx={tx}
                          receivables={receivables}
                          onSuccess={() => {
                            setOpenResolveTxId(null);
                            setRefreshKey((k) => k + 1);
                          }}
                          onCancel={() => setOpenResolveTxId(null)}
                        />
                      )}
                    </div>
                  ))}
                </Lane>

                <Lane title="Partial" count={partialRecs.length} alert>
                  {partialRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Lane>

                <Lane title="Overpaid" count={overpaidRecs.length} alert>
                  {overpaidRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Lane>

                <Lane title="Duplicate" count={duplicateTxs.length} alert>
                  {duplicateTxs.map((tx) => (
                    <TransactionCard key={tx.id} tx={tx} />
                  ))}
                </Lane>
              </div>
            </div>

            {/* Payment Pipeline */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Payment Pipeline
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Lane title="Pending" count={pendingRecs.length}>
                  {pendingRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Lane>

                <Lane title="Paid" count={paidRecs.length}>
                  {paidRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Lane>

                <Lane title="Overdue" count={overdueRecs.length}>
                  {overdueRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Lane>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
