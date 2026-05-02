# ACCEPTANCE_CRITERIA.md — Clearline MVP

## 1. Purpose

This file defines the acceptance criteria for Clearline MVP.

A task is not complete just because code exists.

A task is complete only when the expected behavior is verified against these criteria.

This file exists to prevent:

- incomplete implementation
- AI agents marking work as done too early
- broken demo flows
- incorrect payment classification
- inconsistent status handling
- scope creep

---

## 2. Global Definition of Done

A feature or task is considered done only if:

- implementation matches `PROJECT.md`
- implementation matches `SPEC.md`
- implementation matches `ARCHITECTURE.md`
- related checklist items in `TASKS.md` are completed
- relevant acceptance criteria in this file pass
- no forbidden scope was added

If acceptance criteria fail, the task is not done.

---

## 3. Product Invariants

Clearline must always preserve these invariants:

- classify only incoming USDC transfers to the monitored wallet or monitored USDC ATA
- never classify non-USDC transfers
- never guess matches by sender wallet or amount
- match automatically only by Solana Pay reference
- allow manual resolution for unknown payments
- store valid incoming transfer payloads before classification
- preserve raw payload, signature, and extracted transfer data when RPC fallback fails
- provide a human-readable `classification_reason` for every stored transaction
- keep UI reads based on Supabase, not live RPC
- keep `overdue` as display-only
- never treat `overdue` as an onchain event
- never require the user to open an explorer to understand a classification

---

## 4. Status Model

### Expected Payment Statuses

Expected payment statuses are:

- `pending`
- `paid`
- `partial`
- `overpaid`

### Transaction Statuses

Transaction statuses are:

- `paid`
- `partial`
- `overpaid`
- `duplicate`
- `unknown`

### Display-Only Statuses

`overdue` is display-only.

It is not a transaction status.

It is not persisted as a transaction classification.

It must never overwrite:

- `paid`
- `partial`
- `overpaid`
- `duplicate`
- `unknown`

### Status Separation Rules

- `unknown` is a transaction status only.
- `duplicate` is a transaction status only.
- `overdue` is a display state only.
- Expected payments must not be updated to `unknown`.
- Expected payments must not be updated to `duplicate`.
- Transactions must not be updated to `overdue`.

---

## 5. Valid Incoming USDC Transfer

### Goal

Clearline must only ingest relevant incoming USDC transfers.

### Acceptance Criteria

A transfer is valid for Clearline ingestion only if:

- [ ] it is a token transfer
- [ ] mint equals the configured USDC mint for the active network
- [ ] recipient is the monitored wallet or monitored USDC ATA
- [ ] amount is greater than zero
- [ ] transaction signature exists

Non-USDC transfers and transfers not sent to the monitored wallet or monitored USDC ATA are ignored for MVP.

If a webhook payload contains no valid incoming USDC transfer:

- [ ] Clearline returns success
- [ ] Clearline does not create a transaction record
- [ ] Clearline does not classify anything
- [ ] Clearline does not crash

### Failure Conditions

This fails if:

- non-USDC transfers are classified
- transfers to unrelated wallets are stored
- zero-amount transfers are classified
- payloads without relevant transfers create transaction records
- irrelevant payloads crash the webhook handler

---

## 6. Amount Handling

### Goal

Clearline must compare USDC amounts safely and deterministically.

### Acceptance Criteria

- [ ] Expected payment amount is stored in raw USDC base units.
- [ ] Incoming transaction amount is stored in raw USDC base units.
- [ ] All classification comparisons use integer raw base units only.
- [ ] Human-readable decimal amounts are used only for UI display and Solana Pay URL generation.
- [ ] Floating point comparison is never used for classification.
- [ ] USDC decimals are handled as 6 decimals.

### Failure Conditions

This fails if:

- amount comparison uses floating point values
- human-readable decimal strings are treated as source of truth
- raw amount conversion is inconsistent
- `100 USDC` is not stored as `100000000`

---

## 7. Solana Pay Reference Flow

### Goal

Clearline must generate an expected payment with a valid Solana Pay reference that can be used to match incoming payments.

### Acceptance Criteria

- [ ] Creating an expected payment generates a valid Solana public key reference.
- [ ] The reference is generated using `Keypair.generate().publicKey`.
- [ ] The reference is stored as `reference_pubkey`.
- [ ] Only the public key is stored.
- [ ] No private key is stored.
- [ ] The Solana Pay URL includes:
  - [ ] recipient wallet
  - [ ] human-readable USDC amount
  - [ ] USDC mint
  - [ ] label
  - [ ] reference public key
