-- ใช้ใน Supabase SQL Editor ด้วยสิทธิ์เจ้าของโปรเจกต์

-- 1) ภาพรวมการเล่นรายรอบ
select
  gs.id as session_id,
  gs.created_at as played_at,
  gs.class_room,
  gs.style_id,
  gs.session_status,
  gs.final_value,
  gs.contributed,
  gs.net_gain,
  gs.net_gain_pct,
  gs.outcome_band,
  gs.post_total,
  gs.post_max_score,
  gs.knowledge_gain,
  round(gs.play_duration_seconds / 60.0, 1) as play_minutes,
  count(ce.id) as chapters_recorded,
  gs.scam_victim
from public.game_sessions gs
left join public.chapter_events ce on ce.session_id = gs.id
group by gs.id
order by gs.created_at desc;

-- 2) พฤติกรรมการตัดสินใจราย chapter
select
  gs.class_room,
  ce.chapter_n,
  ce.behavior,
  round(avg(ce.income_added), 2) as avg_income_added,
  count(*) as decisions,
  round(avg(ce.concentration), 3) as avg_concentration,
  round(avg(ce.shock_pct), 3) as avg_shock_pct,
  round(avg(ce.value_after - ce.value_before), 2) as avg_value_change,
  sum(case when ce.scam_accepted then 1 else 0 end) as scam_accepts
from public.chapter_events ce
join public.game_sessions gs on gs.id = ce.session_id
group by gs.class_room, ce.chapter_n, ce.behavior
order by gs.class_room, ce.chapter_n, ce.behavior;

-- 3) คะแนนหลังเล่นแยกตามด้าน
select
  gs.class_room,
  count(*) as assessed_runs,
  round(avg(gs.post_total), 2) as avg_post_total,
  round(avg(gs.post_inflation_score), 2) as avg_inflation_score,
  round(avg(gs.post_diversification_score), 2) as avg_diversification_score,
  round(avg(gs.post_safety_score), 2) as avg_safety_score
from public.game_sessions gs
where gs.post_assessment_status = 'assessed'
group by gs.class_room
order by gs.class_room;

-- 4) funnel: รอบที่มีข้อมูลแต่ละระดับ
select
  count(*) as sessions,
  count(*) filter (where session_status = 'completed') as completed_sessions,
  count(*) filter (where post_assessment_status = 'assessed') as post_assessed_sessions,
  count(*) filter (where chapters_recorded.chapter_count = 4) as four_chapter_sessions
from public.game_sessions gs
left join lateral (
  select count(*)::integer as chapter_count
  from public.chapter_events ce
  where ce.session_id = gs.id
) chapters_recorded on true;

-- 5) คำตอบรายข้อสำหรับการวิเคราะห์ภายหลัง (ยังไม่ใช่เกณฑ์คะแนนใหม่)
select
  gs.class_room,
  aa.assessment_type,
  aa.instrument_version,
  aa.question_id,
  aa.answer,
  aa.score,
  count(*) as answers
from public.assessment_answers aa
join public.game_sessions gs on gs.id = aa.session_id
group by gs.class_room, aa.assessment_type, aa.instrument_version,
  aa.question_id, aa.answer, aa.score
order by gs.class_room, aa.assessment_type, aa.question_id, aa.answer;
