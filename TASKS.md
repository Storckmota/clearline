# TASKS.md — Clearline

## 0. Purpose

This file is the execution tracker for Clearline.

It exists to:

- preserve project progress across AI agents
- avoid duplicated work
- prevent scope creep
- keep development aligned with `PROJECT.md`, `SPEC.md`, `ARCHITECTURE.md`, and `ACCEPTANCE_CRITERIA.md`
- make it clear what is done, what is blocked, and what comes next

`TASKS.md` controls execution order.

`ACCEPTANCE_CRITERIA.md` controls whether work is actually done.

`AGENTS.md` controls how AI agents operate.

Files inside `agents/` define role-specific behavior.

Every AI agent working on Clearline must treat this file as the operational execution tracker.

---

# PHASE 0 — Current State Audit

Before starting or continuing development, verify what already exists.

Do not assume a task is complete just because it was discussed earlier.

A task can only be marked `[x]` after checking the actual file, command, behavior, and relevant acceptance criteria.

## 0.1 Existing Documentation

- [ ] Verify `AGENTS.md` exists
- [ ] Verify `AGENTS.md` matches the approved agent operating rules
- [ ] Verify `agents/implementation.md` exists
- [ ] Verify `agents/code-review.md` exists
- [ ] Verify `agents/qa-acceptance.md` exists
- [ ] Verify `agents/security-review.md` exists
- [ ] Verify `agents/handoff.md` exists
- [ ] Verify `agents/colosseum-review.md` exists
- [ ] Verify `agents/ux-ui-review.md` exists
- [ ] Verify `PROJECT.md` exists
- [ ] Verify `PROJECT.md` matches the approved product definition
- [ ] Verify `SPEC.md` exists
- [ ] Verify `SPEC.md` matches `PROJECT.md` and `ARCHITECTURE.md`
- [ ] Verify `ARCHITECTURE.md` exists
- [ ] Verify `ARCHITECTURE.md` matches the approved architecture
- [ ] Verify `ACCEPTANCE_CRITERIA.md` exists
- [ ] Verify `ACCEPTANCE_CRITERIA.md` matches `SPEC.md` and the critical path in `TASKS.md`
- [ ] Verify `TASKS.md` exists
- [ ] Verify `TASKS.md` is valid Markdown
- [ ] Verify all core docs are consistent: `AGENTS.md`, `PROJECT.md`, `SPEC.md`, `ARCHITECTURE.md`, `ACCEPTANCE_CRITERIA.md`, `TASKS.md`
- [ ] Verify `.env.local.example` exists
- [ ] Verify `README.md` exists, even if placeholder

## 0.2 Project Scaffold

- [ ] Verify `clearline/` project folder exists
- [ ] Verify Git repository is initialized
- [ ] Verify `package.json` exists
- [ ] Verify Next.js project exists
- [ ] Verify TypeScript config exists
- [ ] Verify app runs locally
- [ ] Verify Tailwind is configured only if included by scaffold

## 0.3 Current File Audit

- [ ] Check which files already exist in `app/`
- [ ] Check which files already exist in `lib/`
- [ ] Check which files already exist in `scripts/`
- [ ] Check which files already exist in `supabase/`
- [ ] Check which files already exist in `types/`
- [ ] Update this `TASKS.md` to mark only verified completed tasks as `[x]`

## 0.4 Completion Rule

A task is only complete if:

- the file exists
- the implementation matches `PROJECT.md`
- the implementation matches `SPEC.md`
- the implementation matches `ARCHITECTURE.md`
- relevant acceptance criteria in `ACCEPTANCE_CRITERIA.md` pass
- the relevant command, script, test, or manual verification runs without obvious error
- no forbidden scope was added
- `TASKS.md` is updated after verification

Do not mark tasks complete based only on intention or code existing.

If relevant acceptance criteria fail, the task is not complete.

---

# Operating Rules for AI Agents

Before starting any task, every AI agent must:

