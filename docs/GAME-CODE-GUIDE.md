# คู่มืออ่านและปรับโค้ดเกม Investor Adventure

เอกสารนี้อธิบายว่าโค้ดส่วนไหนควบคุมหน้าจอ ข้อความ คำถาม คะแนน กติกาการลงทุน และผลลัพธ์ของเกม

ขอบเขตของคู่มือนี้คือโค้ดที่ทีมผู้พัฒนาแก้บ่อยใน `src/` และสคริปต์ตรวจเกมใน `scripts/` ไม่รวม `node_modules/`, `dist/` และไฟล์ภาพที่ build แล้ว

## ก่อนแก้โค้ด

1. เปิดโปรเจกต์โฟลเดอร์ `F:\เกมการลงทุน บูรณาการ` ใน VS Code
2. เปิด Terminal ด้วย `Ctrl + ``
3. รัน `npm run dev`
4. แก้ไฟล์แล้วกด `Ctrl + S` จากนั้นดูผลที่ `http://localhost:5173/`
5. ก่อนจบงานรัน `npm test` และถ้าแก้ตัวเลขเกมให้รัน `npm run sim`

กฎสำคัญ: อย่าเปลี่ยน `id`, ชื่อ key ของ state, ลำดับ stage หรือคะแนนโดยไม่ตรวจ test ที่เกี่ยวข้อง เพราะระบบส่วนอื่นอ้างอิงค่าเหล่านี้อยู่

## แผนที่ไฟล์หลัก

| ต้องการปรับ | ไฟล์ | จุดที่ค้นหา |
|---|---|---|
| ลำดับหน้าเกม | `src/App.jsx` | `journey`, `return`, `PreAssessmentScreen` |
| หน้าเริ่มเกม | `src/components/CoverScreen.jsx` | `GAME_TITLE`, `label`, `button` |
| หน้าเลือกสไตล์ | `src/components/StyleSelect.jsx` | `STYLES`, `name`, `tagline`, `pros`, `cons` |
| หน้าแบบประเมิน | `src/components/LearningScreens.jsx` | `PreAssessmentScreen`, `Questions` |
| คำถาม/ตัวเลือก | `src/game/learning.js` | `PRE_QUESTIONS`, `POST_QUESTIONS` |
| ตัวเลขบาลานซ์ | `src/game/engine/balance.js` | `BALANCE` |
| เหตุการณ์ | `src/game/engine/data/events.js` | `EVENTS` |
| สไตล์นักลงทุน | `src/game/engine/data/styles.js` | `STYLES` |
| เครื่องมือการเงิน | `src/game/engine/data/tools.js` | `TOOLS` |
| สูตรพอร์ต | `src/game/engine/portfolio.js` | `applyGrowth`, `rebalance` |
| สูตรผลเหตุการณ์ | `src/game/engine/encounter.js` | `returnsForEvent`, `applyEventReturns` |
| state machine | `src/game/engine/gameState.js` | `createInitialState`, `dispatch` |
| แสดงผลลัพธ์ | `src/components/ReportScreen.jsx` | `report`, `readiness` |
| สี/ฟอนต์/ขนาด | `src/index.css` | class ที่ขึ้นต้นด้วย `assessment-`, `cozy-`, `pixel-` |
| บันทึกข้อมูลผู้เล่น | `src/lib/playerData.js` | `buildPlayerPayload`, `submitPlayerData` |

## 1. เปลี่ยนข้อความหน้าแบบประเมิน

เปิด `src/components/LearningScreens.jsx` แล้วค้นหา `PreAssessmentScreen`.

ข้อความ 3 จุดด้านบนคือ:

```jsx
ก่อนเริ่มเกม                         // ป้ายเล็ก
แบบประเมินของผู้กล้า                 // หัวข้อใหญ่
อยากรู้ไหมว่า ...                     // คำอธิบาย
```

ปุ่มอยู่ใน `Questions`:

```jsx
actionLabel="บันทึกและไปต่อ"           // ปุ่มส่งคำตอบ
ข้าม                                    // ปุ่มข้ามแบบประเมิน
กรุณาตอบทุกข้อ ...                      // ข้อความเมื่อกรอกไม่ครบ
```

