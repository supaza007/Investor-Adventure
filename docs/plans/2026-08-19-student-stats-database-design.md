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
| `black_swan_count` | int | `report.blackSwanCount` |

### ตาราง `chapter_events` (4 แถว / รอบ — 1 แถวต่อบท)

| คอลัมน์ | ชนิด | มาจาก |
|---|---|---|
| `id` | uuid, pk, default `gen_random_uuid()` | — |
| `session_id` | uuid, FK → `game_sessions.id` on delete cascade | — |
| `chapter_n` | int | `entry.chapter` |
| `event_id` | text | `entry.eventId` |
| `event_name` | text | `entry.eventName` |
| `is_black_swan` | boolean | `entry.isBlackSwan` |
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

## จุดที่ implement (เมื่อพร้อมลงมือ — ยังไม่ทำในดีไซน์นี้)

- ติดตั้ง `@supabase/supabase-js`
- เพิ่มฟอร์มกรอกชื่อ+ห้อง ก่อนเริ่มเกม (หรือหน้า cover) — ยังไม่มีอยู่ในโค้ดตอนนี้
- ที่ [ReportScreen.jsx](../../src/components/ReportScreen.jsx) ตอนแสดงผลสรุป: insert 1 แถว
  ลง `game_sessions` แล้ว insert 4 แถวลง `chapter_events` จาก `report.chapters`
- ตั้งค่า RLS policy ตามหัวข้อด้านบนตั้งแต่สร้างตาราง

## เรื่องค้างจากเซสชันนี้ (ไม่เกี่ยวกับ database — บันทึกไว้กันลืม)

ระหว่างเช็คโค้ดพบว่ามีดีไซน์ลดความรกหน้า StyleSelect ที่ผ่านการยืนยันกับผู้ใช้ไปแล้วก่อน
หน้านี้ (ดู [2026-07-20-style-select-declutter-frontend-prompt.md](2026-07-20-style-select-declutter-frontend-prompt.md))
แต่ดูเหมือนยังไม่เคย implement — เป็นดีไซน์คนละแบบกับที่ brainstorm กันในเซสชันนี้ (แบบเก่าใช้
modal + กราฟแท่ง, เซสชันนี้ใช้ toggle พับ/กาง + จุดระดับ) ต้องคุยกับผู้ใช้ว่าจะใช้แบบไหน
ก่อน implement จริง
