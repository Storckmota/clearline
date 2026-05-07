# Clearline — USDC Payment Inbox for Solana merchants

Clearline turns raw incoming Solana USDC transfers into an actionable payment inbox.

When USDC arrives at a merchant wallet, Clearline automatically classifies each transfer and surfaces anything that needs attention — without opening a block explorer or maintaining a spreadsheet.

**Live demo:** [https://clearline-lovat.vercel.app](https://clearline-lovat.vercel.app)
**GitHub:** [https://github.com/Storckmota/clearline](https://github.com/Storckmota/clearline)
**Demo video:** *(coming soon)*

> Running on Solana devnet. This is a single-merchant hackathon MVP — see [MVP scope](#mvp-scope) below.

---

## What Clearline classifies

| Status | Meaning |
|---|---|
| **Paid** | Exact amount received, Solana Pay reference matched |
| **Partial** | Less than expected amount received |
| **Overpaid** | More than expected amount received |
| **Duplicate** | Payment arrived for a receivable already marked paid |
| **Unknown** | Incoming USDC transfer with no matching expected payment |
| **Overdue** | Expected payment not received past its due date *(display only)* |

Every classification includes a human-readable reason — for example:
> "Expected 1 USDC, received 0.5 USDC, reference matched."

---

## Why Solana

- **Low-cost USDC** — transfers settle in seconds at sub-cent fees
- **Solana Pay references** — unique public keys embedded in payment links enable deterministic matching without custom smart contracts
- **Wallet-native payments** — no payment processor, invoicing platform, or bank integration required
- **Fast settlement** — USDC on Solana confirms quickly with low latency and low fees; Clearline classifies it as it arrives

---

## Core features

- **Payment Inbox** — groups incoming transfers by classification; surfaces anything needing attention at the top
- **Create Expected Payment** — generate an expected payment with label, USDC amount, and optional due date
- **Solana Pay link + QR code** — every expected payment produces a scannable QR and `solana:` URI embedding a unique reference public key
- **Helius webhook ingestion** — near-real-time USDC monitoring via Helius `enhancedDevnet` webhook
- **Classification engine** — pure BigInt classification (`lib/classify.ts`); no float arithmetic; human-readable reasons
- **RPC fallback reference matching** — if the Helius enhanced payload doesn't surface the reference, falls back to a full RPC account key scan
- **Manual resolve** — assign an unmatched unknown transfer to an expected payment; re-runs classification inline
- **Transaction proof page** — saved proof view for every classified transfer, with signature, amount, classification reason, and Solana Explorer link
- **Replay fixtures** — five real-captured devnet transactions for deterministic demo verification

---

## Architecture

```
Browser
  └── Next.js App Router (Node runtime, Vercel)
        ├── GET  /api/receivables            list inbox + orphan transactions
        ├── POST /api/receivables            create expected payment
        ├── GET  /api/receivables/[id]       expected payment detail + transactions
        ├── GET  /api/transactions/[sig]     transaction detail + proof data
        ├── POST /api/webhooks/helius        ingest incoming USDC transfer
        ├── POST /api/resolve                manually resolve unknown transfer
        └── POST /api/dev/replay-webhook     replay fixture payload (admin-protected)
              │
        Supabase Postgres (service role, server-only)
              receivables  — expected payments, Solana Pay references, status
              transactions — classified transfers, raw Helius payloads
              │
        Helius enhancedDevnet webhook
              monitors configured merchant wallet + USDC ATA
              │
        Solana Devnet
              SPL token transfers (devnet USDC)
```

**Key design decisions:**

- All DB access is server-side via service role key; `lib/supabase.ts` is `server-only`
- `overdue` is computed on read and never written to the database
- Technical dedupe (`duplicate_sig`) is separate from business classification (`duplicate`)
- `lib/classify.ts` is a pure function with no DB or network dependencies — tested end-to-end via fixture replay
- Inbox reads from Supabase only; no live RPC queries from the UI

---

## MVP scope

This is a single-merchant devnet MVP built for the Solana Frontier Hackathon.

**What is true today:**

- Live ingestion is driven by `RECIPIENT_WALLET`, `RECIPIENT_USDC_ATA`, and the Helius webhook configured to monitor those addresses at deploy time
- Wallet connection in the UI is for the demo session only — it does not dynamically register any wallet with Helius or change what addresses are monitored
- The inbox query is scoped to the connected wallet's receivables in Supabase; connecting a different wallet shows an empty inbox
- Multi-merchant onboarding is future work
- No auth, no RLS

**What this is not:**

- Not a production multi-tenant SaaS
- Not deployed to Solana mainnet (devnet only; architecture is mainnet-ready by env var configuration)
- Not an invoicing, billing, or accounting tool

---

## Known limitations

- **Devnet only** — all demo transactions use Solana devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- **Single merchant** — one wallet configured per deployment; Helius webhook is not dynamically provisioned per user
- **No production auth or RLS** — DB access uses the service role server-side; no per-user row isolation
- **No dynamic Helius onboarding** — the Helius webhook must be manually updated to point to the active deployment URL
- **No mainnet deployment** — switching to mainnet requires updating `SOLANA_NETWORK`, `SOLANA_RPC_URL`, USDC mint, and Helius webhook type

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values. Never commit `.env.local`.

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=                   # Helius devnet RPC URL (recommended to avoid public RPC rate limits)

# Monitored merchant wallet — required for the ingest pipeline
RECIPIENT_WALLET=                 # The configured devnet merchant wallet monitored by Helius
RECIPIENT_USDC_ATA=               # The configured merchant USDC token account monitored by Helius; derived from RECIPIENT_WALLET if omitted. Even if omitted in app env, the merchant USDC ATA should be added to Helius monitored addresses for reliable live webhook delivery.

# Helius webhook auth
HELIUS_AUTH_TOKEN=                # Arbitrary secret set in Helius webhook "Auth Header" config

# Admin / demo protection
DEV_SECRET=                       # Protects /api/resolve and /api/dev/replay-webhook

# Scripts only — not used by the app
PAYER_KEYPAIR_PATH=               # Path to [u8;64] JSON keypair file for send-devnet-usdc.ts
```

---

## Local setup

```bash
git clone <repo>
cd clearline
npm install
cp .env.local.example .env.local
# fill in .env.local with your Supabase, Helius, and wallet values

npm run dev          # start dev server at http://localhost:3000
npm run lint         # ESLint
npx tsc --noEmit    # TypeScript check
npm run build        # production build
```

To send a scripted devnet USDC transfer (with or without a reference):

```bash
# With Solana Pay reference (exact / partial / overpaid scenarios)
npm run send:devnet-usdc -- --recipient <wallet> --amount 1 --reference <reference_pubkey>

# Without reference (unknown scenario)
npm run send:devnet-usdc -- --recipient <wallet> --amount 0.001
```

---

## Fixture replay

`fixtures/helius/` contains five real-captured Helius devnet webhook payloads — one per classification.

| Fixture | Scenario | Amount | Signature (truncated) |
|---|---|---|---|
| `exact-payment.json` | reference matched, exact amount → paid | 1 USDC | `5noPgVe2…` |
| `partial-payment.json` | reference matched, under amount → partial | 0.5 USDC | `chRxiw1M…` |
| `overpaid-payment.json` | reference matched, over amount → overpaid | 2 USDC | `56FdKf68…` |
| `unknown-payment.json` | no reference → unknown | 0.001 USDC | `mtH4nuSX…` |
| `duplicate-payment.json` | same reference as exact, receivable already paid → duplicate | 1 USDC | `5Gp6mYYa…` |

Replay via `POST /api/dev/replay-webhook` with header `x-dev-secret: <DEV_SECRET>` and the fixture JSON as the request body. The replay endpoint feeds payloads through the same ingestion pipeline as live webhooks (`lib/ingest.ts`).

**Do not expose `DEV_SECRET` in any demo recording or public terminal output.**

---

## Future work

- Multi-merchant onboarding with wallet-auth accounts
- Dynamic Helius address registration per merchant
- Production auth and per-merchant row-level security
- Richer reconciliation and CSV export
- Mainnet deployment
- Push notifications on incoming payment

---

## Built for

Solana Frontier Hackathon · [Colosseum](https://colosseum.com)