เปลี่ยนเฉพาะข้อความระหว่างเครื่องหมาย quote หรือข้อความที่อยู่ระหว่าง tag เท่านั้น อย่าลบ `onSubmit`, `onSkip`, `className` หรือ `style`.

## 2. เปลี่ยนคำถามและตัวเลือก

เปิด `src/game/learning.js`.

`PRE_QUESTIONS` คือคำถามก่อนเล่น 10 ข้อ ส่วน `POST_QUESTIONS` คือคำถามหลังเล่น 3 ข้อ

โครงสร้างหนึ่งข้อ:

```js
{
  id: 'life_stage',
  prompt: 'ข้อความคำถาม',
  options: [
    ['2', 'ข้อความตัวเลือก ก'],
    ['1', 'ข้อความตัวเลือก ข'],
    ['0', 'ข้อความตัวเลือก ค']
  ]
}
```

- `prompt` คือ Text ของคำถาม
- ข้อความตัวที่สองใน `options` คือ Text ของตัวเลือก
- ตัวเลขตัวแรกคือคะแนนที่ใช้คำนวณผล
- `id` ใช้เป็นชื่ออ้างอิง ห้ามเปลี่ยนถ้าไม่ได้แก้ test และระบบบันทึกข้อมูลด้วย

## 3. ปรับขนาด Text หน้าแบบประเมิน

เปิด `src/index.css`.

```css
.assessment-scroll-label--eyebrow  /* “ก่อนเริ่มเกม” */
.assessment-scroll-label--title    /* หัวข้อใหญ่ */
.assessment-scroll-label--disclaimer /* คำอธิบาย */
.assessment-question-legend        /* Text คำถาม */
.assessment-answer-row              /* Text ตัวเลือก a/b/c */
```

ขนาดหัวข้อใน JSX ใช้ utility class เช่น `text-xs`, `text-sm`, `text-2xl`, `sm:text-4xl`.

ขนาดตัวเลือกอยู่ที่ `font-size` ใน `.assessment-answer-row` โดยใช้ `clamp()` เพื่อให้ขนาดปรับตามหน้าจอ:

```css
font-size: clamp(0.78rem, 0.7rem + 0.45vw, 1rem);
```

## 4. ปรับตัวเลขและโครงเกม

เปิด `src/game/engine/balance.js`.

- `chapters` = จำนวนบท อายุ ธีม และเงินเติมแต่ละบท
- `retireAge` = อายุเกษียณ
- `stages` = ลำดับสเตจในแต่ละบท
- ค่าผลตอบแทน ค่าธรรมเนียม และขีดจำกัดต่าง ๆ อยู่ใน `BALANCE`

หลังแก้ตัวเลขให้รัน:

```bash
npm test
npm run sim
```

ถ้าแก้ตัวเลขให้ผลลัพธ์ชนะ/แพ้เปลี่ยน ควรอ่าน test ใน `src/game/engine/` และตรวจว่าเกมยังสอนเรื่องการกระจายความเสี่ยงถูกต้อง

## 5. ปรับเหตุการณ์

เปิด `src/game/engine/data/events.js`.

แต่ละเหตุการณ์มี `id`, `name`, `description`, `hint`, `primaryTag`, `crisisRank`, `returns` และ `impactReasons`.

- `name` = ชื่อที่แสดงบนหน้าจอ
- `description` = คำอธิบายเหตุการณ์
- `hint` = สัญญาณก่อนเกิดเหตุการณ์
- `primaryTag` = หมวดเหตุการณ์ที่ใช้จัด pool
- `crisisRank` = ลำดับสำหรับเลือกวิกฤตใหญ่ของบท 3 ไม่ได้คูณผลตอบแทน
- `returns` = เปอร์เซ็นต์ตายตัวของ `bond`, `fund`, `stock`, `crypto`
- `impactReasons` = คำอธิบายสั้น ๆ ที่ UI แสดงคู่กับตัวเลขแต่ละสินทรัพย์

อย่าเปลี่ยน `id` หากไม่จำเป็น เพราะ report และ test ใช้ id เป็นตัวอ้างอิง

## 6. ปรับสไตล์นักลงทุน

เปิด `src/game/engine/data/styles.js`.