1. Read `AGENTS.md`
2. Read the selected role file from `agents/`
3. Read `PROJECT.md`
4. Read `SPEC.md`
5. Read `ARCHITECTURE.md`
6. Read `ACCEPTANCE_CRITERIA.md`
7. Read `TASKS.md`
8. Identify the current phase
9. State which checklist item it is working on
10. Avoid modifying unrelated files
11. Update `TASKS.md` after completing a task
12. Document blockers immediately

Agents must NOT:

- reorder the architecture
- add routes not listed here
- add new database tables without approval
- add product features not listed in `PROJECT.md`
- rename product primitives
- introduce forbidden scope
- skip unfinished dependencies
- modify protected instruction files without explicit user approval, except for allowed `TASKS.md` progress updates

Before marking a task complete, the agent must identify relevant acceptance criteria and verify them.

If acceptance criteria are not applicable, the agent must say why.

If implementation behavior differs from `SPEC.md` or `ACCEPTANCE_CRITERIA.md`, stop and ask before changing scope or behavior.

If a task depends on an unfinished earlier task, stop and complete the dependency first.

If an agent believes a forbidden feature is necessary, it must stop and ask before implementing.

If implementation requires changing behavior described in `SPEC.md` or `ACCEPTANCE_CRITERIA.md`, update the relevant doc only after approval.

If a role file inside `agents/` conflicts with `PROJECT.md`, `SPEC.md`, `ARCHITECTURE.md`, `ACCEPTANCE_CRITERIA.md`, or `TASKS.md`, the core docs win.

---

# Protected Instruction Files

These files must not be modified unless the user explicitly asks for it, except for the allowed `TASKS.md` progress updates described below:

- `AGENTS.md`
- `agents/implementation.md`
- `agents/code-review.md`
- `agents/qa-acceptance.md`
- `agents/security-review.md`
- `agents/handoff.md`
- `agents/colosseum-review.md`
- `agents/ux-ui-review.md`
- `PROJECT.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `ACCEPTANCE_CRITERIA.md`
- `TASKS.md`

Agents may read these files freely.

Agents must not rewrite, simplify, reorganize, or “improve” these files without explicit approval.

## `TASKS.md` Progress Update Exception

Agents may update `TASKS.md` without separate approval only to:

- mark verified tasks as `[x]`
- add completion notes required by the Agent Completion Protocol
- document blockers
- update current progress after verified work

Agents must not otherwise rewrite, reorganize, simplify, or change the structure or scope of `TASKS.md` without explicit user approval.

If an agent believes a protected file is wrong, incomplete, outdated, or conflicting, it must:

1. stop
2. explain the issue
3. explain the proposed change
4. wait for explicit approval before editing

---

# Agent Completion Protocol

When completing a task, the agent must document:

- task completed
- what was changed
- which files were changed
- relevant acceptance criteria checked
- whether criteria passed
- how it was verified
- whether any behavior remains unverified
- whether any blocker remains

Example:

```txt
Task completed:
- Task: 3.2 Classification Engine
- Changed files:
  - lib/classify.ts
- Acceptance criteria checked:
  - Classification Flow
  - Classification Correctness
  - Expected Payment Status Update Rules
- Verification:
  - Ran pnpm test:classify
  - Verified paid / partial / overpaid / duplicate / unknown
- Behavior unverified:
  - none
- Blockers:
  - none
```

If a task cannot be completed, document:

```txt
Task blocked:
- Task: Helius webhook payload parsing
- Blocker: no real Helius webhook fixture received yet
- Acceptance criteria blocked:
  - Helius Webhook Ingestion
  - USDC Transfer Parsing
- Required next step:
  - trigger devnet USDC transfer and save real payload