- [ ] Expected amount is stored in raw USDC base units.
- [ ] Human-readable amount is used only for Solana Pay URL and UI display.
- [ ] A devnet payment made with the generated reference lands on Solana Devnet.
- [ ] The reference can be found in the transaction account keys.
- [ ] The recipient can be validated.
- [ ] The mint can be validated.
- [ ] The amount can be validated.
- [ ] The reference can be validated.

### Failure Conditions

This fails if:

- reference is not a real Solana public key
- reference is derived from UUID/string instead of `Keypair.generate().publicKey`
- private key is stored
- amount is stored using floating point values
- Solana Pay URL does not include reference
- payment cannot be matched to the expected payment

---

## 8. Helius Webhook Ingestion

### Goal

Clearline must receive incoming USDC transaction data from Helius and persist it safely.

### Acceptance Criteria

- [ ] Helius `enhancedDevnet` webhook posts to Clearline endpoint.
- [ ] Webhook endpoint uses Node runtime.
- [ ] Webhook endpoint verifies `Authorization` header.
- [ ] Invalid authorization returns `401`.
- [ ] Valid webhook payload returns `200`.
- [ ] Webhook monitors recipient wallet.
- [ ] Webhook monitors recipient USDC ATA.
- [ ] Incoming transaction signature is extracted.
- [ ] Duplicate webhook deliveries are ignored idempotently.
- [ ] Raw payload is stored before classification for valid incoming USDC transfers.
- [ ] Real Helius payload fixture is saved under `fixtures/helius/`.
- [ ] Webhook handler does not crash when payload shape is unexpected.
- [ ] If no valid incoming USDC transfer exists, webhook returns success and stores no transaction.

### Failure Conditions

This fails if:

- webhook only works with mocked payloads
- real Helius payload is never captured
- duplicate webhook delivery creates duplicate transaction records
- raw payload is lost when classification fails
- invalid auth is accepted
- irrelevant payloads create junk transaction records

---

## 9. USDC Transfer Parsing

### Goal

Clearline must correctly identify and normalize incoming USDC transfers.

### Acceptance Criteria

For a real Helius payload, parser extracts:

- [ ] transaction signature
- [ ] sender wallet
- [ ] recipient wallet or recipient token account
- [ ] USDC mint
- [ ] raw USDC amount
- [ ] timestamp
- [ ] reference account key if present

Parser must:

- [ ] ignore non-USDC transfers
- [ ] ignore transfers not sent to monitored wallet or monitored USDC ATA
- [ ] normalize amount into raw USDC base units
- [ ] preserve extracted transfer data before classification
- [ ] not use floating point comparison for classification

### Failure Conditions

This fails if:

- parser cannot parse a real Helius payload
- parser depends only on handcrafted fixtures
- parser incorrectly accepts non-USDC transfers
- parser cannot distinguish recipient wallet/ATA
- parser returns human-readable decimal as source of truth
- parser loses extracted transfer data before classification

---

## 10. Reference Extraction

### Goal

Clearline must extract Solana Pay references when they exist.

### Acceptance Criteria

- [ ] System first attempts to extract reference from Helius enhanced payload account keys.
- [ ] Extracted account keys are normalized to base58 strings.
- [ ] Extracted references are compared against stored expected payment `reference_pubkey` values.
- [ ] If a stored reference matches, the transaction is linked to that expected payment.
- [ ] If no matching reference is found, the transaction remains unmatched.
- [ ] Missing reference does not trigger automatic sender/amount matching.

### Failure Conditions

This fails if:

- system guesses match by sender
- system guesses match by amount
- system guesses match by label
- reference extraction does not compare against stored expected payment references
- missing reference is treated as a fatal error

---

## 11. RPC Fallback

### Goal

If Helius enhanced payload does not expose the reference clearly, Clearline must attempt RPC fallback.

### Acceptance Criteria

- [ ] RPC fallback runs when reference is missing from Helius payload.
- [ ] RPC fallback fetches transaction by signature.
- [ ] RPC fallback uses `maxSupportedTransactionVersion: 0`.
- [ ] Account keys are extracted from the transaction.
- [ ] Account keys are normalized to base58 strings.
- [ ] Account keys are compared against stored expected payment references.
- [ ] Matching reference is returned when present.
- [ ] RPC failure does not crash ingestion.
- [ ] Failed fallback results in `unknown` classification.
- [ ] Failed fallback includes a clear `classification_reason`.
- [ ] Raw payload remains stored.
- [ ] Signature remains stored.
- [ ] Extracted transfer data remains stored.
- [ ] Amount, sender, recipient, and mint remain stored if available.