- `name` = ชื่อสไตล์
- `tagline`, `persona`, `pros`, `cons` = Text ที่หน้าเลือกสไตล์
- `canAdjustAt` = สเตจที่สไตล์ปรับพอร์ตได้
- `returnMult` = ตัวคูณผลตอบแทน
- `tradeFeePct` = ค่าธรรมเนียมการปรับพอร์ต (มีเฉพาะบางสไตล์)
- `buyDipMult` = โบนัสการฟื้นตัวเมื่อซื้อเพิ่ม (มีเฉพาะบางสไตล์)

สไตล์ไม่เปลี่ยนเปอร์เซ็นต์ใน Event Return Matrix เพื่อให้ผลที่ UI อธิบายตรงกับเอนจิน

การแก้ multiplier เปลี่ยนความยากและบทเรียนของเกมโดยตรง ต้องรัน simulation ทุกครั้ง

## 7. ปรับเครื่องมือการเงิน

เปิด `src/game/engine/data/tools.js`.

- `name` = ชื่อเครื่องมือบนหน้าจอ
- `lesson` = บทเรียนที่ผู้เล่นอ่าน
- `growthMult` = ผลตอบแทนกลางต่อบท
- `growthVol` = ความผันผวนของผลตอบแทน

ห้ามทำเครื่องมือให้ปลอดภัยทุกเหตุการณ์ เพราะ test ของเกมตรวจว่าผู้เล่นต้องเห็น trade-off จริง

## 8. เข้าใจ state machine

ไฟล์หลักคือ `src/game/engine/gameState.js`.

ลำดับโดยย่อ:

```text
เริ่มเกม → เลือกสไตล์ → จัดพอร์ต → เหตุการณ์/การตัดสินใจ
→ จบบท → เริ่มบทถัดไป → ครบ 4 บท → รายงาน
```

`state` คือข้อมูลปัจจุบันของเกม ส่วน command/action คือคำสั่งจาก UI เช่น จัดพอร์ต ไปต่อ หรือเริ่มใหม่

ถ้าจะเพิ่มปุ่มหรือการตัดสินใจใหม่ ต้องตรวจทั้ง `command.js`, `gameState.js`, `useGameCommand.js` และ test ที่เกี่ยวข้อง

## 9. ปรับภาพและหน้าตา

คอมโพเนนต์หน้าจออยู่ใน `src/components/`.

- `CoverScreen.jsx` = หน้าปก
- `StyleSelect.jsx` = เลือกสไตล์
- `AllocationScreen.jsx` = จัดพอร์ต
- `StageScreen.jsx` = เหตุการณ์และการตัดสินใจ
- `ChapterTransition.jsx` = เปลี่ยนบท
- `ReportScreen.jsx` = รายงานผล
- `LearningScreens.jsx` = แบบประเมินและ consent

รูปภาพที่ import อยู่ใน `src/assets/`. ถ้าแก้แค่ขนาด/สี/ระยะห่าง ให้แก้ class ใน JSX หรือ selector ใน `src/index.css` ก่อนแก้ไฟล์ภาพ

## 10. การตรวจสอบหลังแก้

```bash
npm test
npm run sim
npm run build
```

เช็กอย่างน้อย:

- หน้าแบบประเมินเปิดได้และ Text ไม่ล้นกรอบ
- ตอบครบแล้วไปต่อได้
- ข้ามแบบประเมินได้
- เกมเล่นครบ 4 บทและเปิดรายงานได้
- ตัวเลือกที่เลือกแล้วเห็นสถานะชัดเจน
- มือถือแนวตั้งและแนวนอนไม่มี scroll แนวนอนผิดปกติ

## รูปแบบคอมเมนต์ในโค้ด

JavaScript/JSX ใช้:

```js
// อธิบายหน้าที่ของส่วนนี้
```

JSX ใช้:

```jsx
{/* TEXT: ข้อความที่ผู้เล่นเห็น — จุดที่ปรับได้ */}
```

CSS ใช้:

```css
/* ป้ายนี้ควบคุม Text อะไร และปรับค่าใดได้บ้าง */
```

คอมเมนต์ควรอธิบาย “ทำไม” และ “จุดนี้กระทบอะไร” ไม่จำเป็นต้องบรรยายทุกบรรทัดที่อ่านได้จากชื่อโค้ด
