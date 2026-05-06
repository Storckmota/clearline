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

- [x] Verify `AGENTS.md` exists
- [x] Verify `AGENTS.md` matches the approved agent operating rules
- [x] Verify `agents/implementation.md` exists
- [x] Verify `agents/code-review.md` exists
- [x] Verify `agents/qa-acceptance.md` exists
- [x] Verify `agents/security-review.md` exists
- [x] Verify `agents/handoff.md` exists
- [x] Verify `agents/colosseum-review.md` exists
- [x] Verify `agents/ux-ui-review.md` exists
- [x] Verify `PROJECT.md` exists
- [x] Verify `PROJECT.md` matches the approved product definition
- [x] Verify `SPEC.md` exists
- [x] Verify `SPEC.md` matches `PROJECT.md` and `ARCHITECTURE.md`
- [x] Verify `ARCHITECTURE.md` exists
- [x] Verify `ARCHITECTURE.md` matches the approved architecture
- [x] Verify `ACCEPTANCE_CRITERIA.md` exists
- [x] Verify `ACCEPTANCE_CRITERIA.md` matches `SPEC.md` and the critical path in `TASKS.md`
- [x] Verify `TASKS.md` exists
- [x] Verify `TASKS.md` is valid Markdown
- [x] Verify all core docs are consistent: `AGENTS.md`, `PROJECT.md`, `SPEC.md`, `ARCHITECTURE.md`, `ACCEPTANCE_CRITERIA.md`, `TASKS.md`
- [x] Verify `.env.local.example` exists
- [x] Verify `README.md` exists, even if placeholder

## 0.2 Project Scaffold

- [x] Verify `clearline/` project folder exists
- [x] Verify Git repository is initialized
- [x] Verify `package.json` exists
- [x] Verify Next.js project exists
- [x] Verify TypeScript config exists
- [x] Verify app runs locally
- [x] Verify Tailwind is configured only if included by scaffold

## 0.3 Current File Audit

- [x] Check which files already exist in `app/`
- [x] Check which files already exist in `lib/`
- [x] Check which files already exist in `scripts/`
- [x] Check which files already exist in `supabase/`
- [x] Check which files already exist in `types/`
- [x] Update this `TASKS.md` to mark only verified completed tasks as `[x]`

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

- [x] Create project folder `clearline`
- [x] Initialize Git repository
- [x] Create Next.js 15 project with TypeScript
- [x] Use App Router
- [x] Use Node runtime
- [x] Configure Tailwind CSS only if included by scaffold
- [x] Confirm project runs locally
- [ ] Commit initial scaffold

## 1.2 Required Documentation

- [x] Add `AGENTS.md`
- [x] Add `agents/implementation.md`
- [x] Add `agents/code-review.md`
- [x] Add `agents/qa-acceptance.md`
- [x] Add `agents/security-review.md`
- [x] Add `agents/handoff.md`
- [x] Add `agents/colosseum-review.md`
- [x] Add `agents/ux-ui-review.md`
- [x] Add `PROJECT.md`
- [x] Add `SPEC.md`
- [x] Add `ARCHITECTURE.md`
- [x] Add `ACCEPTANCE_CRITERIA.md`
- [x] Add `TASKS.md`
- [x] Add `.env.local.example`
- [x] Add initial `README.md` placeholder

## 1.3 Dependencies

Install only necessary dependencies:

- [x] Install `@solana/web3.js`
- [x] Install `@solana/pay`
- [x] Install `@solana/spl-token`
- [x] Install `@supabase/supabase-js`
- [x] Install `bignumber.js`

Do not add unnecessary UI, auth, analytics, or backend frameworks.

---

# PHASE 2 — Config + Database

## 2.1 Environment Configuration

Create:

`lib/config.ts`

Tasks:

- [x] Read all app runtime config from `lib/config.ts`
- [x] Validate required app runtime env vars at startup (Note: Validation is lazy-on-access to prevent scaffold build failure without .env.local)
- [x] Ensure app does not read `process.env` directly across multiple files
- [x] Export typed config object

App runtime env vars:

- [x] `SUPABASE_URL`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `SOLANA_NETWORK`
- [x] `SOLANA_RPC_URL`
- [x] `RECIPIENT_WALLET` (optional dev/demo fallback — connected wallet is primary)
- [x] `RECIPIENT_USDC_ATA` (optional dev/demo fallback — ATA is derived dynamically)
- [x] `USDC_MINT_DEVNET`
- [x] `USDC_MINT_MAINNET`
- [x] `HELIUS_AUTH_TOKEN`
- [x] `DEV_SECRET`

