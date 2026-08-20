# Decision Log

> Active คือข้อสรุปที่อนุมัติแล้ว; ข้อเสนอใหม่ยังเป็น Proposed จนกว่า owner จะยืนยัน

## Decision Index

| ID | Title | Status | Date | Owner |
|---|---|---|---|---|
| ADR-2026-001 | ใช้เอกสาร 6 ไฟล์เป็นหน่วยความจำกลาง | Active | 2026-08-20 | Project Owner |
| ADR-2026-002 | ใช้ TBD แทนการเดาข้อมูล | Active | 2026-08-20 | Documentation System |
| ADR-2026-003 | Determinism = seed + actions + versions | Proposed | 2026-08-20 | Game/Technical Lead |
| ADR-2026-004 | ใช้ market-value allocation เป็นโมเดล MVP | Proposed | 2026-08-20 | Game Design |
| ADR-2026-005 | แยก Transaction จาก valuation Domain Event | Proposed | 2026-08-20 | Technical Lead |
| ADR-2026-006 | Engine validation และ atomic rejection | Active | 2026-08-20 | Project Owner / Technical Lead |
| ADR-2026-007 | ยืนยัน action ที่กระทบเงินหรือความเสี่ยงก่อน commit | Proposed | 2026-08-20 | UI/UX |
| ADR-2026-008 | แสดง exposure หลายด้านและไม่พึ่งสี | Proposed | 2026-08-20 | UI/UX |
| ADR-2026-009 | ใช้คะแนนความพร้อมเกษียณหลายมิติในสถานการณ์จำลอง | Active | 2026-08-20 | Project Owner |

## ADR-2026-001 — ใช้เอกสาร 6 ไฟล์เป็นหน่วยความจำกลาง

- Status: Active
- Decision: ใช้ PROJECT_CONTEXT, GAME_DESIGN, SYSTEM_SPEC, UI_SPEC, PROJECT_STATUS และ DECISIONS เป็น source of truth แยกตามหน้าที่; feature ที่ว่าเสร็จต้องมีหลักฐาน code/test

## ADR-2026-002 — ใช้ TBD แทนการเดาข้อมูล

- Status: Active
- Decision: ข้อมูลที่ไม่มีหลักฐานหรือคำยืนยันต้องระบุ TBD, Assumption หรือ Proposed

## ADR-2026-003 — Determinism = seed + actions + versions

- Status: Proposed
- Date: 2026-08-20
- Owner: Game/Technical Lead

### Context and Options

โค้ดทำซ้ำได้ด้วย seed/actions แต่ balance/content/RNG call order ที่เปลี่ยนทำให้ผลเปลี่ยนได้ ทางเลือก: (1) seed อย่างเดียว—ง่ายแต่ fragile; (2) seed + ordered validated actions + rules/content/RNG versions; (3) บันทึกผลสุ่มทุกครั้ง—แม่นแต่ซ้ำและใหญ่

### Decision

เสนอข้อ 2: เพิ่ม initialSeed, schemaVersion, rulesVersion, contentVersion, rngAlgorithm และ commandSeq

### Consequences / Validation

balance/content change ต้องใช้ version policy; golden replay ต้องเทียบ state/report hash ข้าม compatible builds

## ADR-2026-004 — ใช้ market-value allocation เป็นโมเดล MVP

- Status: Proposed
- Date: 2026-08-20
- Owner: Game Design

### Context and Options

เกมปัจจุบันจัดสรร net worth และเก็บมูลค่าต่อ asset ไม่มี price/quantity/cost basis ทางเลือก: (1) รักษา allocation; (2) เพิ่ม lots/cost basis; (3) order-book simulation

### Decision

เสนอข้อ 1 สำหรับ MVP; P/L หมายถึง change in market value ไม่ใช่ realized tax P/L ตัวเลือก 2–3 ต้องมี learning objective และ owner อนุมัติใหม่

### Consequences / Validation

ledger บันทึก value transfer; playtest ต้องยืนยันว่าผู้เรียนเข้าใจหน่วยและ abstraction

## ADR-2026-005 — แยก Transaction จาก valuation Domain Event

- Status: Proposed
- Date: 2026-08-20
- Owner: Technical Lead

### Context and Options

ทางเลือก: history summary เท่านั้น; ledger เดียวรวมทุก change; หรือ transactions สำหรับ value transfer และ domain events สำหรับ growth/shock/decision

### Decision