Expected failure reason example:

```txt
Reference not found; RPC fallback failed.
```

### Failure Conditions

This fails if:

- fallback is left unimplemented
- fallback crash prevents webhook from returning `200`
- fallback failure loses raw transaction data
- fallback failure loses signature
- fallback failure loses extracted transfer data
- fallback guesses a match by amount or sender

---

## 12. Classification Flow

### Goal

Clearline must classify transactions consistently.

### Required Flow

Classification must follow this conceptual order:

1. Validate the transaction is a valid incoming USDC transfer.
2. Attempt to find a matching expected payment by Solana Pay reference.
3. If no matching expected payment exists, classify transaction as `unknown`.
4. If matching expected payment exists and is already `paid`, classify transaction as `duplicate`.
5. If matching expected payment exists and amount equals expected amount, classify as `paid`.
6. If matching expected payment exists and amount is lower than expected amount, classify as `partial`.
7. If matching expected payment exists and amount is higher than expected amount, classify as `overpaid`.

### Acceptance Criteria

- [ ] No matching expected payment produces `unknown`.
- [ ] Already paid expected payment produces `duplicate`.
- [ ] Exact amount produces `paid`.
- [ ] Lower amount produces `partial`.
- [ ] Higher amount produces `overpaid`.
- [ ] Every stored transaction has a `classification_reason`.
- [ ] Same classification logic is used by webhook ingestion and manual resolution.

### Failure Conditions

This fails if:

- duplicate is incorrectly classified as unknown
- unknown is created before reference matching is attempted
- paid/partial/overpaid classification happens without reference match
- manual resolution uses different classification rules
- classification result lacks human-readable reason

---

## 13. Classification Correctness

### 13.1 Paid

Criteria:

- [ ] Transaction has matching reference.
- [ ] Expected payment exists.
- [ ] Expected payment is not already paid.
- [ ] Transaction amount equals expected amount.
- [ ] Transaction status becomes `paid`.
- [ ] Expected payment status becomes `paid`.
- [ ] Classification reason explains exact match.

Expected reason example:

```txt
Exact match: expected 100 USDC, received 100 USDC, reference matched.
```

---

### 13.2 Partial

Criteria:

- [ ] Transaction has matching reference.
- [ ] Expected payment exists.
- [ ] Expected payment is not already paid.
- [ ] Transaction amount is lower than expected amount.
- [ ] Transaction status becomes `partial`.
- [ ] Expected payment status becomes `partial`.
- [ ] Classification reason includes expected and received amounts.

Expected reason example:

```txt
Partial: expected 100 USDC, received 60 USDC, reference matched.
```

---

### 13.3 Overpaid

Criteria:

- [ ] Transaction has matching reference.
- [ ] Expected payment exists.
- [ ] Expected payment is not already paid.
- [ ] Transaction amount is higher than expected amount.
- [ ] Transaction status becomes `overpaid`.
- [ ] Expected payment status becomes `overpaid`.
- [ ] Classification reason includes expected and received amounts.

Expected reason example:

```txt
Overpaid: expected 100 USDC, received 120 USDC, reference matched.
```

---

### 13.4 Duplicate

Criteria:

- [ ] Transaction has matching reference.
- [ ] Expected payment exists.
- [ ] Expected payment is already marked as `paid`.
- [ ] New transaction status becomes `duplicate`.
- [ ] Expected payment status remains `paid`.
- [ ] Classification reason explains expected payment was already paid.

Expected reason example:

```txt
Duplicate: expected payment already marked paid.
```

---

### 13.5 Unknown

Criteria:

- [ ] Incoming USDC transfer has no matching reference.
- [ ] Transaction status becomes `unknown`.
- [ ] Expected payment status is not changed.
- [ ] Transaction appears in Payment Inbox under Needs Attention.
- [ ] Classification reason explains no matching reference was found.
- [ ] Matching sender or amount does not change `unknown` status.
- [ ] Only manual resolution can attach the unknown transaction to an expected payment.

Expected reason example:

```txt
Unknown: no matching Solana Pay reference found.
```

---

## 14. Expected Payment Status Update Rules

### Goal

Expected payment status must update predictably.

### Acceptance Criteria

When a matched transaction is classified:

