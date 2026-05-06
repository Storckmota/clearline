"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
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
  );
}

function TransactionCard({ tx }: { tx: ApiTransaction }) {
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
      <div className="text-right shrink-0">
        <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
          {rawToHuman(tx.amount_raw)} USDC
        </span>
      </div>
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
  }, [publicKey]);

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
          <div className="flex items-center gap-2">
            {mounted && publicKey && (
              <Link
                href="/receivables/new"
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 whitespace-nowrap"
              >
                New expected payment
              </Link>
            )}
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
                    <TransactionCard key={tx.id} tx={tx} />
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