```

---

# Product Language Rules

Use these terms:

- Payment Inbox
- Expected Payment
- Incoming USDC Transfer
- Classification
- Exception
- Proof Page

Do NOT introduce these terms in UI or product copy:

- invoice
- billing
- accounting
- financial dashboard
- AR dashboard
- receivables platform

Clearline is not an invoicing tool.

Clearline is a USDC Payment Inbox for Solana wallets.

---

# Current Project Goal

Build Clearline MVP for the Solana Frontier Hackathon.

Clearline classifies incoming USDC transfers as transaction statuses:

- Paid
- Partial
- Overpaid
- Duplicate
- Unknown

Clearline displays overdue expected payments as a display-only state:

- Overdue

The demo runs on Solana Devnet.

The architecture must remain mainnet-ready by configuration.

---

# Current Focus

Current priority:

Prove the full payment classification path before polishing UI.

Critical path:

1. Create expected payment
2. Generate Solana Pay link with reference
3. Send devnet USDC payment
4. Detect transaction through Helius
5. Extract reference
6. Match expected payment
7. Classify transaction
8. Display result in Payment Inbox

No styling polish until the data path works.

---

# PHASE 1 — Project Setup

## 1.1 Repository Setup

- [ ] Create project folder `clearline`
- [ ] Initialize Git repository
- [ ] Create Next.js 15 project with TypeScript
- [ ] Use App Router
- [ ] Use Node runtime
- [ ] Configure Tailwind CSS only if included by scaffold
- [ ] Confirm project runs locally
- [ ] Commit initial scaffold

## 1.2 Required Documentation

- [ ] Add `AGENTS.md`
- [ ] Add `agents/implementation.md`
- [ ] Add `agents/code-review.md`
- [ ] Add `agents/qa-acceptance.md`
- [ ] Add `agents/security-review.md`
- [ ] Add `agents/handoff.md`
- [ ] Add `agents/colosseum-review.md`
- [ ] Add `agents/ux-ui-review.md`
- [ ] Add `PROJECT.md`
- [ ] Add `SPEC.md`
- [ ] Add `ARCHITECTURE.md`
- [ ] Add `ACCEPTANCE_CRITERIA.md`
- [ ] Add `TASKS.md`
- [ ] Add `.env.local.example`
- [ ] Add initial `README.md` placeholder

## 1.3 Dependencies

Install only necessary dependencies:

- [ ] Install `@solana/web3.js`
- [ ] Install `@solana/pay`
- [ ] Install `@solana/spl-token`
- [ ] Install `@supabase/supabase-js`
- [ ] Install `bignumber.js`

Do not add unnecessary UI, auth, analytics, or backend frameworks.

---

# PHASE 2 — Config + Database

## 2.1 Environment Configuration

Create:

`lib/config.ts`

Tasks:

- [ ] Read all app runtime config from `lib/config.ts`
- [ ] Validate required app runtime env vars at startup
- [ ] Ensure app does not read `process.env` directly across multiple files
- [ ] Export typed config object

App runtime env vars:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SOLANA_NETWORK`
- [ ] `SOLANA_RPC_URL`
- [ ] `RECIPIENT_WALLET`
- [ ] `RECIPIENT_USDC_ATA`
- [ ] `USDC_MINT_DEVNET`
- [ ] `USDC_MINT_MAINNET`
- [ ] `HELIUS_AUTH_TOKEN`
- [ ] `DEV_SECRET`

Script-only env vars:

- [ ] `PAYER_KEYPAIR_PATH`

Important:

`PAYER_KEYPAIR_PATH` must only be validated by `scripts/send-devnet-usdc.ts`.

It must NOT be required by `lib/config.ts`.

It must NOT be required by app startup.

## 2.2 `.env.local.example`

Create or update `.env.local.example`.

It must include:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=
RECIPIENT_WALLET=
RECIPIENT_USDC_ATA=

# USDC
USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Helius
HELIUS_AUTH_TOKEN=

# Demo / Dev
DEV_SECRET=

