-- รายงานสรุป: 1 แถวต่อการเล่น 1 รอบ
-- รันไฟล์นี้ใน Supabase Dashboard -> SQL Editor ด้วยสิทธิ์เจ้าของโปรเจกต์
select
  gs.created_at as played_at,
  gs.student_name,
  gs.class_room,
  gs.risk_profile,
  gs.risk_score,
  gs.style_id,
  gs.outcome_band,
  gs.final_value,
  gs.multiple,
  gs.post_total,
  gs.knowledge_gain,
  round(gs.play_duration_seconds / 60.0, 1) as play_minutes,
  count(ce.id) as chapters_recorded,
  gs.scam_victim,
  gs.black_swan_count
from public.game_sessions gs
left join public.chapter_events ce on ce.session_id = gs.id
group by gs.id
order by gs.created_at desc;

-- รายละเอียดเหตุการณ์ของรอบล่าสุด
select
  gs.created_at as played_at,
  gs.student_name,
  gs.class_room,
  ce.chapter_n,
  ce.event_name,
  ce.behavior,
  ce.shock_pct,
  ce.exposure,
  ce.concentration,
  ce.scam_accepted,
  ce.scam_lost,
  ce.value_before,
  ce.value_after,
  ce.value_end
from public.chapter_events ce
join public.game_sessions gs on gs.id = ce.session_id
where gs.id = (
  select id
  from public.game_sessions
  order by created_at desc
  limit 1
)
order by ce.chapter_n;
