-- Character ability and adjustment-prompt analytics.
alter table public.chapter_events
  add column if not exists character_ability_id text,
  add column if not exists ability_triggered boolean not null default false,
  add column if not exists ability_bonus numeric not null default 0,
  add column if not exists ability_cost numeric not null default 0,
  add column if not exists ability_net_effect numeric not null default 0,
  add column if not exists ability_recovery_bonus numeric not null default 0,
  add column if not exists ability_growth_bonus numeric not null default 0,
  add column if not exists adjustment_count integer not null default 0,
  add column if not exists adjustment_prompt_choices jsonb not null default '{}'::jsonb,
  add column if not exists portfolio_adjusted boolean not null default false;

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
    multiple, outcome_band, net_gain, net_gain_pct, is_ruined, scam_victim,
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
    s->>'outcome_band', nullif(s->>'net_gain', '')::numeric,
    nullif(s->>'net_gain_pct', '')::numeric,
    coalesce((s->>'is_ruined')::boolean, false), coalesce((s->>'scam_victim')::boolean, false),
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
    final_value = excluded.final_value, contributed = excluded.contributed,
    ratio = excluded.ratio, multiple = excluded.multiple,
    outcome_band = excluded.outcome_band, net_gain = excluded.net_gain,
    net_gain_pct = excluded.net_gain_pct, is_ruined = excluded.is_ruined,
    scam_victim = excluded.scam_victim, play_ended_at = excluded.play_ended_at,
    play_duration_seconds = excluded.play_duration_seconds,
    session_status = excluded.session_status, post_total = excluded.post_total,
    post_max_score = excluded.post_max_score,
    post_inflation_score = excluded.post_inflation_score,
    post_diversification_score = excluded.post_diversification_score,
    post_safety_score = excluded.post_safety_score, knowledge_gain = excluded.knowledge_gain,
    post_assessment_status = excluded.post_assessment_status,
    post_assessment_version = excluded.post_assessment_version;

  insert into public.chapter_events (
    session_id, chapter_n, event_id, event_name, income_added,
    allocation_before_event, base_asset_returns, age_modifiers,
    final_asset_returns, character_ability_id, ability_triggered,
    ability_bonus, ability_cost, ability_net_effect, ability_recovery_bonus,
    ability_growth_bonus, adjustment_count, adjustment_prompt_choices,
    portfolio_adjusted, shock_pct, percentile, exposure, concentration,
    behavior, scam_accepted, scam_lost, value_before, value_after, value_end
  )
  select sid, c.chapter_n, c.event_id, c.event_name, c.income_added,
    c.allocation_before_event, c.base_asset_returns, c.age_modifiers,
    c.final_asset_returns, c.character_ability_id, c.ability_triggered,
    c.ability_bonus, c.ability_cost, c.ability_net_effect, c.ability_recovery_bonus,
    c.ability_growth_bonus, c.adjustment_count, c.adjustment_prompt_choices,
    c.portfolio_adjusted, c.shock_pct, c.percentile, c.exposure,
    c.concentration, c.behavior, c.scam_accepted, c.scam_lost,
    c.value_before, c.value_after, c.value_end
  from jsonb_to_recordset(coalesce(payload->'chapters', '[]'::jsonb)) as c(
    chapter_n integer, event_id text, event_name text, income_added numeric,
    allocation_before_event jsonb, base_asset_returns jsonb, age_modifiers jsonb,
    final_asset_returns jsonb, character_ability_id text, ability_triggered boolean,
    ability_bonus numeric, ability_cost numeric, ability_net_effect numeric,
    ability_recovery_bonus numeric, ability_growth_bonus numeric,
    adjustment_count integer, adjustment_prompt_choices jsonb,
    portfolio_adjusted boolean, shock_pct numeric, percentile numeric,
    exposure numeric, concentration numeric, behavior text,
    scam_accepted boolean, scam_lost numeric, value_before numeric,
    value_after numeric, value_end numeric
  )
  on conflict (session_id, chapter_n) do update set
    event_id = excluded.event_id, event_name = excluded.event_name,
    income_added = excluded.income_added,
    allocation_before_event = excluded.allocation_before_event,
    base_asset_returns = excluded.base_asset_returns,
    age_modifiers = excluded.age_modifiers,
    final_asset_returns = excluded.final_asset_returns,
    character_ability_id = excluded.character_ability_id,
    ability_triggered = excluded.ability_triggered,
    ability_bonus = excluded.ability_bonus, ability_cost = excluded.ability_cost,
    ability_net_effect = excluded.ability_net_effect,
    ability_recovery_bonus = excluded.ability_recovery_bonus,
    ability_growth_bonus = excluded.ability_growth_bonus,
    adjustment_count = excluded.adjustment_count,
    adjustment_prompt_choices = excluded.adjustment_prompt_choices,
    portfolio_adjusted = excluded.portfolio_adjusted,
    shock_pct = excluded.shock_pct, percentile = excluded.percentile,
    exposure = excluded.exposure, concentration = excluded.concentration,
    behavior = excluded.behavior, scam_accepted = excluded.scam_accepted,
    scam_lost = excluded.scam_lost, value_before = excluded.value_before,
    value_after = excluded.value_after, value_end = excluded.value_end;

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