- [ ] `paid` transaction updates expected payment to `paid`.
- [ ] `partial` transaction updates expected payment to `partial`.
- [ ] `overpaid` transaction updates expected payment to `overpaid`.
- [ ] `duplicate` transaction does not update expected payment status.
- [ ] `unknown` transaction does not update expected payment status.
- [ ] If expected payment is already `paid`, later matched transactions are classified as `duplicate`.
- [ ] For MVP, Clearline does not aggregate multiple transactions into one expected payment.
- [ ] The newest matched non-duplicate classification may update expected payment status unless expected payment is already `paid`.

### Failure Conditions

This fails if:

- expected payment is updated to `unknown`
- expected payment is updated to `duplicate`
- expected payment is updated to `overdue` in the database
- multiple partials are summed
- remaining balance is calculated
- paid expected payment is overwritten by later partial/overpaid transaction

---

## 15. Unknown Payment Handling

### Goal

Clearline must safely handle raw wallet transfers that do not include a reference.

### Acceptance Criteria

- [ ] Raw USDC transfer without reference is detected.
- [ ] Transfer is stored in `transactions`.
- [ ] Transfer is classified as `unknown`.
- [ ] Transfer appears in Payment Inbox.
- [ ] Transfer appears under Needs Attention.
- [ ] User can open unknown payment details.
- [ ] System does not automatically match by amount.
- [ ] System does not automatically match by sender wallet.
- [ ] Unknown transaction keeps raw payload, signature, and extracted transfer data.

### Failure Conditions

This fails if:

- unknown transfer disappears
- unknown transfer is matched automatically by guesswork
- user must open Solana Explorer to understand it
- classification reason is missing
- raw payload or extracted evidence is lost

---

## 16. Manual Resolution

### Goal

User must be able to manually assign an unknown transaction to an expected payment.

### Acceptance Criteria

- [ ] User can select an unknown transaction.
- [ ] User can select an expected payment.
- [ ] `POST /api/resolve` assigns transaction to expected payment.
- [ ] Manual resolution calls the same shared classifier used by webhook ingestion.
- [ ] Manual resolution updates the same persisted transaction record.
- [ ] Manual resolution updates the same persisted expected payment record when applicable.
- [ ] Classifier re-runs after assignment.
- [ ] Transaction status updates based on amount and expected payment status.
- [ ] Expected payment status updates when applicable.
- [ ] Classification reason updates.
- [ ] UI shows updated status after resolution.
- [ ] No blockchain query is required from UI route.

### Already-Paid Expected Payment Rule

If an unknown transaction is manually assigned to an expected payment that is already `paid`:

- [ ] transaction becomes `duplicate`
- [ ] expected payment remains `paid`
- [ ] classification reason explains expected payment was already paid

### Failure Conditions

This fails if:

- manual resolution uses separate classification logic
- manual resolution updates transaction but not expected payment when applicable
- manual resolution requires direct RPC call from UI
- user cannot understand why status changed
- assigning to already-paid expected payment incorrectly becomes paid/partial/overpaid

---

## 17. Overdue Display

### Goal

Clearline must display overdue expected payments without cron or database writes.

### Acceptance Criteria

- [ ] Overdue is computed on read.
- [ ] Expected payment with `pending` status and past due date displays as `overdue`.
- [ ] No cron job is required.
- [ ] No database write is required for overdue display.
- [ ] Overdue is not used as a transaction status.
- [ ] Overdue does not override `paid`.
- [ ] Overdue does not override `partial`.
- [ ] Overdue does not override `overpaid`.
- [ ] Overdue does not apply to `duplicate` or `unknown` transaction statuses.

### Failure Conditions

This fails if:

- overdue requires scheduled job
- overdue is stored as transaction status
- overdue overwrites paid/partial/overpaid state incorrectly
- overdue is treated as an onchain event

---

## 18. Proof Page

### Goal

Proof page must make each classification understandable and verifiable.

### Acceptance Criteria

Proof page shows:

- [ ] transaction signature
- [ ] amount
- [ ] sender wallet
- [ ] recipient wallet
- [ ] status
- [ ] classification reason
- [ ] linked expected payment if any
- [ ] Solana Explorer link

Proof page must:

- [ ] read from Supabase
- [ ] not depend on live RPC query during render
- [ ] explain why payment was classified that way

### Failure Conditions

This fails if:

- proof page only shows raw transaction hash
- classification reason is missing
- page requires live RPC to render
- linked expected payment is missing when transaction is matched

---

## 19. Replay Endpoint

### Goal

Replay endpoint must provide demo insurance without duplicating ingestion logic.

### Acceptance Criteria

