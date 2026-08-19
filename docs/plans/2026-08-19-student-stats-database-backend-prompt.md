# Prompt สำหรับ Session ถัดไป: เชื่อมเกมเข้ากับ Supabase เพื่อเก็บสถิตินักเรียน

ใช้ prompt นี้เปิด session ใหม่ (หรือวางในข้อความแรก) เพื่อ implement การเชื่อมต่อ
Supabase ตามที่ออกแบบไว้แล้วใน
[docs/plans/2026-08-19-student-stats-database-design.md](2026-08-19-student-stats-database-design.md)
(ไม่ต้อง re-design ใหม่ — งานนี้คือ implement ตามดีไซน์ที่ยืนยันแล้ว)

**ก่อนเริ่ม:** ต้องมี Supabase project ที่รัน SQL setup script ในเอกสารดีไซน์ไปแล้ว (สร้าง
ตาราง `game_sessions` + `chapter_events` + RLS policy) และมี URL + anon key พร้อมใช้แล้ว
ถ้ายังไม่มี ให้ทำขั้นตอนนั้นก่อน (อยู่ในหัวข้อ "Backend setup" ของเอกสารดีไซน์)

---

## Prompt (คัดลอกทั้งหมดด้านล่างนี้ไปวางใน session ใหม่)

```
งาน: เชื่อมเกม "พอร์ตพิชิตเงินเฟ้อ" เข้ากับ Supabase เพื่อบันทึกผลการเล่นของนักเรียน
แต่ละคนลงฐานข้อมูล ให้ครูดูภาพรวมได้

บริบท: อ่าน docs/plans/2026-08-19-student-stats-database-design.md ทั้งไฟล์ก่อนเริ่ม —
มี schema ตาราง game_sessions/chapter_events, เหตุผลของแต่ละคอลัมน์, และ SQL setup
script ที่รันใน Supabase ไปแล้ว (สมมติว่า project พร้อมใช้แล้ว มี URL + anon key)

ไฟล์ที่เกี่ยวข้อง (อ่านก่อนแก้ เพื่อใช้ของเดิมซ้ำ ไม่เขียนใหม่):
- src/game/engine/report.js — buildReport() สร้าง object ที่ต้องใช้เป็น payload
  (finalValue, contributed, benchmark, ratio, multiple, band.id, isRuined, scamVictim,
  blackSwanCount, chapters[])
- src/game/engine/gameState.js บรรทัด ~269-286 — โครง entry ในแต่ละ chapters[] ตรงกับ
  คอลัมน์ตาราง chapter_events ทุกฟิลด์อยู่แล้ว
- src/components/CoverScreen.jsx — หน้าแรกสุดที่มีปุ่ม PLAY
- src/components/ReportScreen.jsx — หน้าแสดงผลสรุปตอนจบเกม (จุดที่ต้อง insert ข้อมูล)
- src/App.jsx — ตัวคุม phase/reducer หลัก

## 1. Environment setup
- เพิ่ม `.env` และ `.env.local` เข้า .gitignore (ตอนนี้ repo ยังไม่มีการจัดการ .env เลย
  ต้องเพิ่มเข้าไปก่อน อย่าลืม)
- สร้างไฟล์ `.env.example` (commit ได้ ไม่มีค่าจริง) มี 2 ตัวแปร:
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
- สร้าง `.env` จริง (ไม่ commit) ใส่ค่าจริงจาก Supabase project settings — ถ้าไม่มีค่าจริง
  ให้หยุดถามผู้ใช้ก่อน อย่าเดา/ใส่ placeholder แล้วเดินหน้าต่อ

## 2. ติดตั้ง client
npm install @supabase/supabase-js

สร้าง src/lib/supabaseClient.js — export client ตัวเดียวจาก
createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
ถ้า env var ไม่มีค่า (ลืมตั้ง .env) ให้ client เป็น null และฟังก์ชัน insert ข้างล่าง
ต้องเช็คก่อนเรียกทุกครั้ง (กันเกม crash ตอน dev ไม่มี .env)

## 3. เก็บชื่อ + ห้องเรียน
เพิ่ม 2 input (ชื่อนักเรียน, ห้องเรียน) ที่ CoverScreen.jsx คู่กับปุ่ม PLAY — ต้องกรอกทั้งคู่
ก่อนกดปุ่มได้ (ปุ่มเป็น disabled หรือกดแล้วเตือนถ้ายังไม่กรอกก็ได้ เลือกทางที่กระทบ UI เดิม
น้อยสุด) เก็บค่าไว้ใน state ที่ App.jsx (lift ขึ้นไปจาก CoverScreen เพราะต้องใช้ตอนจบเกมที่
ReportScreen ซึ่งเป็นคนละ component) — อย่าเปลี่ยน phase state machine ใน gameState.js
เพื่อรองรับเรื่องนี้ ให้เก็บเป็น React state แยกต่างหาก ไม่เกี่ยวกับ game engine

## 4. Insert ตอนจบเกม
ที่ ReportScreen.jsx (หรือจุดที่ report พร้อมแสดงผลครั้งแรก) เขียนฟังก์ชัน async
submitGameResult(report, styleId, studentName, classRoom) ทำ 2 อย่างตามลำดับ:
1. insert 1 แถวลง game_sessions คืนค่า id ที่ได้กลับมา
2. insert 4 แถวลง chapter_events (จาก report.chapters แต่ละอัน map field ตามตารางใน
   เอกสารดีไซน์ทุกตัว) ใส่ session_id เป็น id จากข้อ 1

เงื่อนไขสำคัญ:
- ต้อง insert แค่ครั้งเดียวต่อการเล่นจบ 1 รอบ ห้าม insert ซ้ำตอน re-render (ใช้ useRef
  เป็น flag กันซ้ำ)
- ถ้า insert fail (ไม่มีเน็ต, .env ไม่ครบ, Supabase ล่ม ฯลฯ) ห้ามเกมพัง/ห้าม block ผู้เล่น
  จาก การดูรายงานผล — catch error แล้ว log console.warn เฉยๆ ก็พอ ฟีเจอร์นี้เป็น
  "เก็บสถิติเสริม" ไม่ใช่ core gameplay
- ไม่ต้องมี loading state หรือ retry logic ซับซ้อน — fire-and-forget ก็พอสำหรับ scope นี้

## ห้ามเปลี่ยน
- src/game/engine/*.js ทั้งหมด (report.js, gameState.js, balance.js ฯลฯ) — ใช้ output
  ของเดิมตรงๆ ไม่แก้สูตร/ไม่เพิ่มฟิลด์ใหม่ในนั้น
- RLS policy ที่ตั้งไว้ใน Supabase (insert-only สำหรับ anon) — โค้ด frontend ต้องไม่
  พยายาม select/update/delete ตารางพวกนี้เลย

## ตรวจสอบก่อนจบงาน
รัน npm run dev เล่นเกมให้จบ 1 รอบ (Play → กรอกชื่อ/ห้อง → เลือกสไตล์ → เล่นจน
report):
- เข้า Supabase Table Editor เช็คว่า game_sessions มีแถวใหม่ค่าตรงกับที่เล่นจริง และ
  chapter_events มี 4 แถวผูกกับ session_id เดียวกันถูกต้อง
- ลองปิดเน็ตแล้วเล่นจบรอบหนึ่ง — เกมต้องแสดงหน้ารายงานได้ปกติ ไม่ค้าง/ไม่ error บนจอ
- เช็คว่า .env ไม่ถูก commit (git status ต้องไม่เห็นไฟล์นี้)
```
