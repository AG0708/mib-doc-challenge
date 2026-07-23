-- Relay schema for Supabase / Postgres
-- Run in Supabase SQL editor to adopt this product on Sherlock infra.

create extension if not exists "pgcrypto";

create table if not exists prospects (
  id text primary key,
  name text not null,
  handle text not null,
  platform text not null check (platform in ('tiktok','instagram','youtube')),
  followers int not null default 0,
  niche text not null default '',
  stage text not null default 'sourced',
  owner text not null,
  last_touch timestamptz not null default now(),
  notes text not null default '',
  score int not null default 0,
  email text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists creators (
  id text primary key,
  name text not null,
  handle text not null unique,
  platform text not null,
  stage text not null default 'signed',
  standing text not null default 'watch',
  cpm numeric not null default 0,
  views_30d int not null default 0,
  installs_30d int not null default 0,
  web_visits_30d int not null default 0,
  revenue_30d int not null default 0,
  posts_due int not null default 0,
  posts_done int not null default 0,
  next_payout int not null default 0,
  rate text not null default '',
  joined_at timestamptz not null default now(),
  manager text not null,
  last_post_at timestamptz,
  city text not null default '',
  email text not null,
  deep_link text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payouts (
  id text primary key,
  creator_id text not null references creators(id),
  creator_name text not null,
  period text not null,
  views int not null default 0,
  amount int not null default 0,
  status text not null default 'queued',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists daily_metrics (
  date date primary key,
  views int not null default 0,
  installs int not null default 0,
  web_visits int not null default 0,
  revenue int not null default 0
);

create table if not exists activity (
  id text primary key,
  at timestamptz not null default now(),
  kind text not null,
  title text not null,
  detail text not null default ''
);

create table if not exists webhook_events (
  id text primary key,
  at timestamptz not null default now(),
  source text not null,
  event text not null,
  creator_id text not null,
  step text,
  signature_valid boolean not null,
  status text not null,
  idempotency_key text not null unique,
  raw jsonb not null
);

create table if not exists competitor_pulse (
  name text primary key,
  share_of_voice numeric not null,
  week_delta numeric not null,
  top_hook text not null
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  status text not null default 'open',
  priority text not null default 'med',
  due_at timestamptz,
  assignee text not null,
  entity_type text,
  entity_id text,
  entity_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists entity_notes (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists content_posts (
  id text primary key,
  creator_id text not null references creators(id),
  platform text not null,
  url text not null default '',
  caption text not null default '',
  views int not null default 0,
  installs int not null default 0,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists message_templates (
  id text primary key,
  name text not null,
  channel text not null default 'dm',
  body text not null,
  updated_at timestamptz not null default now()
);

alter table prospects enable row level security;
alter table creators enable row level security;
alter table payouts enable row level security;
alter table daily_metrics enable row level security;
alter table activity enable row level security;
alter table webhook_events enable row level security;
alter table competitor_pulse enable row level security;
alter table tasks enable row level security;
alter table entity_notes enable row level security;
alter table content_posts enable row level security;
alter table message_templates enable row level security;

-- Ops role policies (replace with your auth claims)
create policy "ops_all_prospects" on prospects for all using (true) with check (true);
create policy "ops_all_creators" on creators for all using (true) with check (true);
create policy "ops_all_payouts" on payouts for all using (true) with check (true);
create policy "ops_read_metrics" on daily_metrics for select using (true);
create policy "ops_all_activity" on activity for all using (true) with check (true);
create policy "ops_all_webhooks" on webhook_events for all using (true) with check (true);
create policy "ops_read_competitors" on competitor_pulse for select using (true);
create policy "ops_all_tasks" on tasks for all using (true) with check (true);
create policy "ops_all_notes" on entity_notes for all using (true) with check (true);
create policy "ops_all_posts" on content_posts for all using (true) with check (true);
create policy "ops_all_templates" on message_templates for all using (true) with check (true);
