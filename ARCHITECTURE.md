# Clearline — Architecture

## 1. System Overview

Clearline is a single-tenant Next.js application backed by Supabase.

Clearline classifies incoming Solana USDC transfers into:

- Paid
- Partial
- Overpaid
- Duplicate
- Unknown
- Overdue

Clearline is not an invoicing tool, billing platform, accounting system, or treasury product.

The core product surface is a USDC Payment Inbox. The user creates expected payments only so incoming wallet transfers can be classified.

The architecture is optimized for:

- 10-day hackathon build
- devnet demo reliability
- minimal infrastructure
- no custom smart contracts
- mainnet-ready design without requiring mainnet launch

Official Frontier rules do not appear to require mainnet deployment. The rules mention judging by functionality, impact, novelty, UX, open-source quality, and business plan, but do not mention devnet or mainnet requirements. Therefore the safest strategy is:

- build and demo on devnet
- make the architecture mainnet-ready
- do not force mainnet deployment unless the full flow is tested end-to-end

Sources:
- Frontier announcement: https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/
- Official rules: https://colosseum.com/legal/Solana%20Frontier%20Hackathon%20Rules.pdf

---

## 2. High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  Payment Inbox ──► Expected Payment Detail ──► Resolve UI    │
│                                      └──────► Proof Page     │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────┐
│                  Next.js API Routes - Node Runtime            │
│                                                              │
│  POST /api/receivables        create expected payment         │
│  GET  /api/receivables        list inbox + compute overdue    │
│  POST /api/webhooks/helius    ingest incoming transaction     │
│  POST /api/resolve            manually resolve unknown tx     │
│  POST /api/dev/replay-webhook replay saved demo payload       │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
┌───────────────▼──────────────┐   ┌───────────▼────────────────┐
│          Supabase             │   │        Helius Devnet        │
│  service role server-side     │   │                            │
│                               │   │  enhancedDevnet webhook     │
│  receivables                  │◄──│  posts tx payloads          │
│  transactions                 │   │                            │
└───────────────────────────────┘   └───────────▲────────────────┘
                                                │ monitors
                                   ┌────────────┴────────────────┐
                                   │       Solana Devnet          │
                                   │                              │
                                   │  monitored wallet            │
                                   │  monitored USDC ATA          │
                                   └─────────────────────────────┘