Script-only env vars:

- [x] `PAYER_KEYPAIR_PATH`

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

- [x] Add `.env.local.example`
- [x] Keep all values empty except static mint values
- [x] Do not commit `.env.local`
- [x] Document that `PAYER_KEYPAIR_PATH` is script-only

## 2.3 Supabase Setup

- [ ] Create Supabase project
- [x] Create `supabase/migrations/001_init.sql` (Note: Created as `20260503000000_init.sql` — Supabase CLI requires timestamped filenames; `001_init.sql` is not a valid CLI migration name)
- [x] Create `receivables` table
- [x] Create `transactions` table
- [x] Add unique index on `transactions.signature`
- [x] Add index on `transactions.receivable_id`
- [x] Add index on `receivables.reference_pubkey`
- [x] Confirm migration runs successfully

## 2.4 Supabase Client

Create:

`lib/supabase.ts`

Tasks:

- [x] Use service role key server-side only
- [x] Do not expose service role key to client
- [x] Do not add auth
- [x] Do not add RLS

## 2.5 Architecture Correction — Merchant Wallet Model

The connected wallet is the merchant wallet. `RECIPIENT_WALLET` and `RECIPIENT_USDC_ATA` are no longer required app runtime config.

Completed corrections:

- [x] `lib/config.ts`: `RECIPIENT_WALLET` changed from `requireEnv` to `optionalEnv`
- [x] `lib/config.ts`: `RECIPIENT_USDC_ATA` changed from `requireEnv` to `optionalEnv`
- [x] `.env.local.example`: both marked as optional dev/demo fallback
- [x] `ARCHITECTURE.md`: updated schema, Solana Pay flow, Helius flow, env vars
- [x] `SPEC.md`: updated valid transfer definition and assumptions
- [x] New migration: `supabase/migrations/20260503000001_add_merchant_wallet.sql`
  - `merchant_wallet text NOT NULL` added to `receivables`
  - `CHECK (merchant_wallet <> '')` constraint added
  - `receivables_merchant_wallet_idx` index added

Not yet implemented (future tasks):

- [x] Wallet adapter integration (connects merchant wallet)
- [x] Dynamic ATA derivation (utility + display proof)
- [x] Solana Pay URL generation (recipient = merchant wallet; derived ATA displayed as proof only)
- [ ] Ingestion pipeline uses `receivable.merchant_wallet` for recipient validation
- [x] Apply migration `20260503000001_add_merchant_wallet.sql` to remote database

Risks:

- Helius webhooks monitor specific wallet addresses configured in the dashboard. If the connected wallet differs from the Helius-configured wallet, webhook delivery will not occur. For MVP demo, configure Helius to monitor the demo wallet. Future enhancement: use Helius API to dynamically manage monitored addresses.

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

- [x] Convert human-readable USDC to raw base units
- [x] Convert raw base units to human-readable USDC
- [x] Avoid floating point comparisons
- [x] Use USDC 6 decimals
- [x] Add basic checks for amount conversion

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

- [x] Implement `paid`
- [x] Implement `partial`
- [x] Implement `overpaid`
- [x] Implement `duplicate`
- [x] Implement `unknown`

Rules, in order:

- [x] No receivable → `unknown`
- [x] Receivable already paid → `duplicate`
- [x] Exact amount → `paid`
- [x] Less than expected → `partial`
- [x] More than expected → `overpaid`

Every classification must include `classification_reason`.

Required example reasons:

- [x] `Exact match: expected 100 USDC, received 100 USDC, reference matched.`
- [x] `Partial: expected 100 USDC, received 60 USDC, reference matched.`
- [x] `Unknown: no matching Solana Pay reference found.`
- [x] `Duplicate: expected payment already marked paid.`

## 3.3 Classifier Checks

Classifier checks are required.

- [x] Add minimal tests or script checks for `classify()`
- [x] Verify `paid`
- [x] Verify `partial`
- [x] Verify `overpaid`
- [x] Verify `duplicate`
- [x] Verify `unknown`

No heavy test framework required if it slows development.

## 3.4 Solana Pay Utilities

Create:

`lib/solana-pay.ts`

Tasks:

- [x] Generate reference public key using `Keypair.generate().publicKey`
- [x] Store only public key as `reference_pubkey`
- [x] Do not store private key
- [x] Generate Solana Pay URL with recipient wallet
- [x] Include human-readable USDC amount
- [x] Include USDC mint from config
- [x] Include reference public key
- [x] Include label

