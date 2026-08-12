-- ───────────────────────────────────────────────────────────────────
-- tāst Smart Recipe Builder — Supabase schema (Phase 4)
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query
-- → paste → Run. It creates the tables and the row-level security so each
-- user can only ever see their own data.
-- ───────────────────────────────────────────────────────────────────

-- Saved recipes (the full recipe + coffee + gear is stored as JSON in `data`)
create table if not exists public.saved_recipes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  saved_at  timestamptz not null default now(),
  data      jsonb not null
);
alter table public.saved_recipes enable row level security;
drop policy if exists "saved_recipes are private" on public.saved_recipes;
create policy "saved_recipes are private" on public.saved_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists saved_recipes_user_idx on public.saved_recipes (user_id, saved_at);

-- Default gear / settings (one row per user)
create table if not exists public.settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "settings are private" on public.settings;
create policy "settings are private" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Brew history (kind = 'brew' | 'tweak' | 'dial-in' | 'cupping')
-- rating is the tāst 10-point scale in 0.5 steps (legacy rows may hold 1–5 stars)
create table if not exists public.brew_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  kind       text not null default 'brew',
  rating     numeric(3,1),
  notes      text,
  coffee     jsonb,
  brew       jsonb,
  recipe     jsonb
);
alter table public.brew_log enable row level security;
drop policy if exists "brew_log is private" on public.brew_log;
create policy "brew_log is private" on public.brew_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists brew_log_user_idx on public.brew_log (user_id, created_at desc);
