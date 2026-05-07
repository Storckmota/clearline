"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { WalletButton } from "./components/WalletButton";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// BigInt-safe USDC display — no float math.
// Supabase returns bigint columns as number or string in JSON; String(raw)
// normalises both before BigInt conversion.
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
// Cards
// ---------------------------------------------------------------------------
function ReceivableCard({ rec }: { rec: ApiReceivable }) {
  return (
    <Link
      href={`/receivables/${rec.id}`}
      className="block hover:opacity-80 transition-opacity"
    >
      <div className="flex items-start justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={rec.display_status} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {rec.label}
            </span>
          </div>
          {rec.due_date && (
            <span className="text-xs text-gray-500">Due {fmtDate(rec.due_date)}</span>
          )}
          <span className="text-xs text-gray-400">Created {fmtDate(rec.created_at)}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
            {rawToHuman(rec.expected_amount_raw)} USDC
          </span>
        </div>
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
    <div className="flex items-start justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={tx.status} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Incoming transfer
          </span>
        </div>
        <span className="text-xs text-gray-500">
          From: {truncateKey(tx.sender_wallet)}
        </span>
        {tx.classification_reason && tx.classification_reason !== "Unclassified" && (
          <span className="text-xs text-gray-400 italic">{tx.classification_reason}</span>
        )}
        <span className="text-xs text-gray-400">
          {fmtDate(tx.observed_at ?? tx.created_at)}
        </span>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-2">
        <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
          {rawToHuman(tx.amount_raw)} USDC
        </span>
        {tx.status === "unknown" && onResolve && (
          <button
            onClick={onResolve}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Resolve
          </button>
        )}
        <Link
          href={`/tx/${tx.signature}`}
          className="text-xs text-gray-400 hover:underline"
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
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-3">
      {/* Unknown payment summary */}
      <div className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">
          Resolve unknown payment
        </span>
        <span>
          <span className="text-gray-500">Amount:</span>{" "}
          {rawToHuman(tx.amount_raw)} USDC
        </span>
        <span>
          <span className="text-gray-500">Date:</span>{" "}
          {fmtDate(tx.observed_at ?? tx.created_at)}
        </span>
        {tx.sender_wallet && (
          <span>
            <span className="text-gray-500">Sender:</span>{" "}
            {truncateKey(tx.sender_wallet)}
          </span>
        )}
        <span>
          <span className="text-gray-500">Recipient:</span>{" "}
          {truncateKey(tx.recipient_wallet)}
        </span>
        <span>
          <span className="text-gray-500">Status:</span> Unknown
        </span>
      </div>

      {/* Select expected payment */}
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
                className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
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

      {/* Admin demo key input */}
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
          className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">
          Required for this demo admin action. Not stored by Clearline.
        </span>
      </div>

      {/* Success — replaces error + action buttons */}
      {success ? (
        <span className="text-xs text-green-600 dark:text-green-400">Payment assigned.</span>
      ) : (
        <>
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!selectedId || !devSecret || submitting}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Resolving…" : "Assign payment"}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
// Section wrapper — not rendered when list is empty
// ---------------------------------------------------------------------------
function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {title}
        </h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
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

    return () => {
      cancelled = true;
    };
  }, [publicKey, refreshKey]);

  // --- Derive inbox groups ---------------------------------------------------
  const receivables = data?.receivables ?? [];
  const orphanTxs = data?.orphan_transactions ?? [];

  const unknownTxs  = orphanTxs.filter((tx) => tx.status === "unknown");
  const partialRecs  = receivables.filter((r) => r.display_status === "partial");
  const overpaidRecs = receivables.filter((r) => r.display_status === "overpaid");
  const paidRecs     = receivables.filter((r) => r.display_status === "paid");
  const overdueRecs  = receivables.filter((r) => r.display_status === "overdue");
  const pendingRecs  = receivables.filter((r) => r.display_status === "pending");

  // Duplicate transactions are linked to receivables (have receivable_id set)
  // and appear in the nested transactions array.
  const duplicateTxs = receivables.flatMap((r) =>
    r.transactions.filter((tx) => tx.status === "duplicate")
  );

  const attentionCount =
    unknownTxs.length + partialRecs.length + overpaidRecs.length + duplicateTxs.length;

  const isEmpty =
    data !== null &&
    receivables.length === 0 &&
    orphanTxs.length === 0;

  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Clearline
              </h1>
              <span className="text-gray-400 text-sm">Payment Inbox</span>
              {attentionCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {attentionCount} need attention
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Monitoring devnet merchant wallet: 4imzXJ…GGBG
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mounted && publicKey && (
              <Link
                href="/receivables/new"
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 whitespace-nowrap"
              >
                New expected payment
              </Link>
            )}
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Not connected */}
        {!publicKey && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Connect your wallet to view your Payment Inbox.
          </div>
        )}

        {/* Loading */}
        {publicKey && loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        )}

        {/* Error */}
        {publicKey && !loading && fetchError && (
          <div className="text-center py-16 text-red-500 text-sm">{fetchError}</div>
        )}

        {/* Empty */}
        {publicKey && !loading && !fetchError && isEmpty && (
          <div className="text-center py-16 flex flex-col gap-2">
            <p className="text-gray-500 text-sm">No expected payments found for this wallet.</p>
            <p className="text-gray-400 text-xs">
              <Link href="/receivables/new" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                Create an expected payment
              </Link>{" "}to get started.
            </p>
          </div>
        )}

        {/* Inbox — data loaded */}
        {publicKey && !loading && !fetchError && data && !isEmpty && (
          <div className="flex flex-col gap-8">

            {/* NEEDS ATTENTION — groups Unknown, Partial, Overpaid, Duplicate */}
            {attentionCount > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
                  Needs Attention ({attentionCount})
                </h2>

                <Section title="Unknown" count={unknownTxs.length}>
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
                </Section>

                <Section title="Partial" count={partialRecs.length}>
                  {partialRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Section>

                <Section title="Overpaid" count={overpaidRecs.length}>
                  {overpaidRecs.map((rec) => (
                    <ReceivableCard key={rec.id} rec={rec} />
                  ))}
                </Section>

                <Section title="Duplicate" count={duplicateTxs.length}>
                  {duplicateTxs.map((tx) => (
                    <TransactionCard key={tx.id} tx={tx} />
                  ))}
                </Section>
              </div>
            )}

            {/* OVERDUE */}
            <Section title="Overdue" count={overdueRecs.length}>
              {overdueRecs.map((rec) => (
                <ReceivableCard key={rec.id} rec={rec} />
              ))}
            </Section>

            {/* PAID */}
            <Section title="Paid" count={paidRecs.length}>
              {paidRecs.map((rec) => (
                <ReceivableCard key={rec.id} rec={rec} />
              ))}
            </Section>

            {/* PENDING */}
            <Section title="Pending" count={pendingRecs.length}>
              {pendingRecs.map((rec) => (
                <ReceivableCard key={rec.id} rec={rec} />
              ))}
            </Section>

          </div>
        )}

      </main>
    </div>
  );
}
