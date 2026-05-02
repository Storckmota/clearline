# Clearline

Clearline is a USDC Payment Inbox for Solana wallets.

It helps people and teams understand incoming USDC transfers by classifying each payment as:

- Paid
- Partial
- Overpaid
- Duplicate
- Unknown
- Overdue

## What problem does Clearline solve?

USDC moves globally in seconds, but wallet payments often arrive without context.

Clearline helps users know what each incoming payment actually is — without opening explorers or maintaining spreadsheets.

## What Clearline is not

Clearline is not:

- an invoicing tool
- a billing platform
- an accounting system
- a treasury dashboard
- a fiat payment system

## MVP scope

The MVP focuses on:

- creating expected payments
- generating Solana Pay links with references
- monitoring incoming USDC transfers
- validating payments
- classifying payments
- showing exceptions in a Payment Inbox
- providing proof pages for transactions

## Tech stack

- Next.js
- TypeScript
- Supabase
- Solana Pay
- Helius
- Solana Devnet

## Demo strategy

The hackathon demo runs on Solana Devnet.

The architecture is designed to be mainnet-ready by configuration.

## Project docs

Core project files:

- `PROJECT.md` — product definition and scope
- `ARCHITECTURE.md` — technical architecture
- `TASKS.md` — execution tracker
- `README.md` — public project overview

## Development status

This project is under active hackathon development.

Current priority:

1. Prove Solana Pay reference flow
2. Prove Helius webhook ingestion
3. Build payment classification engine
4. Build minimal Payment Inbox UI