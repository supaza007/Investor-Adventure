# Pre-assessment graphic drop zone

ใช้โฟลเดอร์นี้สำหรับวางไฟล์ภาพต้นฉบับของหน้า `UI-015 Pre-assessment onboarding`
หรือหน้าแบบประเมินความเสี่ยงก่อนเริ่มเกม

ตำแหน่ง layout ที่ตั้งชื่อไฟล์ได้:

- `assessment-background.*` — พื้นหลังหลักของหน้า
- `assessment-eyebrow.*` — ป้ายข้อความเล็กด้านบน เช่น "ก่อนเริ่มเกม"
- `assessment-title.*` — หัวข้อใหญ่ของหน้า
- `assessment-disclaimer-panel.*` — แผงหรือกรอบข้อความอธิบายว่าไม่ใช่แบบทดสอบ TSI ทางการ
- `question-card-frame.*` — กรอบการ์ดคำถามแต่ละข้อ
- `question-number-badge.*` — ป้ายเลขคำถาม 1-10
- `answer-option-frame.*` — กรอบแถวตัวเลือกคำตอบ radio
- `answer-option-selected.*` — กรอบหรือ state เมื่อตัวเลือกถูกเลือก
- `validation-error-banner.*` — กรอบข้อความ error ตอนตอบไม่ครบ
- `submit-button.*` — ปุ่มหลัก "บันทึกและไปต่อ"
- `skip-button.*` — ปุ่มรอง "ข้าม · ไม่ประเมิน"
- `assessment-decoration-left.*` — ของตกแต่งด้านซ้าย
- `assessment-decoration-right.*` — ของตกแต่งด้านขวา
- `assessment-reference.*` — ภาพตัวอย่างรวมทั้งหน้าสำหรับอ้างอิง layout

กติกาการตั้งชื่อ:

- วางไฟล์เป็น PNG, WebP, JPG/JPEG หรือ SVG ได้
- ถ้าต้องการให้ดัดแปลงภาพ ให้ใส่คำสั่งในชื่อไฟล์ เช่น `assessment-background(ลบพื้นหลัง).png`
- ถ้าต้องการใช้เฉพาะ mobile หรือ desktop ให้ใส่ suffix เช่น `submit-button-mobile.png` หรือ `assessment-background-desktop.png`
- ไฟล์ต้นฉบับในโฟลเดอร์นี้จะถูกเก็บไว้ และไฟล์ runtime ที่ optimize แล้วจะถูกสร้างแยกใน `src/assets/`

Implementation notes:

- หน้าในโค้ดคือ `PreAssessmentScreen` ใน `src/components/LearningScreens.jsx`
- คำถามและ scoring อยู่ใน `src/game/learning.js`
- การเปลี่ยนภาพต้องไม่เปลี่ยนคำถาม คะแนน risk profile หรือกติกาเกม
- ต้องคง fieldset/legend/radio semantics, keyboard navigation, focus visible และ error text ที่ผู้เล่นอ่านเข้าใจ

## Integration log — 2026-08-21

- `assessment-background.jpg` → `Assessment Screen Shell`; converted to `src/assets/ui/pre-assessment-background-user.webp` and used as the page background.
- `questionnaire-frame.png` → per-question frame; converted to `src/assets/ui/pre-assessment-frame-user.webp` and used once for each of the 10 question fieldsets.
- `assessment-eyebrow.png` → scroll frame behind the "ก่อนเริ่มเกม" label; text remains live DOM text.
- `assessment-title.png` → scroll frame behind the main title; text remains live DOM text.
- `assessment-disclaimer-panel.png` → scroll frame behind the disclaimer; text remains live DOM text.
- `question-number-badge.png` → badge behind the live question number for each question.
- `answer-option-frame.png` → normal frame behind each live answer option row.
- `answer-option-selected.png` → selected-state frame behind the checked answer option row.
- Text containment: question legends, answer rows and validation errors now wrap inside their frames on narrow screens.
- Refinement: `questionnaire-frame` is no longer used as one large form wrapper and no longer overlaps the eyebrow/title/disclaimer scroll frames.
- Scope guardrail: no question text, answer scoring, risk-profile bands, consent behavior or game rules changed.
