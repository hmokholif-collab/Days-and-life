-- FOCUS ON LIFE — Supabase schema v1
-- Run in Supabase SQL Editor, or: supabase db push
-- Facebook is LOCAL-ONLY by app policy: the Android app never uploads
-- facebook packages/domains, so no facebook column exists here on purpose.

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  model text,
  android_release text,
  api_level int,
  blocking_mode text not null default 'NO_RESET',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.devices(device_id) on delete cascade,
  blocked_packages jsonb not null default '[]'::jsonb,
  blocked_domains jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  start_at bigint not null,
  end_at bigint not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_overrides (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  session_id uuid references public.focus_sessions(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: on by default. These starter policies allow
-- anon read/insert for a single-user personal project. Tighten them
-- with Supabase Auth (auth.uid()) before sharing the dashboard publicly.
alter table public.devices enable row level security;
alter table public.policies enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.emergency_overrides enable row level security;

create policy "anon read devices" on public.devices for select using (true);
create policy "anon insert devices" on public.devices for insert with check (true);
create policy "anon read policies" on public.policies for select using (true);
create policy "anon insert policies" on public.policies for insert with check (true);
create policy "anon read sessions" on public.focus_sessions for select using (true);
create policy "anon insert sessions" on public.focus_sessions for insert with check (true);
create policy "anon read overrides" on public.emergency_overrides for select using (true);
create policy "anon insert overrides" on public.emergency_overrides for insert with check (true);