---

# PHASE 4 — Minimal Expected Payment API + Solana Pay Link

## 4.1 POST /api/receivables

Create minimal version early.

File:

`app/api/receivables/route.ts`

Tasks:

- [x] Implement `POST /api/receivables`
- [x] Accept label, amount, due date
- [x] Convert human-readable amount to raw USDC units
- [x] Generate reference public key
- [x] Generate Solana Pay URL
- [x] Store expected amount in raw USDC units
- [x] Insert expected payment into Supabase
- [x] Return expected payment and Solana Pay URL

## 4.2 GET /api/receivables

Minimal list endpoint.

Tasks:

- [x] Implement `GET /api/receivables`
- [x] Return all expected payments
- [x] Return linked transactions if available
- [x] Compute overdue display status on read
- [x] Do not write overdue status to DB

---

# PHASE 5 — Prove Solana Pay Reference Flow

Relevant acceptance criteria:

- Solana Pay Reference Flow

This is a critical proof.

Do not build UI polish before this works.

A temporary one-off method to send the payment is acceptable in this phase.
The formal reusable transfer script will be built in Phase 6.

Tasks:

- [x] Create expected payment through `POST /api/receivables`
- [x] Generate Solana Pay URL
- [x] Send devnet USDC payment with reference
- [x] Confirm transaction lands on devnet
- [x] Confirm reference appears in transaction account keys
- [x] Confirm recipient can be validated
- [x] Confirm mint can be validated
- [x] Confirm amount can be validated
- [x] Confirm reference can be validated

Task completed:
- Task: Phase 5 — Prove Solana Pay Reference Flow (Part B on-chain verification)
- Signature: 4ru1z7D6QDDeFqSbhoqdArmHZxfLcSjy3MgnVjX8EFcVKZLJ16Nyj2fmKcWWkrNin1j8oZUWwnYMb9rMaim6yC1h
- Slot: 459968305 (devnet, confirmed)
- Changed files: TASKS.md only
- Acceptance criteria checked: Solana Pay Reference Flow
- Verification: temporary script ran getParsedTransaction; confirmed no error, reference 6Ewg3HAvUugGHAGYyWsgdCt1brYQn733m2kyGAL6nNpK in account keys [6], payer in keys [0], merchant owner in postTokenBalances acctIdx=1, mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU, amount delta = 10000 raw (0.01 USDC)
- Behavior unverified: none
- Blockers: none

If this fails, stop and fix before continuing.

---

# PHASE 6 — Scripted Fallback Transfer

## 6.1 Payer Wallet Setup

The script must sign transactions.

Tasks:

- [x] Add `PAYER_KEYPAIR_PATH` as script-only env var (present in `.env.local.example`; read directly by script via `process.env` — not in `lib/config.ts`)
- [x] Ensure payer wallet has devnet SOL (confirmed: script ran without SOL error; payer `EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V`)
- [x] Ensure payer wallet has devnet USDC (confirmed: script ran all 4 transfers without USDC error; started at 0.05 USDC)
- [x] Document how to fund payer wallet (documented below)
- [x] Confirm `PAYER_KEYPAIR_PATH` is not required by app runtime config (verified: absent from `lib/config.ts`; `npm run build` passes without it)

How to fund payer wallet (for Pass B):
- Generate keypair: `solana-keygen new --outfile payer-keypair.json --no-bip39-passphrase`
- Set in `.env.local`: `PAYER_KEYPAIR_PATH=./payer-keypair.json`
- Fund SOL: `solana airdrop 2 <pubkey> --url devnet`
- Fund USDC: use devnet USDC faucet or transfer from a funded devnet wallet
- Note: `payer-keypair.json` is already covered by `.gitignore` patterns `payer-keypair.json` and `*keypair*.json`

## 6.2 Build Transfer Script

Create:

`scripts/send-devnet-usdc.ts`

The script must support:

- [x] Send devnet USDC from payer wallet to recipient wallet (verified by on-chain run — Pass B)
- [x] Optional reference public key (`--reference <pubkey>` flag; omitting produces raw unknown transfer)
- [x] Exact payment (CLI: `--amount <exact> --reference <ref>`)
- [x] Partial payment (CLI: `--amount <less_than_expected> --reference <ref>`)
- [x] Overpaid payment (CLI: `--amount <more_than_expected> --reference <ref>`)
- [x] Raw transfer without reference (CLI: `--amount <n>` with no `--reference`)
- [x] ATA creation if missing (explicit `createAssociatedTokenAccountInstruction` prepended when recipient ATA absent)