เสนอทางเลือกที่ 3; IDs deterministic จาก command/event sequence ไม่ใช้ wall-clock หรือ random UUID

### Consequences / Validation

report ต้องใช้ canonical records โดยไม่คำนวณสูตรซ้ำ; property test ตรวจ opening + flows + valuation = closing

## ADR-2026-006 — Engine validation และ atomic rejection

- Status: Active
- Date: 2026-08-20
- Owner: Technical Lead

### Context and Options

UI อาจกัน input ปกติ แต่ reducer ยังรับ malformed weights, unknown behavior และข้าม required decisions ได้ ทางเลือก: validate UI เท่านั้น, engine เท่านั้น, หรือทั้งสองชั้น

### Decision

validate ทั้ง UI เพื่อ feedback และ engine เป็น authoritative boundary; invalid command คืน structured error และ state เดิม คำสั่งของผู้ใช้ใน Lead Developer Session นี้อนุมัติให้ implement engine contract โดยยังไม่ต้อง migrate UI เต็มรูปแบบ

### Consequences / Validation

เพิ่ม enum/finite/range/ID/phase/required-decision checks และ fuzz tests; engine error code แยกจากข้อความภาษาไทย

## ADR-2026-007 — ยืนยัน action ที่กระทบเงินหรือความเสี่ยงก่อน commit

- Status: Proposed
- Date: 2026-08-20
- Owner: UI/UX
- Scope: Allocation, behavior, scam UI
- Context: Allocation ปัจจุบันส่ง `CONFIRM_ALLOCATION` จาก draft ทันทีโดยยังไม่มี review UI และ decision แก้ย้อนหลังไม่ได้
- Decision: review allocation; behavior confirm inline; accept scam confirm ซ้ำพร้อมจำนวนเสี่ยง; reject ไม่เพิ่ม friction
- Consequences: ไม่เปลี่ยน Session 1 logic; Session 3 แยก draft/preview/commit และกัน double submit
- Validation: cancel ไม่ dispatch, confirm dispatch ครั้งเดียว, error ไม่เปลี่ยนเงิน
- References: UI-005, UI-006, UI-010, UI-011; FR-003; NFR-002/003/004

## ADR-2026-008 — แสดง exposure หลายด้านและไม่พึ่งสี

- Status: Proposed
- Date: 2026-08-20
- Owner: UI/UX
- Scope: HUD, portfolio, feedback
- Context: Engine มี exposure 4 tag/concentration แต่ไม่มี risk score เดียว
- Decision: แสดง exposure 4 ด้านและ concentration แยก; gain/loss ใช้ icon+word+number คู่สี
- Consequences: ไม่เปลี่ยน Session 1 logic; Session 3 ต้องส่ง selector และ text equivalent
- Validation: แยกสถานะได้ใน grayscale และด้วย screen reader
- References: UI-C01, UI-C03, UI-C04; NFR-003

## ADR-2026-009 — ใช้คะแนนความพร้อมเกษียณหลายมิติในสถานการณ์จำลอง

- Status: Active
- Date: 2026-08-20
- Owner: Project Owner
- Scope: End report, learning assessment and research evidence

### Context and Options

รายงานปัจจุบันวัดผลด้วยมูลค่าพอร์ตเทียบ benchmark ซึ่งไม่ครอบคลุมปัจจัยการเกษียณของไทยที่มีทั้งการเงิน สุขภาวะ และความพร้อมชีวิต ทางเลือกคือ (1) คงคะแนนพอร์ตเป็นผลหลักแล้วเพิ่มคำอธิบาย หรือ (2) ใช้คะแนนความพร้อมหลายมิติ โดยพอร์ตเป็นหนึ่งมิติ

### Decision

เลือกข้อ 2: แสดง Retirement Readiness ในสถานการณ์จำลอง 4 มิติ ได้แก่ financial readiness, plan resilience, life/health readiness และ financial capability/safety. ห้ามใช้เป็นการประเมินความพร้อมจริงหรือคำแนะนำการลงทุนส่วนบุคคล

### Consequences / Validation

- ต้องสร้าง FR-019 และ NFR-013 พร้อม source registry
- มิติที่ไม่มี input ต้องแสดง `Not assessed` ไม่ประดิษฐ์คะแนน
- สูตรน้ำหนักและ cut-off ต้องผ่าน finance/content reviewer และ playtest ก่อนใช้
- แหล่งเริ่มต้น: CMRI Retirement Readiness Index 2566, BOT retirement/financial-literacy research, SEC/SET education, และงานวิจัย later-life well-being ในไทย

