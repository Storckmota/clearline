# Clearline — Demo Script

Step-by-step walkthrough for judges and reviewers. Target runtime: under 3 minutes.

**Production app:** [https://clearline-lovat.vercel.app](https://clearline-lovat.vercel.app)

---

## Pre-demo checklist

Complete before going live. All items must pass.

- [ ] Production app loads at [https://clearline-lovat.vercel.app](https://clearline-lovat.vercel.app)
- [ ] Wallet connects without error — use Phantom or Solflare, set to **devnet**
- [ ] Inbox shows expected data after connecting the demo merchant wallet (`4imzXJ…GGBG`)
- [ ] Helius `enhancedDevnet` webhook points to the **Vercel production URL** (not ngrok or a local tunnel)
- [ ] `RECIPIENT_WALLET` is set to the demo merchant wallet in Vercel environment variables
- [ ] `DEV_SECRET` is set in Vercel environment variables — never say it aloud or show it on screen
- [ ] Payer wallet has ≥ 0.01 devnet SOL (fees) and ≥ 5 devnet USDC
- [ ] Demo merchant receiving wallet has devnet SOL for ATA rent if ATA does not yet exist
- [ ] Replay fixtures present in `fixtures/helius/` in case live webhook is slow
- [ ] Browser is in a clean profile — no stale wallet prompts or pending connection states

---

## Under-3-minute demo path

### 0:00 — Open the app

Navigate to [https://clearline-lovat.vercel.app](https://clearline-lovat.vercel.app).

Header reads: **Clearline · Payment Inbox · Monitoring devnet merchant wallet: 4imzXJ…GGBG**

> "Clearline is a USDC payment inbox for Solana merchants. Every incoming transfer is automatically classified — paid, partial, overpaid, duplicate, or unknown."

---

### 0:20 — Connect wallet

Click **Connect** and select Phantom (or Solflare) on devnet.

Confirm inbox data loads.

> "This is the payment inbox for the configured devnet merchant wallet. Clearline monitors that wallet via a Helius webhook — every incoming USDC transfer is classified and appears here automatically."

---

### 0:35 — Show Needs Attention

Point to the **Needs Attention** section. Walk through the classifications present:

- **Unknown** — incoming USDC with no matching Solana Pay reference
- **Partial** — payment arrived below the expected amount
- **Overpaid** — payment arrived above the expected amount
- **Duplicate** — a second payment for a reference already marked paid

> "These are the exceptions Clearline surfaces automatically. Without this, you'd be digging through a block explorer trying to figure out what each transfer is."

---

### 0:50 — Show Paid and Pending

Scroll to the **Paid** and **Pending** sections.

Click a paid expected payment to open its detail page. Show the linked transaction, classification reason, and the proof page link.

---

### 1:05 — Create an expected payment *(adds a new receivable to the demo state)*

Click **New expected payment**.

Fill in:
- **Label:** `Demo payment`
- **Amount:** `1`
- **Due date:** (optional)

Click **Create Expected Payment**.

Show the success card:
- **QR code** — scan with Phantom or Solflare on devnet
- **Solana Pay payment link** — raw URI, copy button available
- **Matching reference pubkey** — the unique key Clearline uses to match this payment

> "The QR code encodes a Solana Pay link with a unique reference public key. When a payer scans and sends, Clearline matches the incoming transfer to this expected payment automatically."

---

### 1:30 — Show a proof page

Navigate to any classified transaction's proof page (`/tx/<signature>`).

Show:
- Transaction signature
- Payer wallet
- Amount (USDC)
- Classification and reason
- Solana Explorer link

> "Every classification is backed by an on-chain record. Click Explorer to verify the transaction independently — the same signature, the same transfer."

---

### 1:50 — Manual resolve (explain, do not execute live)

Return to the inbox. Click **Resolve** on an unknown transaction to show the admin panel.

Show the panel is open — the expected payment selector and the admin key field are visible.

**Do not enter or type the admin key during a recorded demo.** If a live resolution is needed, do it in a private local session beforehand with screen capture, then cut to the resolved result.

> "Transfers sent without a Solana Pay reference arrive as unknown. The merchant can manually assign them to an expected payment here — Clearline re-runs classification and moves the payment to the right bucket. The admin key protects this action so it can't be triggered by anyone viewing the inbox."

---

### 2:10 — Close

> "Clearline removes the explorer and the spreadsheet from USDC payments. Every incoming USDC transfer is classified, matched when possible, and backed by on-chain proof."

---

## Backup path — replay fixtures

Use this if live Helius webhook delivery is slow or unavailable during the demo.

Five real-captured Helius devnet payloads are saved in `fixtures/helius/`. They cover every classification scenario and have been verified end-to-end via the full ingestion pipeline.

**Replay order:** unknown → exact → partial → overpaid → duplicate

*(Duplicate must follow exact because it requires the exact-payment receivable to already be in `paid` status.)*

**Before replaying:**

Only replay against a prepared, disposable demo database state — not against your live production data.

1. Use a Supabase project set up specifically for demo/replay with matching `pending` receivables for the fixture reference pubkeys
2. Confirm no prior transaction rows exist for the fixture signatures in that state
3. Do not mutate live production data right before recording

**Replay command:**

```bash
curl -X POST https://clearline-lovat.vercel.app/api/dev/replay-webhook \
  -H "Content-Type: application/json" \
  -H "x-dev-secret: <DEV_SECRET>" \
  -d @fixtures/helius/exact-payment.json
```

**Do not** say or show the `DEV_SECRET` value during any recorded or live demo.

---

## Proof pages for fixture demos

Navigate to any proof page directly:

```
https://clearline-lovat.vercel.app/tx/<full_signature>
```

| Scenario | Full signature |
|---|---|
| Exact → paid | `5noPgVe2MNGCTC4Kat2P4FeWv8DZWcY9coPjCkphJg9G6ut3TMkcmAdFWzniAPCwnzXmaUizBrNeuTMMbwUxqSKe` |
| Partial | `chRxiw1Mhb6rqTmhNzkdxU13F8VAyfBJ42Me1ce7KVcCdu73Qho42j91zfJFNYgyp3tnEoLY5NcgwaoEmY6eF5j` |
| Overpaid | `56FdKf68hkdBx24kQYASaQHewPqy5kvLcFkW11DLu26N2GEfUEbQM6D3emCrLmiFnjP6r9DZVgf9AHff2GmpzmUT` |
| Unknown | `mtH4nuSXUHNK1tvcKqueF1Q5ZbkenYt5U6LVZ3UAmff2YYiUt6eyUuKZyWM5yTXYC5BvVYoDCXcAD6UbRpD5oyZ` |
| Duplicate | `5Gp6mYYaJUf5aVvFMfBP6q9YEHr2RfH6DAzRdGb8A1ENZrExV5w2cJFdztXcfFmaDSjrD8RAUCWcPPEns8KWWv29` |

---

## What NOT to show

- **Do not** open `.env.local` or any environment variable file on screen
- **Do not** say or type the `DEV_SECRET` value aloud, in a terminal, or in any recording
- **Do not** show the payer's private keypair or the `PAYER_KEYPAIR_PATH` value
- **Do not** imply that arbitrary wallets are automatically monitored — this demo monitors one configured merchant wallet
- **Do not** claim mainnet deployment — this is a devnet MVP
- **Do not** show the Supabase dashboard, service role key, or any database credentials
