-- ทำให้ retry ได้โดยไม่สร้าง chapter_events ซ้ำ เมื่ออินเทอร์เน็ตหลุดหลังส่งข้อมูลสำเร็จ
create unique index if not exists idx_chapter_events_session_chapter
  on public.chapter_events(session_id, chapter_n);
