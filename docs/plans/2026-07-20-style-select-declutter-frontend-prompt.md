# Prompt สำหรับ Session ถัดไป: ลดความรกของการ์ดรายละเอียด StyleSelect + สลับจุดแข็ง/จุดอ่อนขึ้นมาเป็นเนื้อหาหลัก

ใช้ prompt นี้เปิด session ใหม่ (หรือวางในข้อความแรก) เพื่อ implement การจัดวางหน้าจอเลือกสไตล์
นักลงทุนเวอร์ชันล่าสุด ที่ผ่านการออกแบบ/ทำ mockup ทีละขั้นร่วมกับผู้ใช้จนยืนยันแบบสุดท้ายแล้ว
(ไม่ต้อง re-design แนวคิดใหม่) — งานนี้ต่อยอดจาก
`docs/plans/2026-07-18-style-select-frontend-prompt.md` ที่ implement ไปแล้วก่อนหน้านี้
(แถบเทียบ 4 สไตล์ + StatBox กำไรเฉลี่ย/ป้องกันความเสี่ยง) โดยจัดโครงใหม่อีกรอบเพื่อลดความรก

mockup อ้างอิงที่ผ่านการยืนยันกับผู้ใช้แล้ว:
https://claude.ai/code/artifact/5d223a77-e2f3-4e4e-bdf2-70e0883be0e2

---

## Prompt (คัดลอกทั้งหมดด้านล่างนี้ไปวางใน session ใหม่)

