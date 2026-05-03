-- Clearline — Architecture correction: merchant wallet on receivables
-- Phase 2.5: The connected wallet is the merchant wallet.
--
-- RECIPIENT_WALLET / RECIPIENT_USDC_ATA are no longer required app runtime config.
-- Each receivable stores the merchant_wallet that created it.
-- The Solana Pay URL uses this wallet as recipient.
-- The ingestion pipeline uses it to validate incoming transfers.

-- ---------------------------------------------------------------------------
-- Add merchant_wallet to receivables
-- ---------------------------------------------------------------------------
-- No rows exist yet, so NOT NULL without default is safe.
alter table receivables
  add column merchant_wallet text not null;

-- Prevent empty string values
alter table receivables
  add constraint receivables_merchant_wallet_not_empty
  check (merchant_wallet <> '');

-- Index for filtering receivables by merchant wallet
create index if not exists receivables_merchant_wallet_idx
  on receivables(merchant_wallet);
