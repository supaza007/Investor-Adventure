# ดีไซน์: Database เก็บสถิตินักเรียนหลายคน

วันที่: 2026-08-19
สถานะ: ผ่าน brainstorm กับผู้ใช้แล้ว ยังไม่ implement

## เป้าหมาย

เกม "พอร์ตพิชิตเงินเฟ้อ" สอนความรู้การลงทุนให้นักเรียน ม.ปลายที่ไม่มีพื้นฐานการเงิน
อยากเก็บผลการเล่นของนักเรียนหลายคนไว้ที่เดียว ให้ครู/โรงเรียนดูภาพรวมได้ (ไม่ใช่แค่
save/resume ของผู้เล่นคนเดียว)

## ช่องทางเล่น

**เว็บ** — โปรเจกต์นี้ build ได้ทั้ง Electron desktop และเว็บ (`npm run build:web` มีอยู่แล้ว)
เลือกเว็บเพราะการเก็บข้อมูลรวมศูนย์จากหลายเครื่องต้องพึ่งอินเทอร์เน็ตอยู่ดี เว็บทำได้เป็น
ธรรมชาติกว่า ไม่ต้องติดตั้งทีละเครื่อง

## Database

**Supabase** (Postgres + REST API ฟรี, มี Table Editor แบบ GUI ให้ดูข้อมูลโดยไม่ต้องเขียน SQL)

ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก:
- Firebase Firestore — เหมาะถ้าต้องการ real-time dashboard แต่โจทย์นี้ไม่ต้องการความสด
- Google Sheets + Apps Script — เร็ว/ฟรีสุด แต่ผู้ใช้ต้องการ "database" จริงมากกว่าทางลัด

ข้อจำกัดที่ต้องรู้: โปรเจกต์ฟรีจะ "หลับ" ถ้าไม่มีการใช้งานเกิน 1 สัปดาห์ ต้องเข้าไปปลุกเองใน
dashboard — ไม่กระทบถ้ามีคนเล่นสม่ำเสมอช่วงเปิดเทอม

## Schema