```
งาน: ปรับ layout หน้าเลือกสไตล์นักลงทุน (StyleSelect.jsx) — ลดความรกของการ์ดรายละเอียด
+ สลับให้จุดแข็ง/จุดอ่อนเป็นเนื้อหาหลัก ย้ายตัวเลข %กำไร/%ป้องกันความเสี่ยงไปไว้ใน modal

บริบท: เกม "พอร์ตพิชิตเงินเฟ้อ" (React + Tailwind v4 + Vite) สอนความรู้การลงทุนให้
นักเรียน ม.6 หน้าที่จะแก้: src/components/StyleSelect.jsx (ปัจจุบันมี STYLE_GRAD,
PORTRAIT_POSITION, adjustLabel(), signedPct(), gainCaption(), defenseCaption(),
FreqDots component, CompareCard component, StatBox component อยู่แล้ว — อ่านโค้ดทั้งไฟล์
ก่อนแก้ เพื่อใช้ของเดิมซ้ำ ไม่ต้องเขียนใหม่)

ดีไซน์นี้ผ่านการ brainstorm + ทำ mockup ทีละขั้นกับผู้ใช้จนยืนยันแบบสุดท้ายแล้ว อ้างอิงได้ที่:
https://claude.ai/code/artifact/5d223a77-e2f3-4e4e-bdf2-70e0883be0e2

## สรุปการเปลี่ยนแปลง (เทียบกับโค้ดปัจจุบัน)

### 1. CompareCard (แถบเทียบ 4 สไตล์บนสุด) — ตัดเหลือแค่ภาพ+ชื่อ
ตอนนี้ CompareCard โชว์ portrait + ชื่อ + FreqDots + signedPct(gainPct) — **ตัด FreqDots
กับตัวเลขกำไรออกทั้งคู่** เหลือแค่ portrait (ขยายขึ้นเล็กน้อยเพราะมีที่ว่างมากขึ้น) + ชื่อสไตล์
เท่านั้น ตัวที่เลือกอยู่ยังไฮไลต์กรอบเหมือนเดิม (`outline outline-2 ... outline-yellow-400`)

### 2. การ์ดรายละเอียด (โค้ดปัจจุบันอยู่บรรทัด ~137-207) — จัดใหม่ทั้งหมด
**ตัดออกจาก default view:** `style.tagline`, StatBox "กำไรเฉลี่ย", StatBox "ป้องกันความเสี่ยง"
(สองอันนี้ย้ายไป modal ข้อ 3), `adjustLabel(style)` chip, fee/buyDip chips, `style.lesson`
— ทั้งหมดยังใช้อยู่ แค่ย้ายไป modal ไม่ได้ลบทิ้ง

**ลำดับใหม่ของ default view (บนลงล่าง):**
1. หัวการ์ด: portrait (ใช้ `fit="cover"` + `PORTRAIT_POSITION[style.id]` เดิม ขนาดเล็กลงจาก
   เดิมได้ เช่น h-16/w-16 sm:h-20/w-20 เพราะไม่ต้องแบ่งพื้นที่กับ StatBox แล้ว) วางข้างชื่อ+badge
   แบบแถวเดียว (flex gap) แทนที่จะเป็นคนละแถวเหมือนเดิม
2. แถวเดียวกัน จัด `justify-between`: `style.persona` (ซ้าย, ตัวเอียง) กับ FreqDots ของเดิม
   พร้อมป้ายเล็ก "ปรับพอร์ตได้/ครั้ง" (ขวา, ชิดขวา)
3. **จุดแข็ง/จุดอ่อน (✓/✗) — ย้ายมาเป็นเนื้อหาหลัก เด่นขึ้นกว่าเดิม** ให้แต่ละบรรทัดมีพื้นหลัง
   โทนสีอ่อนๆ ตามความหมาย + เส้นขอบซ้ายหนา 3px:
   - ✓ `style.pros`: `bg-emerald-500/10 border-l-[3px] border-emerald-400`
   - ✗ `style.cons`: `bg-rose-500/10 border-l-[3px] border-rose-400`
   (ก่อนหน้านี้สองบรรทัดนี้เป็นแค่ตัวหนังสือเล็กสีจางอยู่ท้ายๆ การ์ด ตอนนี้ต้องเด่นเป็นอันดับ 2
   รองจากชื่อ/persona)
4. แถวลิงก์ "ⓘ ดูรายละเอียดเพิ่มเติม" (กรอบเส้นประจางๆ กดแล้วเปิด modal ข้อ 3) — เขียน
   caption สั้นๆ กำกับว่ามีอะไรข้างในบ้าง เช่น "(tagline · กำไรเฉลี่ย/ป้องกันความเสี่ยงเทียบ
   4 สไตล์ · กลไกปรับพอร์ต · บทเรียน)"

ปุ่ม ◀▶ + "เลือกตัวละครนี้" ข้างล่างสุด — คงเดิมทั้งหมด ไม่แตะ

### 3. Modal รายละเอียดใหม่ (component ใหม่ เช่น `StyleDetailModal`)
ใช้ pattern เดียวกับ `ToolDetailModal` ใน `src/components/AllocationScreen.jsx`
(`fixed inset-0 z-50 bg-black/85` + `pixel-frame` กล่องกลาง + ปุ่มปิดท้าย) — เปิด/ปิดด้วย
state ใหม่ `const [showDetail, setShowDetail] = useState(false)` ในคอมโพเนนต์หลัก
(pattern เดียวกับ `detailTool` ใน AllocationScreen.jsx)

เนื้อหา modal (บนลงล่าง):
1. ชื่อสไตล์ (header เล็ก)
2. `style.tagline`
3. หัวข้อย่อย "กลไกปรับพอร์ต" + กล่อง `adjustLabel(style)` เดิม
4. หัวข้อย่อย "ตัวเลขเทียบ 4 สไตล์" + grid 2 คอลัมน์ ของ StatBox เดิม 2 อัน (กำไรเฉลี่ย,
   ป้องกันความเสี่ยง) — **แต่ละ StatBox ต้องมี mini bar chart ใหม่ (ข้อ 4) ต่อท้าย value/
   caption เดิม ไม่ใช่แค่ตัวเลขเปล่าๆ แบบเดิม**
5. fee/buyDip chips เดิม (เงื่อนไข `style.tradeFeePct || style.buyDipMult` เหมือนเดิม)
6. `style.lesson` เดิม
7. ปุ่มปิด

### 4. Component ใหม่: mini bar chart เทียบ 4 สไตล์ (เช่น `StyleCompareBars`)
วางไว้ใน StatBox ของ "กำไรเฉลี่ย" กับ "ป้องกันความเสี่ยง" ในโมดัล (ข้อ 3.4) — โชว์แท่งเล็ก 4
แท่งของทั้ง 4 สไตล์ในกล่องเดียวกัน:
- เส้นฐานแนวนอนที่กึ่งกลางความสูง (= 0) — แท่งขึ้นบนถ้าค่าเป็นบวก ลงล่างถ้าค่าเป็นลบ
  ความสูงแท่ง = สัดส่วนเทียบค่าที่สูงสุด (max ของ |ค่า| ทั้ง 4 สไตล์) ไม่ใช่ scale ตายตัว
- **สำคัญ — ต้องมี emoji ของแต่ละสไตล์กำกับใต้แท่งเสมอ** (ผ่านการทดสอบกับผู้ใช้มาแล้วว่า
  ถ้าไม่มี label จะดูไม่ออกว่าแท่งไหนคือสไตล์ไหน อย่าตัดออก) — ใช้ `style.emoji` เดิมที่มีอยู่
  ในข้อมูลแล้ว ไม่ต้องเพิ่ม field ใหม่
- แท่ง+ label ของสไตล์ที่กำลังดูรายละเอียดอยู่ (ตัว index ปัจจุบัน) ให้เป็นสีทอง/เหลืองเด่น
  (ไม่ว่าค่าจะเป็นบวกหรือลบ) label ใหญ่กว่าเล็กน้อย ส่วนอีก 3 สไตล์ให้แท่งและ label จางลง
  (เช่น opacity 20-35%)
Props แนะนำ: `<StyleCompareBars values={getStyles().map(x => x.gainPct หรือ defensePct)} selectedIndex={index} />`
(gainPct/defensePct ต้องคำนวณแบบเดียวกับที่ StatBox ใช้อยู่แล้วในโค้ดปัจจุบัน — ดู
`Math.round((style.returnMult - 1) * 100)` และ `Math.round((1 - style.shockMult) * 100)`
ที่มีอยู่แล้วในไฟล์ อย่าคำนวณซ้ำเป็นสูตรใหม่)

## ห้ามเปลี่ยน
- prop `onSelect(styleId)` signature เดิม, App.jsx ไม่ต้องแก้
- pixel-frame / pixel-btn / pixel-chip / STYLE_GRAD / PORTRAIT_POSITION / Portrait /
  PortraitPlaceholder / characterArtOf / carousel state (index/prev/next) / slide-in
  animation / ปุ่ม ◀▶ / ปุ่ม "เลือกตัวละครนี้" — ทั้งหมดคงไว้ตามเดิม
- เนื้อหาข้อมูลใน src/game/engine/data/styles.js (persona/pros/cons/tagline/lesson) —
  ไม่ต้องแก้ ของเดิมถูกต้องแล้ว งานนี้คือย้ายตำแหน่งที่แสดงผลเท่านั้น ไม่ใช่แก้เนื้อหา
- ฟังก์ชัน `adjustLabel()` / `signedPct()` / `gainCaption()` / `defenseCaption()` /
  component `FreqDots` / `StatBox` — ใช้ของเดิมซ้ำทั้งหมด อย่าเขียนใหม่

## ตรวจสอบก่อนจบงาน
รัน `npm run dev` เปิดหน้า StyleSelect (Play → เลือกสไตล์):
- แถบเทียบบนสุดเห็นแค่ภาพ+ชื่อ 4 สไตล์ คลิกแล้วสลับการ์ดรายละเอียดด้านล่างถูกต้อง
- การ์ดรายละเอียด: persona คู่กับ FreqDots แถวเดียวกัน, ✓/✗ จุดแข็ง-จุดอ่อนเด่นมีสีพื้นหลัง
  กำกับ, ไม่มี tagline/StatBox ตัวเลขกำไร-ป้องกัน/adjustLabel chip/lesson โผล่ในจอหลักแล้ว
- กด "ⓘ ดูรายละเอียดเพิ่มเติม" เปิด modal เห็นครบ: tagline, กลไกปรับพอร์ต, กราฟแท่งเทียบ
  4 สไตล์ (มี emoji กำกับใต้ทุกแท่ง ตัวที่เลือกอยู่เป็นสีทองเด่น), ค่าธรรมเนียม/โบนัส (ถ้ามี), lesson
- ปิด modal แล้ว ◀▶ และแถบเทียบด้านบนยังสลับสไตล์ได้ปกติ กด "เลือกตัวละครนี้" ยัง
  dispatch SELECT_STYLE ทำงานถูกต้อง
- เช็ค mobile landscape ไม่ล้นจอ โดยเฉพาะ modal ที่ต้อง scroll ได้ถ้าเนื้อหายาว
```
