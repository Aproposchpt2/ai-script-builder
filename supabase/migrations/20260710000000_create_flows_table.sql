-- AI4 Contact Center — Initial Schema
-- Migration: 20260710_create_flows_table

-- Enable UUID generation (safe to run if already enabled)
create extension if not exists "pgcrypto";

-- ─── flows ────────────────────────────────────────────────────────────────────
-- One row per saved call flow. Owned by auth.users via user_id.
create table if not exists public.flows (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  name           text        not null default 'Untitled Flow',
  text_input     text        not null,
  parsed_output  jsonb       not null,
  engine         text        not null default 'rules',  -- 'ai' | 'rules'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index for fast per-user lookups
create index if not exists flows_user_id_idx on public.flows (user_id, created_at desc);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists flows_set_updated_at on public.flows;
create trigger flows_set_updated_at
  before update on public.flows
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.flows enable row level security;

-- Users can only read, write, update, delete their own rows
create policy "select own flows"
  on public.flows for select
  using (auth.uid() = user_id);

create policy "insert own flows"
  on public.flows for insert
  with check (auth.uid() = user_id);

create policy "update own flows"
  on public.flows for update
  using (auth.uid() = user_id);

create policy "delete own flows"
  on public.flows for delete
  using (auth.uid() = user_id);