## ADR-2026-010 — ใช้สูตรมูลค่าเงินสดจริงตามเงินเฟ้ออ้างอิง ธปท.

- Status: Active
- Date: 2026-08-20
- Owner: Game System Architect
- Scope: Cash purchasing-power transition between chapters

### Context and Decision

สูตรเดิม `cash × 0.85` เป็นค่าจูนเกมที่ไม่มีหลักฐานอ้างอิงโดยตรง จึงเปลี่ยนเป็น `cash × (1 + inflationAnnualRate)^(-yearsPerChapter)`. ใช้ `inflationAnnualRate = 0.02` เป็นค่ากลางของกรอบเป้าหมายเงินเฟ้อไทย 1–3% ของธนาคารแห่งประเทศไทย และ `yearsPerChapter = 10` ตามโครงเกม. ค่า 2% ยังคงเป็น simulation assumption; ไม่ใช่การพยากรณ์หรือคำแนะนำการเงิน.

### Consequences / Validation

- `cashDecayPerChapter` ใหม่ประมาณ 0.8203 แทน 0.85
- ต้องแสดงสูตรและ source ID ในเอกสาร/หน้าความช่วยเหลือ
- หากเปลี่ยนกรอบเงินเฟ้อหรือความยาวบท ต้องคำนวณค่าใหม่แบบ deterministic
- ทดสอบด้วยสูตรอ้างอิงและ replay seed เดิม

### Reference

- BOT Monetary Policy Target: https://www.bot.or.th/th/our-roles/monetary-policy/monetary-policy-target.html

## ADR-2026-011 — ใช้ Black Swan แบบ systemic shock profile

- Status: Active (ตัวเลขยัง Proposed/Expert-calibrated)
- Date: 2026-08-20
- Decision: ทุกสินทรัพย์ได้รับผลกระทบจาก Black Swan แต่ใช้ shock profile ต่างกัน เพื่อให้ diversification ยังลดความเสียหายได้บางส่วน
- Profile ปัจจุบัน: bond 0.35, fund 0.55, stock 0.80, crypto 1.20
- ข้อจำกัด: ค่าตัวเลขเป็น simulation parameter ต้องผ่าน finance/content review ก่อนใช้เป็นข้ออ้างเชิงสถิติ

## ADR-2026-012 — ประเมินก่อน/หลังเล่นและเก็บวิจัยแบบ opt-in

- Status: Active
- Date: 2026-08-20
- Decision: ใช้คำถามก่อนเล่นที่ดัดแปลงจากแนวคิด SET TSI (ไม่อ้างว่าเป็น TSI ทางการ), ไม่มีคำถามแทรกระหว่างเล่น, และใช้ post-assessment 3 ด้าน: เงินเฟ้อ/กำลังซื้อ, risk-return/diversification, fees/scam
- ผลต้องแยก `portfolioOutcome`, `luck`, `knowledgeGain`; ไม่ใช้กำไรเป็นคะแนนความรู้
- การส่งข้อมูลวิจัยต้อง opt-in แยกจากเงื่อนไขการเล่น และเก็บด้วย anonymousPlayerId/runId
- บันทึกเวลา run/chapter/stage เมื่อมี timestamp จาก telemetry; ไม่เก็บทุกคลิกโดยไม่จำเป็น
- References: SET TSI, BOT Financial Literacy Survey, OECD/INFE Toolkit, SEC investor education, GPPC PDPC

## Pending Decisions

| Topic | Options/why | Owner | Needed by |
|---|---|---|---|
| Approve ADR-003..005 | unlock replay metadata/ledger | Project Owner + Leads | before ledger changes |
| Cash-only allocation | valid strategy vs invalid empty portfolio | Game Design | Milestone 1 |
| Final cash decay | decay all 4 chapters vs retain 3 transitions | Game Design | before balance changes |
| Money precision | JS number+tolerance vs fixed integer unit | Technical Lead | before ledger/save |
| Save policy | none/local state/replay log | Project Owner/Technical | Milestone 3 |
| Target learner/outcomes | affects rules/content/disclaimer | Owner/Finance reviewer | before content milestone |
| Asset licensing | replace/license/remove | Project Owner | before official release |

## Template

รายการใหม่ต้องมี Status, Date, Owner, Scope, Context, Options, Decision, Consequences, Validation และ References; หากเปลี่ยนข้อสรุปให้สร้าง ADR ใหม่และ Supersede รายการเดิม