ข้อมูลแมปตรงกับสิ่งที่ `buildReport()` ([report.js](../../src/game/engine/report.js)) และ
`finishChapter()` ([gameState.js:269-286](../../src/game/engine/gameState.js#L269)) สร้างไว้
อยู่แล้ว — ไม่ต้องคำนวณสูตรใหม่ แค่ copy ค่าไปเก็บ

### ตาราง `game_sessions` (1 แถว / การเล่นจบ 1 รอบ)

| คอลัมน์ | ชนิด | มาจาก |
|---|---|---|
| `id` | uuid, pk, default `gen_random_uuid()` | — |
| `created_at` | timestamptz, default `now()` | — |
| `student_name` | text | กรอกเองตอนเริ่มเกม (ไม่มีระบบ login) |
| `class_room` | text | เช่น "ม.6/3" กรอกเองตอนเริ่มเกม |
| `style_id` | text | `state.styleId` |
| `final_value` | numeric | `report.finalValue` |
| `contributed` | numeric | `report.contributed` |
| `benchmark` | numeric | `report.benchmark` |
| `ratio` | numeric | `report.ratio` |
| `multiple` | numeric | `report.multiple` |
| `outcome_band` | text | `report.band.id` ('fire'/'comfortable'/'adequate'/'tight'/'ruined') |
| `is_ruined` | boolean | `report.isRuined` |
| `scam_victim` | boolean | `report.scamVictim` |
| `net_gain` | numeric | `report.netGain` |
| `net_gain_pct` | numeric | `report.netGainPct` |

### ตาราง `chapter_events` (4 แถว / รอบ — 1 แถวต่อบท)

| คอลัมน์ | ชนิด | มาจาก |
|---|---|---|
| `id` | uuid, pk, default `gen_random_uuid()` | — |
| `session_id` | uuid, FK → `game_sessions.id` on delete cascade | — |
| `chapter_n` | int | `entry.chapter` |
| `event_id` | text | `entry.eventId` |
| `event_name` | text | `entry.eventName` |
| `income_added` | numeric | `entry.incomeAdded` |
| `allocation_before_event` | jsonb | `entry.allocationBeforeEvent` |
| `base_asset_returns` | jsonb | `entry.baseReturns` |
| `age_modifiers` | jsonb | `entry.ageModifiers` |
| `final_asset_returns` | jsonb | `entry.assetReturns` |
| `shock_pct` | numeric | `entry.shockPct` |
| `percentile` | numeric | `entry.percentile` |
| `exposure` | numeric | `entry.exposure` |
| `concentration` | numeric | `entry.concentration` |
| `behavior` | text | `entry.behavior` ('hold'/'cut'/'buy') |
| `scam_accepted` | boolean | `entry.scamAccepted` |
| `scam_lost` | numeric | `entry.scamLost` |
| `value_before` | numeric | `entry.valueBefore` |
| `value_after` | numeric | `entry.valueAfter` |
| `value_end` | numeric | `entry.valueEnd` |

**ทำไมแยก 2 ตารางแทน jsonb ก้อนเดียว:** โจทย์คือเทียบข้ามนักเรียนหลายคน (เช่น "บทวิกฤต
ไหนทำให้โดนหลอกมากสุด", "คนเลือกสไตล์เทรดเดอร์ตัดขาดทุนบ่อยแค่ไหน") — ตารางแยกทำให้
filter/group ใน Table Editor ได้ตรงๆ ไม่ต้องแกะ JSON

## ความปลอดภัยของข้อมูล (สำคัญ — ต้องทำตั้งแต่แรก)

เก็บชื่อจริงนักเรียน (เยาวชน) ในตารางที่ frontend เขียนได้โดยไม่มีระบบ login ต้องเปิด
**Row Level Security (RLS)** บนทั้งสองตาราง:
- Policy `INSERT`: อนุญาตให้ role `anon` (public) เขียนได้
- **ไม่สร้าง** policy `SELECT`/`UPDATE`/`DELETE` ให้ `anon` — ค่า default ของ RLS คือปิดกั้น
  ทุกอย่างที่ไม่มี policy รองรับ ดังนั้นไม่มี policy select = อ่านผ่าน public API ไม่ได้เลย
- ครู/ผู้ใช้ดูข้อมูลผ่านการ login เข้า Supabase dashboard โดยตรง (Table Editor) ไม่เปิด
  endpoint อ่านสาธารณะ — ถ้าอยากให้ครูดูเองในอนาคตโดยไม่ต้องมี Supabase account ค่อยทำ
  ระบบ auth/dashboard แยกทีหลัง (ไม่ใช่ scope ตอนนี้)

## Backend setup (ทำได้เลยตอนนี้ — ไม่แตะโค้ดเกม)

ไม่ต้องเขียน backend server เอง Supabase สร้าง REST API ให้อัตโนมัติจาก schema ตาราง
งานฝั่ง backend ทั้งหมดคือตั้งค่าใน Supabase project:

1. รัน SQL นี้ใน Supabase SQL Editor (สร้างตาราง + ดัชนี + RLS ครบในทีเดียว):

```sql
create extension if not exists pgcrypto;

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_name text not null,
  class_room text not null,
  style_id text not null,
  final_value numeric not null,
  contributed numeric not null,
  benchmark numeric not null,
  ratio numeric not null,
  multiple numeric not null,
  outcome_band text not null,
  is_ruined boolean not null default false,
  scam_victim boolean not null default false,
  net_gain numeric,
  net_gain_pct numeric
);

create table chapter_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  chapter_n integer not null,
  event_id text not null,
  event_name text not null,
  income_added numeric not null default 0,
  allocation_before_event jsonb not null default '{}'::jsonb,
  base_asset_returns jsonb not null default '{}'::jsonb,
  age_modifiers jsonb not null default '{}'::jsonb,
  final_asset_returns jsonb not null default '{}'::jsonb,
  shock_pct numeric not null,
  percentile numeric not null,
  exposure numeric not null,
  concentration numeric not null,
  behavior text,
  scam_accepted boolean not null default false,
  scam_lost numeric not null default 0,
  value_before numeric not null,
  value_after numeric not null,
  value_end numeric not null
);

create index idx_chapter_events_session_id on chapter_events(session_id);
create index idx_game_sessions_class_room on game_sessions(class_room);
create index idx_game_sessions_created_at on game_sessions(created_at);

alter table game_sessions enable row level security;
alter table chapter_events enable row level security;

create policy "public can insert sessions"
  on game_sessions for insert to anon with check (true);

create policy "public can insert chapter events"
  on chapter_events for insert to anon with check (true);
-- ตั้งใจไม่สร้าง policy select/update/delete ให้ anon
-- → อ่าน/แก้/ลบผ่าน public API ไม่ได้เลย ต้อง login เข้า dashboard เท่านั้น
```

2. คัดลอก URL + anon key จากหน้า Project Settings → API เก็บไว้ใช้ตอน implement ฝั่ง frontend
3. ไม่ต้องตั้งค่า CORS เพิ่ม — Supabase เปิดให้เบราว์เซอร์เรียก REST API ข้ามโดเมนได้เองโดย default

## จุดที่ implement ฝั่งเกม (เมื่อพร้อมลงมือ — ยังไม่ทำในดีไซน์นี้)

- เพิ่ม `.env` เข้า `.gitignore` ก่อน (ตอนนี้ repo ยังไม่มีการจัดการ `.env` เลย) แล้วใส่
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ลงไป
- ติดตั้ง `@supabase/supabase-js`
- เพิ่มฟอร์มกรอกชื่อ+ห้อง ก่อนเริ่มเกม (หรือหน้า cover) — ยังไม่มีอยู่ในโค้ดตอนนี้
- ที่ [ReportScreen.jsx](../../src/components/ReportScreen.jsx) ตอนแสดงผลสรุป: insert 1 แถว
  ลง `game_sessions` แล้ว insert 4 แถวลง `chapter_events` จาก `report.chapters`

## เรื่องค้างจากเซสชันนี้ (ไม่เกี่ยวกับ database — บันทึกไว้กันลืม)

ระหว่างเช็คโค้ดพบว่ามีดีไซน์ลดความรกหน้า StyleSelect ที่ผ่านการยืนยันกับผู้ใช้ไปแล้วก่อน
หน้านี้ (ดู [2026-07-20-style-select-declutter-frontend-prompt.md](2026-07-20-style-select-declutter-frontend-prompt.md))
แต่ดูเหมือนยังไม่เคย implement — เป็นดีไซน์คนละแบบกับที่ brainstorm กันในเซสชันนี้ (แบบเก่าใช้
modal + กราฟแท่ง, เซสชันนี้ใช้ toggle พับ/กาง + จุดระดับ) ต้องคุยกับผู้ใช้ว่าจะใช้แบบไหน
ก่อน implement จริง