## 6.3 Script Commands

Add package scripts:

- [x] Add command for exact/reference payment (`npm run send:devnet-usdc -- --recipient <wallet> --amount <n> --reference <ref>`)
- [x] Add command for raw unknown transfer (`npm run send:devnet-usdc -- --recipient <wallet> --amount <n>`)

Package script added: `"send:devnet-usdc": "tsx scripts/send-devnet-usdc.ts"`

## 6.4 Verify Script

- [x] Test exact transfer with reference
- [x] Test partial transfer with reference
- [x] Test overpaid transfer with reference
- [x] Test raw unknown transfer without reference

Task completed (Pass B):
- Task: Phase 6.2 + 6.4 — On-chain execution and verification
- Changed files: TASKS.md only (script unchanged)
- Acceptance criteria checked: Scripted Fallback Transfer
- Payer: EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V
- Exact:    5NWyaitmbFKrNsJ5ZPfLdfVec2dHAnJGN5ckV9Laq6bE2VkJxzN4qS1WKt3KCn9v5DkqhC3UfMfbx9Jt9LxcyEPa
- Partial:  4NWU8KwEtyNyyyJEie1JWLNg1N51ejctakHUaWEpjpusPzE39D7MggkYRiSassL6DVwVPReiKwBTD22Nqy7kX4o9
- Overpaid: 2e1hvrHyyjGiCXqTFx7djjxYFu2JiHa5ETwFuWJarPZwg8ckpNVjJ33Y4HEaicMFu1xbLrU61ssc33kHF7QWb7rH
- Raw unknown: 2Z5aq2WJrJpbDyHuG9d7HhiGjx3Bn69PV6TjgzZrM4PUiC7bhuobe5ocybWeDugz9mtWCfy8p6A72gDB8GQePLky
- Verification: 24/24 checks passed (tx existence, no error, mint, merchant wallet, amount, reference present/absent)
- Behavior unverified: none
- Blockers: none

Task completed (Pass A):
- Task: Phase 6.1 + 6.2 + 6.3 — Script implementation
- Changed files: scripts/send-devnet-usdc.ts (created), package.json (send:devnet-usdc script added)
- Acceptance criteria checked: Scripted Fallback Transfer (static only — execution pending Pass B)
- Verification: npm run check:classifier (18/18), npm run lint (clean), npm run build (pass + type-check)
- PAYER_KEYPAIR_PATH: absent from lib/config.ts, script reads process.env directly
- Forbidden imports: lib/config.ts, lib/solana/mint.ts, lib/supabase.ts — none imported by script
- ATA creation: explicit (createTransfer from @solana/pay does NOT create recipient ATA — verified by reading source)
- Reference: added as readonly non-signer key on transferChecked instruction
- Behavior unverified: actual on-chain transfer execution (Pass B)
- Blockers: payer wallet must be funded before Pass B

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

- [x] Use Node runtime
- [x] Accept POST requests
- [x] Verify `Authorization` header equals `HELIUS_AUTH_TOKEN`
- [x] Return 401 if token is invalid
- [x] Return 200 quickly after valid processing

At this phase, raw ingestion is enough.

Task completed:
- Task: 7.1 Webhook Endpoint Shell
- Phase: 7
- Changed files:
  - app/api/webhooks/helius/route.ts (created)
- Acceptance criteria checked:
  - Helius Webhook Ingestion (§8): Node runtime, POST only, auth header check, 401 on bad token, 200 on valid
- Verification:
  - npx tsc --noEmit — clean
  - npm run lint — clean
  - npm run build — passes; route appears as ƒ /api/webhooks/helius
- Behavior unverified:
  - Real Helius payload delivery (requires Phase 7.2 — Vercel/ngrok + Helius dashboard config)
- Blockers:
  - None for 7.1; Phase 7.2 requires live deployment
- TASKS.md updated: yes

## 7.2 Helius Setup

- [x] Deploy app to Vercel preview or expose local app with ngrok
- [x] Create Helius `enhancedDevnet` webhook
- [x] Monitor recipient wallet
- [x] Monitor recipient USDC ATA
- [x] Send test USDC transfer
- [x] Confirm webhook payload arrives

