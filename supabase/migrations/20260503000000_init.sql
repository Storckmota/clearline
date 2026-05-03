-- Clearline MVP — Initial Schema
-- Phase 2.3: Create receivables and transactions tables.
--
-- No auth. No RLS. All DB access is server-side via service role key.
-- Overdue is a display-only state computed on read; it is not stored.
-- Unknown and Duplicate are transaction statuses, not receivable statuses.

-- ---------------------------------------------------------------------------
-- receivables
-- ---------------------------------------------------------------------------
create table if not exists receivables (
  id                   uuid        primary key default gen_random_uuid(),

  label                text        not null,

  expected_amount_raw  bigint      not null,
  due_date             timestamptz null,

  reference_pubkey     text        not null unique,
  solana_pay_url       text        not null,

  status               text        not null default 'pending'
    check (status in ('pending', 'paid', 'partial', 'overpaid')),

  created_at           timestamptz not null default now(),
  resolved_at          timestamptz null
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id                      uuid        primary key default gen_random_uuid(),

  signature               text        not null unique,

  sender_wallet           text        null,
  recipient_wallet        text        not null,

  amount_raw              bigint      not null,
  mint                    text        not null,

  reference_pubkey        text        null,
  receivable_id           uuid        null references receivables(id),

  status                  text        not null default 'unknown'
    check (status in ('paid', 'partial', 'overpaid', 'duplicate', 'unknown')),

  classification_reason   text        not null default 'Unclassified',

  raw_payload             jsonb       not null,

  observed_at             timestamptz null,
  created_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create unique index if not exists transactions_signature_idx
  on transactions(signature);

create index if not exists transactions_receivable_id_idx
  on transactions(receivable_id);

create index if not exists receivables_reference_pubkey_idx
  on receivables(reference_pubkey);
