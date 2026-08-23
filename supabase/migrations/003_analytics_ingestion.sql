-- Analytics foundation: consent, anonymous identity, versioning and atomic ingestion.
alter table public.game_sessions
  add column if not exists anonymous_player_id uuid,
  add column if not exists consent_version text,
  add column if not exists research_consent boolean not null default false,
  add column if not exists session_status text not null default 'completed'
    check (session_status in ('started', 'completed', 'abandoned')),
  add column if not exists rules_version text,
  add column if not exists content_version text,
  add column if not exists rng_version text,
  add column if not exists app_version text,
  add column if not exists platform text;

create index if not exists idx_game_sessions_anonymous_player_id
  on public.game_sessions(anonymous_player_id);
create index if not exists idx_game_sessions_status
  on public.game_sessions(session_status);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('pre', 'post')),
  instrument_version text not null,
  question_id text not null,
  answer text not null,
  score numeric,
  created_at timestamptz not null default now(),
  unique (session_id, assessment_type, question_id)
);

create index if not exists idx_assessment_answers_session_id
  on public.assessment_answers(session_id);

alter table public.assessment_answers enable row level security;

-- The client submits through the security-definer function below. There is no
-- SELECT/UPDATE/DELETE policy for anon on any analytics table.
drop policy if exists "public can insert assessment answers" on public.assessment_answers;

create or replace function public.submit_game_run(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s jsonb := payload->'session';
  sid uuid;
begin
  if payload is null or jsonb_typeof(s) <> 'object' then
    raise exception 'INVALID_ANALYTICS_PAYLOAD';
  end if;

  sid := (s->>'id')::uuid;
  if sid is null or coalesce((s->>'research_consent')::boolean, false) is not true then
    raise exception 'RESEARCH_CONSENT_REQUIRED';
  end if;
  if nullif(trim(s->>'student_name'), '') is null
     or nullif(trim(s->>'class_room'), '') is null
     or nullif(trim(s->>'style_id'), '') is null then
    raise exception 'REQUIRED_SESSION_FIELD_MISSING';
  end if;

  insert into public.game_sessions (
    id, student_name, class_room, risk_profile, risk_score, risk_max_score,
    assessment_version, style_id, final_value, contributed, benchmark, ratio,
    multiple, outcome_band, is_ruined, scam_victim, black_swan_count,
    post_total, post_max_score, post_inflation_score, post_diversification_score,
    post_safety_score, knowledge_gain, post_assessment_status,
    post_assessment_version, play_started_at, play_ended_at,
    play_duration_seconds, anonymous_player_id, consent_version,
    research_consent, session_status, rules_version, content_version,
    rng_version, app_version, platform
  ) values (
    sid, s->>'student_name', s->>'class_room', s->>'risk_profile',
    nullif(s->>'risk_score', '')::numeric, nullif(s->>'risk_max_score', '')::numeric,
    s->>'assessment_version', s->>'style_id', nullif(s->>'final_value', '')::numeric,
    nullif(s->>'contributed', '')::numeric, nullif(s->>'benchmark', '')::numeric,
    nullif(s->>'ratio', '')::numeric, nullif(s->>'multiple', '')::numeric,
    s->>'outcome_band', coalesce((s->>'is_ruined')::boolean, false),
    coalesce((s->>'scam_victim')::boolean, false), coalesce((s->>'black_swan_count')::integer, 0),
    nullif(s->>'post_total', '')::numeric, nullif(s->>'post_max_score', '')::numeric,
    nullif(s->>'post_inflation_score', '')::numeric,
    nullif(s->>'post_diversification_score', '')::numeric,
    nullif(s->>'post_safety_score', '')::numeric, nullif(s->>'knowledge_gain', '')::numeric,
    coalesce(s->>'post_assessment_status', 'skipped'), s->>'post_assessment_version',
    nullif(s->>'play_started_at', '')::timestamptz, nullif(s->>'play_ended_at', '')::timestamptz,
    nullif(s->>'play_duration_seconds', '')::numeric, nullif(s->>'anonymous_player_id', '')::uuid,
    s->>'consent_version', true, coalesce(s->>'session_status', 'completed'),
    s->>'rules_version', s->>'content_version', s->>'rng_version', s->>'app_version', s->>'platform'
  ) on conflict (id) do update set
    play_ended_at = excluded.play_ended_at,
    play_duration_seconds = excluded.play_duration_seconds,
    session_status = excluded.session_status,
    post_total = excluded.post_total,
    post_max_score = excluded.post_max_score,
    post_inflation_score = excluded.post_inflation_score,
    post_diversification_score = excluded.post_diversification_score,
    post_safety_score = excluded.post_safety_score,
    knowledge_gain = excluded.knowledge_gain,
    post_assessment_status = excluded.post_assessment_status,
    post_assessment_version = excluded.post_assessment_version;

  insert into public.chapter_events (
    session_id, chapter_n, event_id, event_name, is_black_swan, shock_pct,
    percentile, exposure, concentration, behavior, scam_accepted, scam_lost,
    value_before, value_after, value_end
  )
  select
    sid, c.chapter_n, c.event_id, c.event_name, c.is_black_swan, c.shock_pct,
    c.percentile, c.exposure, c.concentration, c.behavior, c.scam_accepted,
    c.scam_lost, c.value_before, c.value_after, c.value_end
  from jsonb_to_recordset(coalesce(payload->'chapters', '[]'::jsonb)) as c(
    chapter_n integer, event_id text, event_name text, is_black_swan boolean,
    shock_pct numeric, percentile numeric, exposure numeric, concentration numeric,
    behavior text, scam_accepted boolean, scam_lost numeric, value_before numeric,
    value_after numeric, value_end numeric
  )
  on conflict (session_id, chapter_n) do update set
    event_id = excluded.event_id, event_name = excluded.event_name,
    is_black_swan = excluded.is_black_swan, shock_pct = excluded.shock_pct,
    percentile = excluded.percentile, exposure = excluded.exposure,
    concentration = excluded.concentration, behavior = excluded.behavior,
    scam_accepted = excluded.scam_accepted, scam_lost = excluded.scam_lost,
    value_before = excluded.value_before, value_after = excluded.value_after,
    value_end = excluded.value_end;

  insert into public.assessment_answers (session_id, assessment_type, instrument_version, question_id, answer, score)
  select sid, a.assessment_type, a.instrument_version, a.question_id, a.answer, a.score
  from jsonb_to_recordset(coalesce(payload->'assessments', '[]'::jsonb)) as a(
    assessment_type text, instrument_version text, question_id text, answer text, score numeric
  )
  on conflict (session_id, assessment_type, question_id) do update set
    instrument_version = excluded.instrument_version, answer = excluded.answer, score = excluded.score;

  return jsonb_build_object('ok', true, 'sessionId', sid);
end;
$$;

revoke all on function public.submit_game_run(jsonb) from public;
grant execute on function public.submit_game_run(jsonb) to anon, authenticated;