Task completed:
- Task: 7.2 Helius Setup
- Phase: 7
- Changed files: TASKS.md only
- Verification:
  - Vercel deployment live: https://clearline-lovat.vercel.app/api/webhooks/helius
  - Helius enhancedDevnet webhook delivered POST to live endpoint
  - Vercel logs confirm: POST 200 /api/webhooks/helius
  - Structured log confirmed: isArray=true count=1 size=2245B
  - Real Devnet transfer signature: 3oZvdsxvWUeSwQyWMgeu77b7Au9UmUrGJEP97qEpF528qafUSrwaNfqfDV5qPCQgeEVFUj2K96rpFRU3AZDQK2Gw
  - Merchant wallet: 4imzXJrDPSPjdHoo48izKv7K92PxcwCUiZHLZhgAGGBG
  - Merchant USDC ATA: CaUARQQrc4umBbq8ewYQkkhovgJLKCw1LHdeM6Hrbv6F
  - Helius monitors both merchant wallet and merchant USDC ATA
  - Transfer triggered via scripted Devnet path (npm run send:devnet-usdc)
- Notes:
  - Phantom mobile Solana Pay flow is unreliable on Devnet and must not be treated as backend source of truth for testing
  - Scripted transfer path (scripts/send-devnet-usdc.ts) is the verified trigger for all Devnet webhook tests
  - Payer: EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V
  - Merchant wallet: 4imzXJrDPSPjdHoo48izKv7K92PxcwCUiZHLZhgAGGBG
  - Merchant USDC ATA: CaUARQQrc4umBbq8ewYQkkhovgJLKCw1LHdeM6Hrbv6F
- Behavior unverified:
  - Raw payload not yet stored (Phase 7.3)
  - Real fixture not yet saved (Phase 7.4)
- Blockers: none

## 7.3 Raw Payload Persistence

- [x] Parse transaction signature
- [x] Check if signature already exists
- [x] Return 200 immediately if duplicate webhook delivery
- [x] Store raw payload before classification
- [x] Save real Helius payload fixture (fulfilled by Phase 7.4 — fixtures/helius/raw-capture.json)

Note (storage deferral, now resolved):
- raw_payload insertion was deferred because transactions required parsed recipient_wallet, amount_raw,
  and mint from Phase 8 parser. Resolved in Phase 9 via lib/ingest.ts.
- "Store raw payload before classification" and "Save real Helius payload fixture" carried forward to Phase 8/9.

Task completed (all 5 of 5 — carry-forward items verified by Phase 9 live run):
- Task: 7.3 Raw Payload Persistence
- Phase: 7
- Changed files:
  - app/api/webhooks/helius/route.ts (updated — signature extraction, dedupe query, safe logging)
- Acceptance criteria checked:
  - Helius Webhook Ingestion (§8): signature extracted and dedupe check implemented against transactions table
- Verification:
  - npm run check:classifier — 18/18 passed
  - npm run lint — clean
  - npm run build — passes; ƒ /api/webhooks/helius confirmed
  - Live: duplicate delivery returned 200, log showed "Duplicate signature", row count stayed at 1
  - Live: raw_payload stored in Supabase before classification (confirmed in Phase 9 verification)
- Blockers: none

## 7.4 Real Fixture Requirement

Fixtures must come from real Helius webhook payloads.

- [x] Save fixtures from real Helius webhook payloads
- [x] Do not handcraft fixtures unless clearly marked as mock/demo-only
- [x] Store fixtures under `fixtures/helius/`

Task completed:
- Task: 7.4 Real Fixture Requirement
- Phase: 7
- Changed files: fixtures/helius/raw-capture.json (created externally via ngrok capture)
- Verification:
  - Captured via real Helius enhancedDevnet webhook delivery through ngrok local tunnel
  - JSON validity confirmed: node -e "JSON.parse(...)" → valid json
  - Secret/header scan: no matches for Authorization, Bearer, POST /api, HTTP/1.1, Host:, Content-Type, X-Forwarded
  - Fixture contains only the JSON body — no HTTP headers, no Authorization token
  - Fixture signature: 3oSgDJPbUCo5TNcj98hck2gBJ41JPrBR7WmPBuVy9GSmB6THkkRPD1Pg9itT8ecgPmGFFM2JMgDt9Vwc2pKuNwiS
  - Fixture represents a real Devnet USDC transfer to merchant wallet 4imzXJrDPSPjdHoo48izKv7K92PxcwCUiZHLZhgAGGBG
  - Merchant USDC ATA: CaUARQQrc4umBbq8ewYQkkhovgJLKCw1LHdeM6Hrbv6F
- Behavior unverified:
  - Fixture has not yet been run through Phase 8 parser (lib/helius.ts — not yet built)