# Script-only
PAYER_KEYPAIR_PATH=
```

Tasks:

- [ ] Add `.env.local.example`
- [ ] Keep all values empty except static mint values
- [ ] Do not commit `.env.local`
- [ ] Document that `PAYER_KEYPAIR_PATH` is script-only

## 2.3 Supabase Setup

- [ ] Create Supabase project
- [ ] Create `supabase/migrations/001_init.sql`
- [ ] Create `receivables` table
- [ ] Create `transactions` table
- [ ] Add unique index on `transactions.signature`
- [ ] Add index on `transactions.receivable_id`
- [ ] Add index on `receivables.reference_pubkey`
- [ ] Confirm migration runs successfully

## 2.4 Supabase Client

Create:

`lib/supabase.ts`

Tasks:

- [ ] Use service role key server-side only
- [ ] Do not expose service role key to client
- [ ] Do not add auth
- [ ] Do not add RLS

## 2.5 USDC ATA Verification

Before Helius setup:

- [ ] Derive `RECIPIENT_USDC_ATA` from `RECIPIENT_WALLET` + USDC mint
- [ ] Confirm env value matches derived ATA
- [ ] Create receiving USDC ATA if missing
- [ ] Document command or script used to verify ATA

---

# PHASE 3 — Core Domain Modules

Relevant acceptance criteria:

- Amount Handling
- Classification Flow
- Classification Correctness
- Expected Payment Status Update Rules

## 3.1 Amount Utilities

Create:

`lib/usdc.ts`

Tasks:

- [ ] Convert human-readable USDC to raw base units
- [ ] Convert raw base units to human-readable USDC
- [ ] Avoid floating point comparisons
- [ ] Use USDC 6 decimals
- [ ] Add basic checks for amount conversion

## 3.2 Classification Engine

Create:

`lib/classify.ts`

Function signature:

```ts
function classify(
  receivable: Receivable | null,
  transaction: Pick<Transaction, "amount_raw">
): ClassifyResult;
```

Statuses:

- paid
- partial
- overpaid
- duplicate
- unknown

Tasks:

- [ ] Implement `paid`
- [ ] Implement `partial`
- [ ] Implement `overpaid`
- [ ] Implement `duplicate`
- [ ] Implement `unknown`

Rules, in order:

- [ ] No receivable → `unknown`
- [ ] Receivable already paid → `duplicate`
- [ ] Exact amount → `paid`
- [ ] Less than expected → `partial`
- [ ] More than expected → `overpaid`

Every classification must include `classification_reason`.

Required example reasons:

- [ ] `Exact match: expected 100 USDC, received 100 USDC, reference matched.`
- [ ] `Partial: expected 100 USDC, received 60 USDC, reference matched.`
- [ ] `Unknown: no matching Solana Pay reference found.`
- [ ] `Duplicate: expected payment already marked paid.`

## 3.3 Classifier Checks

Classifier checks are required.

- [ ] Add minimal tests or script checks for `classify()`
- [ ] Verify `paid`
- [ ] Verify `partial`
- [ ] Verify `overpaid`
- [ ] Verify `duplicate`
- [ ] Verify `unknown`

No heavy test framework required if it slows development.

## 3.4 Solana Pay Utilities

Create:

`lib/solana-pay.ts`

Tasks:

- [ ] Generate reference public key using `Keypair.generate().publicKey`
- [ ] Store only public key as `reference_pubkey`
- [ ] Do not store private key
- [ ] Generate Solana Pay URL with recipient wallet
- [ ] Include human-readable USDC amount
- [ ] Include USDC mint from config
- [ ] Include reference public key
- [ ] Include label

---

# PHASE 4 — Minimal Expected Payment API + Solana Pay Link

## 4.1 POST /api/receivables

Create minimal version early.

File:

`app/api/receivables/route.ts`

Tasks:

- [ ] Implement `POST /api/receivables`
- [ ] Accept label, amount, due date
- [ ] Convert human-readable amount to raw USDC units
- [ ] Generate reference public key
- [ ] Generate Solana Pay URL
- [ ] Store expected amount in raw USDC units
- [ ] Insert expected payment into Supabase
- [ ] Return expected payment and Solana Pay URL

## 4.2 GET /api/receivables

Minimal list endpoint.

Tasks:

- [ ] Implement `GET /api/receivables`
- [ ] Return all expected payments
- [ ] Return linked transactions if available
- [ ] Compute overdue display status on read
- [ ] Do not write overdue status to DB

---

# PHASE 5 — Prove Solana Pay Reference Flow

Relevant acceptance criteria:

- Solana Pay Reference Flow

This is a critical proof.

Do not build UI polish before this works.

A temporary one-off method to send the payment is acceptable in this phase.
The formal reusable transfer script will be built in Phase 6.

Tasks:

- [ ] Create expected payment through `POST /api/receivables`
- [ ] Generate Solana Pay URL
- [ ] Send devnet USDC payment with reference
- [ ] Confirm transaction lands on devnet
- [ ] Confirm reference appears in transaction account keys
- [ ] Confirm recipient can be validated
- [ ] Confirm mint can be validated
- [ ] Confirm amount can be validated
- [ ] Confirm reference can be validated

If this fails, stop and fix before continuing.

---

# PHASE 6 — Scripted Fallback Transfer

## 6.1 Payer Wallet Setup

The script must sign transactions.

Tasks:

- [ ] Add `PAYER_KEYPAIR_PATH` as script-only env var
- [ ] Ensure payer wallet has devnet SOL
- [ ] Ensure payer wallet has devnet USDC
- [ ] Document how to fund payer wallet
- [ ] Confirm `PAYER_KEYPAIR_PATH` is not required by app runtime config

## 6.2 Build Transfer Script

Create:

`scripts/send-devnet-usdc.ts`

The script must support:

- [ ] Send devnet USDC from payer wallet to monitored wallet
- [ ] Optional reference public key
- [ ] Exact payment
- [ ] Partial payment
- [ ] Overpaid payment
- [ ] Raw transfer without reference
- [ ] ATA creation if missing

## 6.3 Script Commands

Add package scripts:

- [ ] Add command for exact/reference payment
- [ ] Add command for raw unknown transfer

Example command shape:

```bash
pnpm send:devnet-usdc --amount 100 --reference <reference_pubkey>
pnpm send:devnet-usdc --amount 75
```

## 6.4 Verify Script

- [ ] Test exact transfer with reference
- [ ] Test partial transfer with reference
- [ ] Test overpaid transfer with reference
- [ ] Test raw unknown transfer without reference

---

# PHASE 7 — Helius Raw Ingestion + Real Fixtures

Relevant acceptance criteria:

- Helius Webhook Ingestion
- Valid Incoming USDC Transfer

This phase creates a shell webhook implementation to prove Helius delivery and capture real payloads.

The full reusable ingestion pipeline will be extracted into `lib/ingest.ts` in Phase 9.

## 7.1 Webhook Endpoint Shell

Create:

`app/api/webhooks/helius/route.ts`

Tasks:

- [ ] Use Node runtime
- [ ] Accept POST requests
- [ ] Verify `Authorization` header equals `HELIUS_AUTH_TOKEN`
- [ ] Return 401 if token is invalid
- [ ] Return 200 quickly after valid processing

At this phase, raw ingestion is enough.

## 7.2 Helius Setup

- [ ] Deploy app to Vercel preview or expose local app with ngrok
- [ ] Create Helius `enhancedDevnet` webhook
- [ ] Monitor recipient wallet
- [ ] Monitor recipient USDC ATA
- [ ] Send test USDC transfer
- [ ] Confirm webhook payload arrives

## 7.3 Raw Payload Persistence

- [ ] Parse transaction signature
- [ ] Check if signature already exists
- [ ] Return 200 immediately if duplicate webhook delivery
- [ ] Store raw payload before classification
- [ ] Save real Helius payload fixture

## 7.4 Real Fixture Requirement

Fixtures must come from real Helius webhook payloads.

- [ ] Save fixtures from real Helius webhook payloads
- [ ] Do not handcraft fixtures unless clearly marked as mock/demo-only
- [ ] Store fixtures under `fixtures/helius/`

---

# PHASE 8 — Parser + RPC Fallback

Relevant acceptance criteria:

- USDC Transfer Parsing
- Reference Extraction
- RPC Fallback

## 8.1 Helius Parser

Create:

`lib/helius.ts`

Tasks:

- [ ] Parse USDC transfers from real Helius enhanced payload
- [ ] Extract signature
- [ ] Extract sender wallet
- [ ] Extract recipient wallet
- [ ] Extract mint
- [ ] Extract raw amount
- [ ] Extract timestamp
- [ ] Attempt to extract reference from account keys

## 8.2 Parser Fixture Check

Required.

- [ ] Run parser against saved Helius fixture
- [ ] Confirm signature extraction
- [ ] Confirm mint extraction
- [ ] Confirm amount extraction
- [ ] Confirm sender extraction
- [ ] Confirm recipient extraction
- [ ] Confirm reference extraction if present

## 8.3 RPC Fallback

Create:

`lib/rpc.ts`

Tasks:

- [ ] Implement `getTransaction(signature)`
- [ ] Use `maxSupportedTransactionVersion: 0`
- [ ] Extract message account keys
- [ ] Normalize account keys to base58
- [ ] Compare account keys against open expected payment references
- [ ] Return matched reference if found

## 8.4 Fallback Failure Handling

- [ ] If RPC fallback fails, classify as unknown
- [ ] Set reason: `Reference not found; RPC fallback failed`
- [ ] Do not crash webhook handler
- [ ] Always return 200 after storing raw payload

---

# PHASE 9 — Shared Ingestion Pipeline

Relevant acceptance criteria:

- Classification Flow
- Expected Payment Status Update Rules
- Replay Endpoint

Create:

`lib/ingest.ts`

This module must be used by both:

- `POST /api/webhooks/helius`
- `POST /api/dev/replay-webhook`

Tasks:

- [ ] Receive payload
- [ ] Extract signature
- [ ] Dedupe by signature
- [ ] Store raw payload
- [ ] Parse transfer
- [ ] Extract reference
- [ ] Run RPC fallback if needed
- [ ] Find matching expected payment
- [ ] Run classifier
- [ ] Update transaction
- [ ] Update expected payment status if matched
- [ ] Return classification result

Critical rule:

Do not duplicate ingestion logic in the replay endpoint.

---

# PHASE 10 — Remaining API Routes

Relevant acceptance criteria:

- Manual Resolution
- Proof Page

## 10.1 GET /api/receivables/[id]

- [ ] Return single expected payment
- [ ] Return transactions linked to it
- [ ] Return display status
- [ ] Do not query blockchain from UI route

## 10.2 POST /api/resolve

- [ ] Load unknown transaction
- [ ] Load selected expected payment
- [ ] Assign transaction to expected payment
- [ ] Re-run classifier
- [ ] Update transaction status and reason
- [ ] Update expected payment status using status rules

## 10.3 POST /api/dev/replay-webhook

- [ ] Require `DEV_SECRET`
- [ ] Accept saved Helius payload JSON
- [ ] Call shared ingestion pipeline
- [ ] Return resulting transaction status
- [ ] Do not expose this endpoint in production UI

---

# PHASE 11 — Minimal UI

Relevant acceptance criteria:

- Payment Inbox UI
- Proof Page

## 11.1 Payment Inbox

Route:

`/`

Must show:

- [ ] Needs attention
- [ ] Unknown
- [ ] Partial
- [ ] Overpaid
- [ ] Duplicate
- [ ] Paid
- [ ] Overdue

Rules:

- [ ] First screen must be inbox
- [ ] Do not start with create payment screen
- [ ] Do not add charts
- [ ] Do not add financial dashboard

## 11.2 Create Expected Payment

Route:

`/receivables/new`

Fields:

- [ ] Label
- [ ] Amount in USDC
- [ ] Due date

Actions:

- [ ] Create expected payment
- [ ] Show Solana Pay link
- [ ] Show reference public key

## 11.3 Expected Payment Detail

Route:

`/receivables/[id]`

Show:

- [ ] Label
- [ ] Expected amount
- [ ] Status
- [ ] Due date
- [ ] Solana Pay link
- [ ] Linked transactions
- [ ] Classification reasons

## 11.4 Manual Resolve UI

- [ ] Show unknown payment details
- [ ] Select expected payment
- [ ] Submit to `/api/resolve`
- [ ] Show updated classification

## 11.5 Proof Page

Route:

`/tx/[signature]`

Show:

- [ ] Transaction signature
- [ ] Amount
- [ ] Sender wallet
- [ ] Recipient wallet
- [ ] Status
- [ ] Classification reason
- [ ] Linked expected payment
- [ ] Solana Explorer link

---

# PHASE 12 — Replay + Demo Insurance

Relevant acceptance criteria:

- Replay Endpoint
- Deterministic Demo Path
- Demo Readiness

## 12.1 Saved Fixtures

Create:

`fixtures/helius/`

Fixtures:

- [ ] `exact-payment.json`
- [ ] `partial-payment.json`
- [ ] `overpaid-payment.json`
- [ ] `unknown-payment.json`
- [ ] `duplicate-payment.json`

These should come from real Helius payloads whenever possible.

## 12.2 Replay Tests

- [ ] Replay exact payment fixture
- [ ] Replay partial payment fixture
- [ ] Replay overpaid payment fixture
- [ ] Replay unknown payment fixture
- [ ] Replay duplicate payment fixture
- [ ] Confirm inbox updates from replayed data

---

# PHASE 13 — Pre-Demo Checklist

Relevant acceptance criteria:

- Replay Endpoint
- Deterministic Demo Path
- Demo Readiness

Before recording or submitting:

- [ ] Receiving wallet has devnet SOL
- [ ] Payer wallet has devnet SOL
- [ ] Payer wallet has devnet USDC
- [ ] Receiving wallet USDC ATA exists
- [ ] `RECIPIENT_WALLET` env var is correct
- [ ] `RECIPIENT_USDC_ATA` env var is correct
- [ ] Helius webhook points to live Vercel/ngrok URL
- [ ] Helius monitors wallet and USDC ATA
- [ ] Exact payment works
- [ ] Partial payment works
- [ ] Overpaid payment works
- [ ] Unknown transfer works
- [ ] Duplicate payment works
- [ ] Replay endpoint works
- [ ] Proof page works
- [ ] Demo can be completed in under 3 minutes

---

# PHASE 14 — README + Submission

## 14.1 README.md

- [ ] Explain what Clearline is
- [ ] Explain what problem it solves
- [ ] Explain why Solana matters
- [ ] Explain architecture at a high level
- [ ] Include setup instructions
- [ ] Include env var instructions
- [ ] Include demo instructions
- [ ] Include devnet/mainnet-ready note
- [ ] Include screenshots or GIFs only if already available

## 14.2 DEMO.md

Create:

`DEMO.md`

Include:

- [ ] Opening pain statement
- [ ] Exact payment scenario
- [ ] Partial payment scenario
- [ ] Overpaid payment scenario
- [ ] Unknown payment scenario
- [ ] Duplicate payment scenario
- [ ] Proof page
- [ ] Final one-liner

## 14.3 Video

- [ ] Record demo video under 3 minutes
- [ ] Show inbox first
- [ ] Do not frame as invoicing
- [ ] Emphasize classification
- [ ] Emphasize Solana Pay reference and onchain proof
- [ ] Keep explanation simple

---

# DO NOT BUILD

These are explicitly out of scope.

If an agent believes one of these is necessary, it must stop and ask before implementing.

Do not build:

- Auth / RLS
- Multi-wallet support
- Cron
- Email notifications
- CSV export
- AI features
- Custom smart contracts
- Mainnet deployment requirement
- Heuristic matching by amount + sender
- Invoice PDFs or invoice editor
- Accounting integrations
- Subscriptions
- Fiat rails / Pix
- Dashboards or charts
- Team permissions
- Refund workflows
- Cumulative partial payment accounting
- Production queue infrastructure

If a feature does not help classify incoming USDC transfers, do not build it.