# Clearline

## 1. Overview

Clearline is a USDC Payment Inbox for Solana wallets.

It helps people and teams understand incoming USDC transfers by detecting, validating, and classifying each payment.

Core idea:

"USDC can move globally in seconds, but wallet payments arrive without context.
Clearline tells you what each transfer is."

---

## 2. What Clearline IS

Clearline is a system that:

* Monitors a wallet for incoming USDC transfers
* Matches transfers against expected payments
* Classifies each payment into meaningful states
* Highlights payments that need attention (Exception Inbox)
* Provides onchain proof for every classification

---

## 3. What Clearline is NOT

Clearline is NOT:

* an invoicing tool
* a billing system
* an accounting platform
* a financial dashboard
* a treasury system

We DO NOT focus on:

* creating invoices as a primary feature
* financial reporting
* subscriptions
* fiat payments (Pix, bank, etc.)
* multi-chain support
* AI-based features

---

## 4. Target Users (ICP)

Primary users:

Anyone receiving repeated USDC payments directly to a Solana wallet from multiple senders.

Examples:

* freelancers
* agencies
* founders
* crypto-native teams
* grant recipients
* service providers

The defining trait is not geography.

The defining trait is:

* multiple incoming payments
* multiple senders
* need to understand what each payment represents

---

## 5. Core Problem

Wallet-based USDC payments are:

* unstructured
* inconsistent
* lacking business context

Common issues:

* unknown sender
* partial payments
* duplicate payments
* missing references
* manual transfers without identification

Users must manually inspect transactions using blockchain explorers.

---

## 6. Core Solution

Clearline introduces a Payment Inbox.

System flow:

1. User creates an expected payment:

   * sender (optional label)
   * expected amount
   * reference ID

2. System generates a Solana Pay link (with reference)

3. System monitors the wallet for incoming USDC transfers

4. System validates each transaction:

   * recipient
   * token (USDC)
   * amount
   * reference (if present)

5. System classifies each payment:

   * Paid (exact match)
   * Partial
   * Overpaid
   * Duplicate
   * Unknown
   * Overdue

6. System displays the Payment Inbox:

   * Auto-classified
   * Needs attention
   * Unknown
   * Partial
   * Duplicate

7. User can manually resolve mismatches

---

## 7. Core Features (MVP)

### MUST HAVE

* Payment Inbox UI (main product surface)
* Create expected payment
* Generate Solana Pay link (with reference)
* Monitor wallet for USDC transfers
* Validate transfers (recipient, mint, amount, reference)
* Classification engine:

  * Paid
  * Partial
  * Overpaid
  * Duplicate
  * Unknown
  * Overdue
* Exception handling (Needs Attention)
* Manual resolution (assign payment to expected payment)
* Proof page:

  * transaction hash
  * payer wallet
  * amount
  * classification
  * reason for classification

---

### NICE TO HAVE (only if time allows)

* CSV export

---

### DO NOT BUILD

* invoice editor
* accounting integrations
* subscriptions
* fiat payments
* dashboards with charts
* reporting systems
* AI features
* multi-chain support

---

## 8. Product Principle

Clearline does not organize payments.

Clearline explains what each payment is.

The main UI is NOT a dashboard.

The main UI is a Payment Inbox.

Example:

* Needs attention: 3
* Unknown: 1
* Partial: 1
* Duplicate: 1
* Paid today: 5

---

## 9. Technical Constraints

* Must be built in 10 days
* No custom smart contracts
* Use Solana Devnet for demo
* Architecture should be mainnet-ready
* Minimal infrastructure
* Must support a clear live demo

---

## 10. Tech Stack (Baseline)

* Solana (blockchain)
* Solana Pay (payment links with reference)
* Helius (transaction monitoring / webhooks)
* Next.js (frontend + backend)
* Supabase (database)

---

## 11. Key Risks

* Incorrect classification logic
* Failure to match payments correctly
* Missing transaction detection
* Overcomplicating the product
* Drifting into invoicing/billing territory
* Weak demo clarity

---

## 12. Success Criteria

The project is successful if:

* A user creates an expected payment
* A payment is sent
* The system detects it
* The system classifies it correctly
* The UI clearly shows what happened

---

## 13. Demo Definition

A winning demo:

1. Open the Payment Inbox:
   "This wallet received 6 payments today. 3 need attention."

2. Create expected payment ($100)

3. Show scenarios:

   * exact payment → Paid
   * partial payment → Partial
   * duplicate → Duplicate
   * no reference → Unknown

4. Show classification + reason

5. Show proof page (transaction details)

Final line:

"Clearline removes explorers and spreadsheets from USDC payments."

---

## 14. Non-Goals

We are NOT trying to:

* replace Stripe
* build financial software
* support fiat systems
* build enterprise tooling

We solve ONE problem:

Understanding incoming USDC payments.

---

## 15. Guiding Rule

If a feature does not directly help:

"understand what a payment is"

→ DO NOT BUILD IT