- Blockers: none

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

- [x] Parse USDC transfers from real Helius enhanced payload
- [x] Extract signature
- [x] Extract sender wallet
- [x] Extract recipient wallet
- [x] Extract mint
- [x] Extract raw amount (from accountData rawTokenAmount.tokenAmount string — never float)
- [x] Extract timestamp
- [x] Attempt to extract reference from account keys

Verified: `npm run check:parser` — 27 passed, 0 failed. `npm run lint` clean. `npx tsc --noEmit` clean. `npm run build` clean. Parser iterates all items in payload array (not only index 0).

## 8.2 Parser Fixture Check

Required.

- [x] Run parser against saved Helius fixture
- [x] Confirm signature extraction (3oSgDJPbUCo5TNcj98hck2gBJ41JPrBR7WmPBuVy9GSmB6THkkRPD1Pg9itT8ecgPmGFFM2JMgDt9Vwc2pKuNwiS)
- [x] Confirm mint extraction (4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
- [x] Confirm amount extraction (BigInt(1000) from string "1000", not float 0.001)
- [x] Confirm sender extraction (EqEsgzFfhxfUmEatpZduT6D9A3oJMv9DdZUWbZcubg9V)
- [x] Confirm recipient extraction (4imzXJrDPSPjdHoo48izKv7K92PxcwCUiZHLZhgAGGBG)
- [x] Confirm reference extraction — empty array (no reference in fixture; wrong mint / wrong recipient / malformed all return null)

Verified: `npm run check:parser` — 27 passed, 0 failed. Created `scripts/check-parser.ts`. Added `check:parser` to `package.json`. Batch tests confirm parser skips invalid/wrong-mint items and finds valid transfer in any array position.

## 8.3 RPC Fallback

Create:

`lib/rpc.ts`

Tasks:

- [x] Implement `getTransactionAccountKeys(signature, rpcUrl)` — pure module, rpcUrl provided by caller
- [x] Use `maxSupportedTransactionVersion: 0`
- [x] Extract message account keys — supports `message.staticAccountKeys` (v0) and `message.accountKeys` (legacy)
- [x] Include `meta.loadedAddresses.writable` + `.readonly` (Address Lookup Table keys)
- [x] Normalize account keys to base58 via `.toBase58()`
- [x] Deduplicate keys preserving insertion order
- [x] Compare account keys against open expected payment references via `findReferenceMatch(accountKeys, candidateReferences)`
- [x] Return matched reference if found — first matching candidate wins; null if none

Verified: `npm run check:rpc` — 30 passed, 0 failed, 0 skipped.
Live RPC smoke check: devnet fixture signature confirmed — `EqEsgzFf…` (payer), `CaUARQQr…` (merchant ATA), `4zMMC9sr…` (USDC mint) all present. No reference in raw transfer (null match) confirmed. `npm run lint` clean. `npx tsc --noEmit` clean. `npm run build` clean.

Note: merchant wallet `4imzXJrD…` is the ATA owner but does NOT appear in the transaction message account keys for SPL token transfers — only the ATAs and payer appear. The `toUserAccount` in Helius enhanced payload is derived by Helius, not present as a raw account key in the transaction message.

## 8.4 Fallback Failure Handling

- [x] If RPC fallback fails, classify as unknown
- [x] Set reason: `Reference not found; RPC fallback failed`
- [x] Do not crash webhook handler
- [x] Always return 200 after storing raw payload

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

- [x] Receive payload
- [x] Extract signature
- [x] Dedupe by signature
- [x] Store raw payload
- [x] Parse transfer
- [x] Extract reference
- [x] Run RPC fallback if needed
- [x] Find matching expected payment
- [x] Run classifier
- [x] Update transaction
- [x] Update expected payment status if matched
- [x] Return classification result

Critical rule:

Do not duplicate ingestion logic in the replay endpoint.

Implementation notes (live verification completed for unknown/RPC-failure, duplicate-signature, matched-reference paid, and receivable-update paths):
- lib/ingest.ts created; app/api/webhooks/helius/route.ts delegates to ingest()
- extractSignatureFromPayload iterates all payload items (batch-safe)
- Insert maps to actual transactions schema columns only (no recipient_token_account/decimals/slot/timestamp)
- observed_at mapped from parsed.timestamp * 1000 as ISO string
- ingest() never throws; route wraps in try/catch for additional safety
- Schema-aligned, lint-clean, tsc-clean, build-clean as of Codex fix pass

Verified paths (live Supabase + ngrok):
- Unknown/no-reference path: transaction stored with raw_payload, status unknown, reason "Reference not found; RPC fallback failed"
- Duplicate signature path: second delivery returned duplicate_sig and row count stayed at 1
- Matched reference paid path: transaction status paid, reference_pubkey and receivable_id populated, raw_payload stored
- Receivable update: receivable status changed from pending to paid
- Business duplicate end-to-end remains unverified — payer had 0 USDC at time of verification; transfer could not be sent

---

# PHASE 10 — Remaining API Routes

Relevant acceptance criteria:

- Manual Resolution
- Proof Page

## 10.1 GET /api/receivables/[id]

- [x] Return single expected payment
- [x] Return transactions linked to it
- [x] Return display status
- [x] Do not query blockchain from UI route

Task completed:
- Task: 10.1 GET /api/receivables/[id]
- Phase: 10
- Changed files:
  - app/api/receivables/[id]/route.ts (created)
- Acceptance criteria checked:
  - Manual Resolution (detail route prerequisite): returns receivable + linked transactions + display_status from Supabase only
  - Proof Page (data source): no blockchain/RPC call; all fields from DB
- Verification:
  - npm run check:classifier — 18/18 passed
  - npm run check:parser — 27/27 passed
  - npm run check:rpc — 30/30 passed
  - npm run lint — clean
  - npx tsc --noEmit — clean
  - npm run build — clean; ƒ /api/receivables/[id] confirmed in route table
  - Manual: GET /api/receivables/e6c4dfa8-f19e-4a73-901c-b5d04bf3ee5f → 200, receivable status=paid, display_status=paid, 1 linked transaction ✓
  - Manual: GET /api/receivables/00000000-0000-0000-0000-000000000000 → 404 ✓
- Behavior unverified:
  - Production deployment not yet verified for this route
  - display_status=overdue path (requires a receivable with pending status + past due_date)
- Blockers:
  - none
- Key design notes:
  - display_status computed on read; overdue never written to DB
  - transactions extracted from Supabase embedded relation and sorted newest-first in JS
  - malformed UUID → 400 via Supabase error code 22P02

## 10.2 POST /api/resolve

- [x] Load unknown transaction
- [x] Load selected expected payment
- [x] Assign transaction to expected payment
- [x] Re-run classifier
- [x] Update transaction status and reason
- [x] Update expected payment status using status rules

Task completed:
- Task: 10.2 POST /api/resolve
- Phase: 10
- Changed files:
  - app/api/resolve/route.ts (created)
- Acceptance criteria checked:
  - Manual Resolution: auth (x-dev-secret), field validation, transaction load, status guard, receivable load, classify(), tx update, receivable update rules
- Verification:
  - npm run check:classifier — 18/18 passed
  - npm run lint — clean
  - npm run build — clean; ƒ /api/resolve confirmed in route table
  - Manual: no x-dev-secret → 401 ✓
  - Manual: wrong x-dev-secret → 401 ✓
  - Manual: missing fields → 400 ✓
  - Manual: malformed UUID → 400 ✓
  - Manual: non-existent transaction_id → 404 ✓
  - Manual: non-existent receivable_id (with valid unknown tx) → 404 ✓
  - Manual: non-unknown transaction → 400 ✓
  - Manual: unknown tx (amount_raw=1000) + pending receivable (expected=1000) → 200, status=paid, reason="Exact match…" ✓
  - DB verified: transaction.status=paid, transaction.receivable_id set, transaction.reference_pubkey set, receivable.status=paid ✓
- Behavior unverified:
  - Partial path (no unknown tx available in DB at time of verification)
  - Overpaid path (no unknown tx available in DB at time of verification)
  - Duplicate path (paid receivable → duplicate) (no unknown tx available in DB at time of verification)
- Blockers: none
- Key design notes:
  - Reuses classify() from lib/classify.ts — no logic duplicated
  - Receivable status updated only for paid/partial/overpaid; not for duplicate or unknown
  - config.DEV_SECRET access wrapped in try/catch: unconfigured → 401, not 500
  - Malformed UUID caught via Supabase error code 22P02 → 400
  - No stack traces, no secrets logged, no request body logged
  - Response status type uses ClassifyStatus — all 5 statuses (paid/partial/overpaid/duplicate/unknown) are allowed

## 10.3 POST /api/dev/replay-webhook

- [x] Require `DEV_SECRET`
- [x] Accept saved Helius payload JSON
- [x] Call shared ingestion pipeline
- [x] Return resulting transaction status
- [x] Do not expose this endpoint in production UI

Task completed:
- Task: 10.3 POST /api/dev/replay-webhook
- Phase: 10
- Changed files:
  - app/api/dev/replay-webhook/route.ts (created)
- Acceptance criteria checked:
  - Replay Endpoint: requires DEV_SECRET, calls shared ingest(), returns IngestResult, no UI exposure
- Verification:
  - npm run check:classifier — 18/18 passed
  - npm run check:parser — 27/27 passed
  - npm run check:rpc — 30/30 passed
  - npm run lint — clean
  - npx tsc --noEmit — clean
  - npm run build — clean; ƒ /api/dev/replay-webhook confirmed in route table
  - Manual: no x-dev-secret → 401 ✓
  - Manual: wrong x-dev-secret → 401 ✓
  - Manual: correct DEV_SECRET + fixtures/helius/raw-capture.json → 200, status=duplicate_sig, signature=3oSgDJPbUCo5… ✓
  - DEV_SECRET is required in .env.local; value not recorded here
  - Production (clearline-lovat.vercel.app): no secret → 401 ✓
  - Production (clearline-lovat.vercel.app): wrong secret → 401 ✓
  - Production (clearline-lovat.vercel.app): correct DEV_SECRET + fixture → 200, status=duplicate_sig, signature=3oSgDJPbUCo5… ✓
- Behavior unverified:
  - none
- Blockers:
  - none
- Key design notes:
  - Calls ingest(payload) — no duplicated ingestion logic
  - config.DEV_SECRET access wrapped in try/catch: unconfigured secret returns 401, not 500
  - Logs status and truncated signature only — no payload, no secret
  - Returns 500 on unexpected ingest() throw (unlike Helius webhook which always returns 200)

---

# PHASE 11 — Minimal UI

Relevant acceptance criteria:

- Payment Inbox UI
- Proof Page

## 11.1 Payment Inbox

Route:

`/`

Must show:

- [x] Needs attention
- [x] Unknown
- [x] Partial
- [x] Overpaid
- [x] Duplicate
- [x] Paid
- [x] Overdue

Rules:

- [x] First screen must be inbox
- [x] Do not start with create payment screen
- [x] Do not add charts
- [x] Do not add financial dashboard

Task completed:
- Task: 11.1 Payment Inbox
- Phase: 11
- Changed files:
  - app/page.tsx (full replacement — dev scaffold → Payment Inbox)
  - app/api/receivables/route.ts (GET extended: added orphan_transactions field)
- Acceptance criteria checked:
  - Payment Inbox UI: first screen is inbox, WalletMultiButton, all 7 status sections present, no charts, no dashboard
- Verification:
  - npm run check:classifier — 18/18 passed
  - npm run lint — clean
  - npm run build — clean; / is static, ƒ /api/receivables confirmed
  - Manual: GET /api/receivables without wallet param → 400 ✓
  - Manual: GET /api/receivables?merchant_wallet=4imzXJrD… → 200, includes receivables (3) and orphan_transactions (0) ✓
  - Manual: orphan_transactions present, raw_payload absent from all transaction rows ✓
  - Manual: no broken links in HTML (no /receivables or /tx hrefs in page shell) ✓
  - Manual: page HTML loads with wallet adapter scripts ✓
- Behavior unverified due to current DB state:
  - Partial section (no partial receivables in DB; section renders at count=0 → not shown, which is correct)
  - Overpaid section (no overpaid receivables in DB)
  - Duplicate section (no duplicate transactions in DB at time of verification)
  - Unknown section (no orphan transactions in DB; was resolved to paid in 10.2 verification)
  - Overdue section (no pending receivables with past due_date in DB)
  - Needs Attention header (would show if any of the above existed; logic is present)
  - Paid section renders with data: 2 paid receivables in DB ✓
  - Pending section renders with data: 1 pending receivable in DB ✓
- Key design notes:
  - amount display uses BigInt arithmetic only — no float math, ES2017 compatible
  - Section component returns null when count=0 — empty sections not rendered
  - No links to /receivables/new or /receivables/[id] (not yet implemented)
  - orphan_transactions: ATA derivation uses getUsdcMint() (network-aware, not hardcoded); gracefully degrades to wallet-only query if derivation fails
  - Needs Attention groups Unknown/Partial/Overpaid/Duplicate as sub-sections (no duplication)
  - Overdue/Paid/Pending are standalone sections
- Blockers: none

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