- [ ] `/api/dev/replay-webhook` requires `DEV_SECRET`.
- [ ] Invalid secret is rejected.
- [ ] Endpoint accepts saved Helius payload.
- [ ] Endpoint calls the same ingestion pipeline as Helius webhook.
- [ ] Endpoint returns resulting transaction status.
- [ ] Replayed payload updates inbox.
- [ ] Replay endpoint is not exposed in production UI.

### Failure Conditions

This fails if:

- replay endpoint has separate ingestion logic
- replay endpoint bypasses parser/classifier
- replay endpoint is publicly usable without secret
- replay endpoint does not update inbox

---

## 20. Payment Inbox UI

### Goal

The main UI must communicate payment classification clearly.

### Acceptance Criteria

Payment Inbox shows:

- [ ] Needs Attention
- [ ] Unknown
- [ ] Partial
- [ ] Overpaid
- [ ] Duplicate
- [ ] Paid
- [ ] Overdue

The inbox must:

- [ ] be the first screen of the app
- [ ] show classification status clearly
- [ ] show classification reason or link to details
- [ ] make exceptions obvious
- [ ] avoid dashboard/charts/analytics framing

### Failure Conditions

This fails if:

- app opens on create-payment form instead of inbox
- UI looks like generic invoicing/billing dashboard
- classification reason is hidden
- unknown/partial/duplicate payments are not visually clear

---

## 21. Deterministic Demo Path

### Goal

The demo must be reproducible without depending entirely on live webhook timing.

### Acceptance Criteria

- [ ] Demo can be completed using live devnet flow if Helius timing works.
- [ ] Demo can be completed using saved real fixtures if webhook delivery is delayed.
- [ ] Replay endpoint works with saved real Helius payloads.
- [ ] Demo does not require waiting indefinitely for live webhook delivery.
- [ ] Demo can be completed in under 3 minutes.
- [ ] Separate expected payments are used for paid, partial, overpaid, and manual resolution scenarios.
- [ ] A paid expected payment is reused only when intentionally demonstrating duplicate behavior.

### Failure Conditions

This fails if:

- demo depends entirely on live webhook timing
- no replay fallback exists
- same expected payment causes confusing duplicate/partial behavior
- demo takes longer than 3 minutes
- demo looks like invoicing software

---

## 22. Demo Readiness

### Acceptance Criteria

Demo can show:

- [ ] exact payment → `paid`
- [ ] partial payment → `partial`
- [ ] overpaid payment → `overpaid`
- [ ] raw transfer without reference → `unknown`
- [ ] manual resolution of unknown payment
- [ ] duplicate payment → `duplicate`
- [ ] proof page

Demo setup must verify:

- [ ] receiving wallet has devnet SOL
- [ ] payer wallet has devnet SOL
- [ ] payer wallet has devnet USDC
- [ ] receiving wallet USDC ATA exists
- [ ] Helius webhook points to live Vercel/ngrok URL
- [ ] Helius monitors wallet and USDC ATA
- [ ] replay endpoint works
- [ ] saved fixtures exist

### Recommended Demo Rule

Use separate expected payments for:

- paid scenario
- partial scenario
- overpaid scenario
- unknown/manual resolution scenario

Only use a paid expected payment again when intentionally demonstrating duplicate behavior.

---

## 23. Forbidden Scope Check

A task fails acceptance if it introduces any of the following without explicit approval:

- auth
- RLS
- multi-wallet support
- cron
- email notifications
- CSV export
- AI features
- custom smart contracts
- mainnet deployment requirement
- heuristic matching by amount + sender
- invoice PDFs
- invoice editor
- accounting integrations
- subscriptions
- fiat rails
- Pix
- dashboards
- charts
- team permissions
- refund workflows
- cumulative partial payment accounting
- production queue infrastructure

If a feature does not help classify incoming USDC transfers, it should not be built.

---

## 24. Final MVP Acceptance

The MVP is accepted when:

- [ ] expected payment can be created
- [ ] Solana Pay link can be generated
- [ ] devnet USDC payment can be sent
- [ ] Helius can detect incoming payment
- [ ] valid incoming USDC transfer is stored
- [ ] irrelevant webhook payloads are ignored safely
- [ ] reference can be extracted or fallback handled
- [ ] payment is classified correctly
- [ ] unknown payment can be manually resolved
- [ ] proof page shows transaction details
- [ ] replay endpoint works
- [ ] deterministic demo path exists
- [ ] demo can be completed in under 3 minutes
- [ ] no forbidden scope was added