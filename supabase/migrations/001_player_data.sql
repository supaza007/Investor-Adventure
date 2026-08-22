create extension if not exists pgcrypto;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_name text not null,
  class_room text not null,
  risk_profile text check (risk_profile in ('conservative', 'balanced', 'aggressive')),
  risk_score numeric,
  risk_max_score numeric,
  assessment_version text,
  style_id text not null,
  final_value numeric not null,
  contributed numeric not null,
  benchmark numeric not null,
  ratio numeric not null,
  multiple numeric not null,
  outcome_band text not null check (outcome_band in ('fire', 'comfortable', 'adequate', 'tight', 'ruined')),
  is_ruined boolean not null default false,
  scam_victim boolean not null default false,
  black_swan_count integer not null default 0,
  post_total numeric,
  post_max_score numeric,
  post_inflation_score numeric,
  post_diversification_score numeric,
  post_safety_score numeric,
  knowledge_gain numeric,
  post_assessment_status text not null default 'skipped' check (post_assessment_status in ('assessed', 'skipped')),
  post_assessment_version text,
  play_started_at timestamptz,
  play_ended_at timestamptz,
  play_duration_seconds numeric
);

create table if not exists public.chapter_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  chapter_n integer not null,
  event_id text not null,
  event_name text not null,
  is_black_swan boolean not null default false,
  shock_pct numeric not null default 0,
  percentile numeric not null default 0,
  exposure numeric not null default 0,
  concentration numeric not null default 0,
  behavior text check (behavior in ('hold', 'cut', 'buy')),
  scam_accepted boolean not null default false,
  scam_lost numeric not null default 0,
  value_before numeric not null default 0,
  value_after numeric not null default 0,
  value_end numeric not null default 0
);

create index if not exists idx_game_sessions_class_room on public.game_sessions(class_room);
create index if not exists idx_game_sessions_created_at on public.game_sessions(created_at);
create index if not exists idx_chapter_events_session_id on public.chapter_events(session_id);
create unique index if not exists idx_chapter_events_session_chapter on public.chapter_events(session_id, chapter_n);

alter table public.game_sessions enable row level security;
alter table public.chapter_events enable row level security;

drop policy if exists "public can insert game sessions" on public.game_sessions;
create policy "public can insert game sessions"
  on public.game_sessions for insert to anon with check (true);

drop policy if exists "public can insert chapter events" on public.chapter_events;
create policy "public can insert chapter events"
  on public.chapter_events for insert to anon with check (true);

-- ไม่มี SELECT / UPDATE / DELETE policy ให้ anon โดยตั้งใจ