```

---

## 3. Frontend Routes

Use Next.js App Router. Use Node runtime. Do not use Edge runtime.

```
/                       Payment Inbox
/receivables/new        Create expected payment
/receivables/[id]       Expected payment detail + manual resolve
/tx/[signature]         Proof page
/api/*                  API route handlers
```

The main route is `/`.

The first screen must show the inbox, not charts or accounting summaries.

Inbox groups:

- Needs attention
- Unknown
- Partial
- Overpaid
- Duplicate
- Paid
- Overdue

No dashboard, analytics, reports, or account management.

---

## 4. API Routes

### POST /api/receivables

Creates an expected payment.

Input:

```json
{
  "label": "Acme Corp - Milestone 1",
  "expected_amount_raw": 100000000,
  "due_date": "2026-05-10"
}
```

Behavior:

- Generate a Solana reference public key.
- Store reference public key as `reference_pubkey`.
- Generate Solana Pay URL.
- Insert receivable.
- Return receivable + payment URL.

Reference generation:

```ts
import { Keypair } from "@solana/web3.js";

const reference = Keypair.generate().publicKey;
const referencePubkey = reference.toBase58();
```

Only the public key is stored. The generated keypair is not used for signing.

---

### GET /api/receivables

Returns all receivables and linked transactions.

Overdue is computed on read:

```ts
if (
  receivable.status === "pending" &&
  receivable.due_date &&
  new Date(receivable.due_date) < new Date()
) {
  displayStatus = "overdue";
}
```

No cron. No DB write for overdue.

---

### POST /api/webhooks/helius

Single ingestion point for Helius webhooks.

Must return 200 quickly.

Processing order:

1. Verify `Authorization` header equals `HELIUS_AUTH_TOKEN`.
2. Extract transaction signature.
3. If signature already exists in `transactions`, return 200.
4. Filter for USDC transfers to monitored wallet or monitored USDC ATA.
5. Extract:
   - signature
   - sender wallet
   - recipient wallet
   - amount raw
   - mint
   - timestamp
   - raw payload
6. Insert transaction row before classification.
7. Extract reference from enhanced payload account keys.
8. If reference is missing, fetch transaction by signature using RPC and inspect account keys.
9. Match receivable by `reference_pubkey`.
10. Run classifier.
11. Update transaction with status, reason, and receivable ID.
12. Update receivable status if matched.

---

### POST /api/resolve

Manual resolution for unknown payments.

Input:

```json
{
  "transaction_id": "uuid",
  "receivable_id": "uuid"
}
```

Behavior:

- Load transaction.
- Load receivable.
- Assign transaction to receivable.
- Re-run classifier.
- Update transaction status and reason.
- Update receivable status using status rules.

No heuristic matching by amount + sender.

---

### POST /api/dev/replay-webhook

Demo-only endpoint.

Purpose:

- Replay saved Helius webhook payloads.
- Avoid demo failure if Helius delivery is delayed.
- Exercise the same ingestion pipeline as real webhooks.

Protection:

- Require `DEV_SECRET` header.
- Do not expose this endpoint in production UI.
- Keep it available for local/devnet demo only.

---

## 5. Database Schema

Use Supabase Postgres.

No auth. No RLS. All DB access happens server-side using the service role key.

### receivables

```sql
create table receivables (
  id uuid primary key default gen_random_uuid(),

  label text not null,

  expected_amount_raw bigint not null,
  due_date timestamptz null,

  reference_pubkey text not null unique,
  solana_pay_url text not null,

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'partial', 'overpaid')),

  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);
```

Notes:

- `expected_amount_raw` stores USDC base units.
- Devnet USDC uses 6 decimals.
- 100 USDC = 100000000.
- `overdue` is display-only and computed on read.
- `unknown` and `duplicate` are transaction statuses, not receivable statuses.

---

### transactions

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),

  signature text not null unique,

  sender_wallet text null,
  recipient_wallet text not null,

  amount_raw bigint not null,
  mint text not null,

  reference_pubkey text null,
  receivable_id uuid null references receivables(id),

  status text not null default 'unknown'
    check (status in ('paid', 'partial', 'overpaid', 'duplicate', 'unknown')),

  classification_reason text not null default 'Unclassified',

  raw_payload jsonb not null,

  observed_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index transactions_signature_idx on transactions(signature);
create index transactions_receivable_id_idx on transactions(receivable_id);
create index receivables_reference_pubkey_idx on receivables(reference_pubkey);
```

No `resolution_log` for MVP.

---

## 6. Solana Pay Flow

Clearline generates payment links for expected payments.

Devnet USDC mint:

```
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Solana Pay URL:

```
solana:<RECIPIENT_WALLET>
  ?amount=<human_readable_usdc>
  &spl-token=<USDC_MINT>
  &reference=<reference_pubkey>
  &label=<label>
```

Example:

```
solana:RecipientWalletPubkey
  ?amount=100
  &spl-token=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
  &reference=ReferencePubkey
  &label=Acme%20Corp%20-%20Milestone%201
```

Rules:

- Store amount in DB as raw units.
- Put amount in Solana Pay URL as human-readable decimal.
- Use reference public key as the deterministic matching key.
- Memo is optional and not used as source of truth.
- Do not require a custom smart contract.

---

## 7. Helius Webhook Flow

Use Helius `enhancedDevnet` webhook.

Webhook monitors:

- monitored receiving wallet
- monitored receiving wallet USDC associated token account

The endpoint must be public HTTPS.

Development options:

- Vercel preview deployment
- ngrok tunnel

Webhook payload handling:

- Treat webhooks as at-least-once delivery.
- Dedupe by transaction signature.
- Store raw payload.
- Do not assume every useful field is present in enhanced parsing.
- Use RPC fallback when reference extraction fails.

---

## 8. Reference Extraction Strategy

Primary strategy:

- Inspect Helius enhanced payload account keys.
- Find any account key matching a stored `receivables.reference_pubkey`.

Secondary strategy:

- If enhanced payload does not expose account keys clearly, fetch the transaction by signature using RPC.
- Inspect `transaction.transaction.message.accountKeys`.
- Compare account keys against stored open receivable references.

Reference matching rule:

```ts
const receivable = await findReceivableByReferencePubkey(referencePubkey);
```

If reference exists → transaction is matched to that receivable.

If no reference exists → transaction is classified as `unknown`.

No amount + sender heuristic matching.

---

## 9. RPC Fallback Strategy

RPC fallback is required, not optional.

Use it when:

- enhanced payload lacks account keys
- reference extraction fails
- payload shape is unexpected

Fallback steps:

1. Call `getTransaction(signature, { maxSupportedTransactionVersion: 0 })`.
2. Extract message account keys.
3. Normalize account keys to base58 strings.
4. Compare against open receivable `reference_pubkey` values.
5. Continue classification.

If RPC fetch fails:

- keep transaction as `unknown`
- set `classification_reason = "Reference not found; RPC fallback failed"`
- do not crash webhook handler
- webhook must still return 200

---

## 10. Payment Validation Strategy

Validation happens after reference extraction.

Validate:

- mint equals devnet USDC mint
- recipient equals monitored wallet or monitored USDC ATA
- amount equals transfer amount parsed from payload
- reference matches stored receivable reference

For a matched receivable:

```
reference_pubkey matched → classify by amount
```

For unmatched payment:

```
no reference_pubkey matched → unknown
```

For demo, validation can be implemented by direct payload/RPC inspection.

If time allows, use Solana Pay helper functions such as `validateTransfer`, but do not block the MVP on helper library ergonomics.

The product must show `classification_reason`.

Examples:

```
Exact match: expected 100 USDC, received 100 USDC, reference matched.
Partial: expected 100 USDC, received 60 USDC, reference matched.
Unknown: no matching Solana Pay reference found.
Duplicate: receivable already marked paid.
```

---

## 11. Classification Engine

Pure function. File: `lib/classify.ts`

Signature:

```ts
type Status = "paid" | "partial" | "overpaid" | "duplicate" | "unknown";

type ClassifyResult = {
  status: Status;
  reason: string;
};

function classify(
  receivable: Receivable | null,
  transaction: Pick<Transaction, "amount_raw">
): ClassifyResult;
```

Rules, in order:

1. No receivable → `unknown` — "No matching receivable found."
2. Receivable already paid → `duplicate` — "Receivable already marked paid."
3. Exact amount → `paid` — "Exact match: expected X USDC, received X USDC."
4. Less than expected → `partial` — "Expected X USDC, received Y USDC."
5. More than expected → `overpaid` — "Expected X USDC, received Y USDC."

Overdue is not a transaction classification.

---

## 12. Status Update Rules

Receivable status is intentionally simple.

Rules:

- If transaction status is `paid` → set receivable status to `paid`.
- If transaction status is `partial` → set receivable status to `partial`.
- If transaction status is `overpaid` → set receivable status to `overpaid`.
- If transaction status is `duplicate` → do not change receivable status.
- If transaction status is `unknown` → do not change receivable status.

Duplicate rule: if receivable is already paid, any later matched transaction for the same reference is `duplicate`.

Out of scope:

- summing multiple partial payments
- applying multiple payments to one receivable
- refund workflows
- credit balances

---

## 13. Duplicate Transaction Handling

### Webhook redelivery duplicate

Same transaction signature arrives more than once.

Rule: if signature already exists, return 200 immediately. No reclassification.

### Business duplicate

Different transaction arrives for a receivable already marked paid.

Rule: classify as `duplicate`. Do not update receivable status. Must be visible in the inbox.

---

## 14. Unknown Payment Handling

A transaction is unknown when:

- it is an incoming USDC transfer to the monitored wallet/ATA
- no stored reference public key is found
- RPC fallback does not find a matching reference

Unknown payments appear in the inbox under **Needs attention**.

The user can manually assign an unknown transaction to an expected payment. No automatic heuristic matching.

---

## 15. Manual Resolution Flow

User opens an unknown transaction.

UI shows:

- amount
- sender wallet
- recipient wallet
- signature
- timestamp
- reason: no matching reference found

User selects an expected payment → `POST /api/resolve`

After assignment:

- set `transaction.receivable_id`
- run `classify(receivable, transaction)`
- update transaction status and reason
- update receivable status according to status update rules

Example:

```
Unknown 60 USDC transfer manually assigned to 100 USDC expected payment.
Result: partial.
Reason: Expected 100 USDC, received 60 USDC.
```

---

## 16. Devnet Demo Strategy

The hackathon demo runs on devnet.

Reasons:

- avoids real funds
- allows repeatable test payments
- lowers operational risk
- no custom contracts needed
- official rules do not state a mainnet requirement

Demo setup:

- one monitored wallet
- one payer wallet
- devnet SOL for fees
- devnet USDC in payer wallet
- receiving wallet USDC ATA created before demo
- Helius `enhancedDevnet` webhook configured
- saved webhook fixtures available

Demo sequence:

1. Create expected payment for 100 USDC.
2. Generate Solana Pay link.
3. Send exact payment → show `paid`.
4. Send 60 USDC with same reference → show `partial` or `duplicate`.
5. Send raw USDC transfer without reference → show `unknown`.
6. Manually resolve unknown to expected payment.
7. Show proof page.

Recommended demo fixtures:

- Expected payment A: exact 100 → `paid`
- Expected payment B: 60 of 100 → `partial`
- Expected payment C: 120 of 100 → `overpaid`
- Expected payment D: raw transfer without reference → `unknown`
- Expected payment A second payment → `duplicate`

---

## 17. Mainnet-Readiness Strategy

Mainnet deployment is not required for MVP.

Architecture must be mainnet-ready by configuration:

```
SOLANA_NETWORK=devnet | mainnet-beta
USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

Mainnet-readiness means:

- no devnet mint hardcoded outside config
- network selected by env var
- webhook type selected by env var
- RPC URL selected by env var
- recipient wallet selected by env var

Submission language:

> Clearline demo runs on Solana devnet with mainnet-ready configuration. No custom contracts are required; the same architecture works on mainnet by changing network, USDC mint, RPC, webhook, and wallet config.

---

## 18. Scripted Fallback Transfer Strategy

Solana Pay devnet wallet UX may be unreliable.

Build a fallback script: `scripts/send-devnet-usdc.ts`

Script capabilities:

- send devnet USDC from payer wallet to monitored wallet
- optionally include reference public key
- send exact, partial, or overpaid amount
- send raw transfer without reference

Usage:

```bash
pnpm send:devnet-usdc --amount 100 --reference <reference_pubkey>

# Raw unknown transfer
pnpm send:devnet-usdc --amount 75
```

The script must create associated token accounts if missing.

This script is not a product feature. It is demo insurance.

---

## 19. Dev Replay Endpoint Strategy

Build replay support early.

Endpoint: `POST /api/dev/replay-webhook`

Protection: `DEV_SECRET` header

Behavior:

- accepts saved Helius payload JSON
- passes payload into the same ingestion function used by `/api/webhooks/helius`
- returns resulting transaction status

Use cases:

- local testing
- recorded demo reliability
- Helius delivery delay fallback

Do not expose replay UI to users.

---

## 20. First 48h Implementation Plan

### Hours 0–6: Prove Solana Pay reference flow

- generate reference public key
- generate Solana Pay URL
- send devnet USDC with reference
- confirm reference appears in transaction account keys
- confirm amount/mint/recipient can be validated

If this fails, stop and fix before building UI.

### Hours 6–12: Prove scripted fallback transfer

- `scripts/send-devnet-usdc.ts`
- exact transfer with reference
- raw transfer without reference
- ATA creation if missing

### Hours 12–24: Prove Helius ingestion

- deployed webhook endpoint
- Helius `enhancedDevnet` webhook configured
- monitored wallet + USDC ATA configured
- raw payload received and saved
- signature dedupe working

### Hours 24–36: Build parser + RPC fallback

- parse USDC transfers from enhanced payload
- extract sender, recipient, mint, amount
- extract reference from payload
- fetch transaction by signature if reference missing
- normalize account keys

### Hours 36–48: Build classifier + minimal inbox

- `classify()` function
- paid / partial / overpaid / duplicate / unknown
- `classification_reason`
- inbox reads real DB data
- proof page for one transaction

No styling polish until the data path works.

---

## 21. Top Execution Risks And Mitigations

### Risk 1: Solana Pay devnet wallet flow is flaky

- test immediately
- build scripted fallback transfer
- use script for recorded demo if needed

### Risk 2: Helius payload shape differs from expectation

- store raw payload always
- implement parser against actual received fixture
- implement RPC fallback in first 48h

### Risk 3: Duplicate/status logic creates confusing results

- use one expected payment per classification in demo
- keep receivable status rules simple
- do not implement cumulative partials

### Risk 4: Webhook delay during live demo

- keep replay endpoint
- keep saved payload fixtures
- use recorded video path if live webhook is slow

### Risk 5: Demo looks like invoicing

- open demo on inbox
- call records "expected payments," not invoices
- emphasize `classification_reason`
- show unknown and duplicate payments

---

## 22. What Not To Build

Do not build:

- auth / RLS
- multi-wallet support
- cron
- email notifications
- CSV export
- AI features
- custom smart contracts
- mainnet deployment requirement
- heuristic matching by amount + sender
- invoice PDFs or editor
- accounting integrations
- subscriptions / fiat rails
- dashboards or charts
- team permissions
- refund workflows
- cumulative partial payment accounting
- production queue infrastructure

If a feature does not help classify incoming USDC transfers, do not build it.

---

## 23. Environment Variables

All runtime configuration must be read from `lib/config.ts`. Do not read `process.env` directly across the app. API routes and scripts must import config from this module. This ensures the webhook handler, the Solana Pay generator, and the demo script all use exactly the same values.

`lib/config.ts` validates required env vars at startup and exposes typed config.

Required variables:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
RECIPIENT_WALLET=
RECIPIENT_USDC_ATA=

# USDC (do not hardcode outside this file)
USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Helius
HELIUS_AUTH_TOKEN=

# Demo / Dev
DEV_SECRET=
```

`.env.local.example`:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

RECIPIENT_WALLET=
RECIPIENT_USDC_ATA=

USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

HELIUS_AUTH_TOKEN=
DEV_SECRET=
```

Notes:

- `RECIPIENT_USDC_ATA` must be pre-created on-chain before the demo. Derive with `getAssociatedTokenAddress(USDC_MINT, RECIPIENT_WALLET)` from `@solana/spl-token`.
- `HELIUS_AUTH_TOKEN` is an arbitrary string set in the Helius webhook dashboard under "Auth Header". Clearline verifies `req.headers.authorization === HELIUS_AUTH_TOKEN`.
- `SOLANA_RPC_URL` must point to the Helius RPC endpoint, not `api.devnet.solana.com`, to avoid rate limits during the demo.
- Do not commit `.env.local`. Commit only `.env.local.example` with empty values.

---

## 24. GET /api/receivables/[id]

Returns a single receivable and all transactions linked to it.

```
GET /api/receivables/:id

Response:
{
  "receivable": { ...receivable fields... },
  "transactions": [ ...linked transactions... ],
  "displayStatus": "paid" | "partial" | "overpaid" | "overdue" | "pending"
}
```

**The detail page does not query the blockchain directly.**

Source of truth distinction:

| Source | Used for |
|---|---|
| Supabase (`receivables`, `transactions`) | Rendering the detail page, inbox, and resolve UI |
| Blockchain / RPC | Ingestion pipeline and validation only — not for UI rendering |
| Transaction `signature` + explorer link | Proof that a payment happened on-chain |

Rationale: if the detail page depended on RPC queries by `reference_pubkey`, the UI would become slower, more fragile, harder to test, and harder to demo reliably. The correct flow is:

```
Helius / RPC  →  ingestion  →  Supabase  →  inbox / detail / proof
```

Not:

```
UI  →  RPC  →  on-demand parsing  →  classification
```

The proof page (`/tx/[signature]`) shows saved data from the `transactions` table plus a link to Solana Explorer. It does not re-fetch from the blockchain on render.

---

## 25. Project Directory Structure

```
clearline/
├── app/
│   ├── page.tsx                          # Payment Inbox (/)
│   ├── receivables/
│   │   ├── new/
│   │   │   └── page.tsx                  # Create expected payment
│   │   └── [id]/
│   │       └── page.tsx                  # Detail + manual resolve
│   ├── tx/
│   │   └── [signature]/
│   │       └── page.tsx                  # Proof page
│   └── api/
│       ├── receivables/
│       │   ├── route.ts                  # GET list + POST create
│       │   └── [id]/
│       │       └── route.ts              # GET single receivable + transactions
│       ├── webhooks/
│       │   └── helius/
│       │       └── route.ts              # Webhook ingestion
│       ├── resolve/
│       │   └── route.ts                  # Manual resolution
│       └── dev/
│           └── replay-webhook/
│               └── route.ts              # Demo replay (protected)
├── lib/
│   ├── classify.ts                       # Pure classification function — no DB imports
│   ├── config.ts                         # Typed env var validation — imported by all modules
│   ├── helius.ts                         # Payload parsing helpers
│   ├── ingest.ts                         # Shared ingestion pipeline (used by webhook + replay)
│   ├── rpc.ts                            # RPC fallback — getTransaction + account key extraction
│   ├── solana-pay.ts                     # Reference key generation + URL encoding
│   ├── supabase.ts                       # Service role DB client
│   └── usdc.ts                           # Amount conversion utilities (raw ↔ human-readable)
├── scripts/
│   └── send-devnet-usdc.ts               # Scripted fallback transfer (demo insurance)
├── fixtures/
│   └── helius/
│       ├── exact-payment.json            # 100 USDC with reference → paid
│       ├── partial-payment.json          # 60 USDC with reference → partial
│       ├── overpaid-payment.json         # 120 USDC with reference → overpaid
│       └── unknown-payment.json          # USDC transfer without reference → unknown
├── supabase/
│   └── migrations/
│       └── 001_init.sql                  # Tables + indexes
├── types/
│   └── index.ts                          # Receivable, Transaction, Status types
├── .env.local.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

Critical rule:

`lib/ingest.ts` contains the shared ingestion pipeline used by both `/api/webhooks/helius` and `/api/dev/replay-webhook`. The replay endpoint must not duplicate ingestion logic — it must call the same function. If replay takes a different code path, it no longer tests the real product.