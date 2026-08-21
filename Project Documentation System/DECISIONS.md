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
| ADR-2026-015 | Assessment และ research เป็นชั้นเสริม ไม่บล็อก core gameplay | Active | 2026-08-21 | Project Owner |
| ADR-2026-016 | แยก player report กับ researcher dashboard | Active | 2026-08-21 | Project Owner |
| ADR-2026-017 | Missing readiness data แสดง Not assessed | Active | 2026-08-21 | Project Owner |
| ADR-2026-018 | ใช้ชุดคำถาม pre-assessment 10 ข้อของ Project Owner | Active | 2026-08-21 | Project Owner |
| ADR-2026-019 | ใช้ student-first language และ layered disclosure สำหรับ UX หลัก | Active | 2026-08-21 | Project Owner |
| ADR-2026-020 | แสดงที่มาของเงินเปลี่ยนระหว่างบทเป็น transition breakdown | Active | 2026-08-21 | Project Owner |
| ADR-2026-021 | ใช้ Cozy Pixel Fantasy Adventure และ AI final-asset pipeline | Active | 2026-08-21 | Project Owner |

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

## ADR-2026-013 — ใช้สถานะหกระดับและไม่อนุมานจาก state scaffold

- Status: Active
- Date: 2026-08-21
- Decision: ทุก feature ต้องแยก Designed, Planned, Implemented, Integrated, Playable และ Deployed. การมี state field หรือเอกสารเพียงอย่างเดียวไม่ถือว่า Implemented/Integrated/Playable
- Consequence: `SYSTEM_SPEC.md` §9 เป็น inventory หลัก; status เก่าที่ขัดกันต้องถูกอ่านเป็น historical context ไม่ใช่หลักฐานปัจจุบัน

## ADR-2026-014 — Supabase เป็น conditional scope

- Status: Proposed
- Date: 2026-08-21
- Decision: ยังไม่ถือว่า Supabase อยู่ใน implementation scope จน owner/มหาวิทยาลัยยืนยัน research governance, data retention, RLS, deployment owner และงบประมาณ. หากอนุมัติให้ทำหลัง local-first consent/ledger/telemetry contract stable
- Consequence: Session 3 ทำ schema/API contract แบบ adapter ได้ แต่ห้ามเพิ่ม dependency หรือส่งข้อมูลจริงก่อน approval

## ADR-2026-015 — Assessment และ research เป็นชั้นเสริม ไม่บล็อก core gameplay

- Status: Active (approved by the owner's explicit end-to-end implementation request on 2026-08-21)
- Date: 2026-08-21
- Owner: UI/UX
- Scope: onboarding, consent, post-assessment and telemetry
- Context: F-013–F-016 ต้องมีข้อมูล/consent เพิ่ม แต่เกม core ต้องยังเล่นได้เมื่อผู้เล่นไม่ตอบหรือปฏิเสธ research
- Decision: pre/post assessment และ research consent เป็น explicit opt-in/optional layer; ไม่มีคำถามแทรกระหว่าง stages; decline ไม่เปลี่ยนกติกาและไม่บล็อก personal report
- Consequences: Session 3 ต้องมี skip/Not assessed state และ local-first error behavior; ไม่เพิ่ม scoring rule ใหม่
- Validation: E2E decline → complete run, no export; assessment fixture separates knowledgeGain from portfolioOutcome/luck
- References: F-013–F-016, UI-015–UI-018, NFR-008

## ADR-2026-016 — แยก player report กับ researcher dashboard

- Status: Active (approved by the owner's explicit end-to-end implementation request on 2026-08-21)
- Date: 2026-08-21
- Owner: UI/UX
- Scope: F-017/F-018
- Context: ผู้เล่นต้องเห็นผลของตนเอง แต่สถิติรวมมี role, consent, retention และ de-identification constraints
- Decision: UI-013/019/021 เป็น player-only; UI-022/023 เป็น researcher/admin route แยก boundary; dashboard แสดง aggregate เท่านั้นและ export ต้อง consent-filtered
- Consequences: ห้ามใส่ dashboard/admin controls ใน gameplay bundle โดยไม่มี auth/RLS; Supabase ยังคง conditional
- Validation: unauthorized/expired session ไม่ fetch data; minimum-cell suppression; no non-consenting run in export
- References: F-017/F-018, UI-022/UI-023, ADR-2026-014

## ADR-2026-017 — Missing readiness data แสดง Not assessed

- Status: Active (approved by the owner's explicit end-to-end implementation request on 2026-08-21)
- Date: 2026-08-21
- Owner: UI/UX
- Scope: F-012/F-014/F-022
- Context: readiness direction มีสี่มิติ แต่ engine/assessment ยังไม่มี input ครบทุกมิติ
- Decision: แสดงแต่ละ dimension แยกกัน; เมื่อ input/source ไม่พอใช้ `Not assessed` พร้อมเหตุผลและ next learning topic; ห้าม default 0 หรือเดาคะแนนจาก portfolio
- Consequences: Session 3 ต้องส่ง missing flags/source IDs และ report ต้องไม่ใช้คำว่าพร้อมเกษียณจริง
- Validation: fixture missing each dimension renders Not assessed and leaves other dimensions intact
- References: UI-018/UI-019/UI-020, FR-019, NFR-013

## ADR-2026-018 — ใช้ชุดคำถาม pre-assessment 10 ข้อของ Project Owner

- Status: Active
- Date: 2026-08-21
- Owner: Project Owner
- Scope: F-013, onboarding pre-assessment
- Context: Project Owner ต้องการให้คำถามประเมินความเสี่ยงช่วงแรกใช้ 10 ข้อที่ระบุเอง โดยยังคงหลักการเดิมว่าเป็นแบบดัดแปลงตามแนวคิด SET ไม่ใช่ TSI ทางการ
- Decision: ใช้ชุดคำถาม 10 ข้อเป็น `learning-reflection-v2` ในเกมจริง ได้แก่ life stage, volatility view, investing style self view, loss attribution, one-year return/loss, windfall allocation, job-loss travel, game-show choice, land opportunity และ income preference
- Consequences: pre-assessment เป็น risk profile เท่านั้น จึงไม่ประดิษฐ์ `knowledgeGain` จากคำถามก่อนเล่นชุดนี้; post-assessment 3 ด้านยังคงใช้วัด learning reflection หลังเล่นแยกจาก portfolio outcome/luck
- Validation: ต้องมี test ว่า PRE_QUESTIONS มี 10 ข้อ, ต้องตอบครบก่อนบันทึก, total/maxScore/riskProfile deterministic และไม่มีข้อความอ้างว่าเป็นแบบประเมิน TSI ทางการ
- References: F-013, UI-015, ADR-2026-012, ADR-2026-015

## ADR-2026-019 — ใช้ student-first language และ layered disclosure สำหรับ UX หลัก

- Status: Active
- Date: 2026-08-21
- Owner: Project Owner
- Scope: UI-003, UI-006, UI-007, UI-008, UI-009, UI-012, UI-013; F-002, F-003, F-006, F-007, F-008, F-009, F-011, F-012, F-020, F-021, F-022
- Context: Project Owner เห็นว่า gameplay UI เริ่มรกและใช้ศัพท์ทางเทคนิคมากเกินไปสำหรับนักเรียนมัธยมปลายที่ไม่มีประสบการณ์ลงทุน
- Options: (1) คงศัพท์ technical บนหน้าหลักเพื่อความแม่นยำ, (2) ใช้คำง่ายบนหน้าหลักและย้ายศัพท์/สูตรไป `ดูเพิ่ม`, (3) ตัดศัพท์และสูตรออกจาก UI
- Decision: เลือกข้อ 2. First-layer UI ต้องตอบ `เกิดอะไรขึ้น`, `ทำไมถึงเกิด`, `ต้องกดอะไรต่อ`; คำอย่าง `HHI`, `exposure`, `percentile`, `benchmark`, `shock`, `Black Swan` อยู่ในรายละเอียด/disclosure. Chapter debrief ต้องอธิบาย `เงินเปลี่ยนเพราะอะไร` ทั้งกรณีกำไรและขาดทุน โดยแยกสินทรัพย์ เงินสด ค่าธรรมเนียม scam และ behavior/rebound เมื่อมีข้อมูล
- Consequences: Session 3/Integrator ต้องปรับ hierarchy/copy โดยไม่แก้ game logic; ถ้า ledger/P&L ยังไม่อนุมัติให้ใช้คำว่า `ผลต่อพอร์ตในบทนี้` ไม่ใช่ `กำไรจริง`
- Validation: เด็ก ม.ปลายต้องเล่นต่อได้โดยไม่เข้าใจศัพท์ technical; gain/loss debrief ต้องมี top contributor/detractor, signed money, text label และ grayscale/screen-reader equivalent; Black Swan copy ต้องไม่ blame ผู้เล่น
- References: UI_SPEC §19, GAME_DESIGN §2, ADR-2026-005, ADR-2026-007, ADR-2026-008

## ADR-2026-020 — แสดงที่มาของเงินเปลี่ยนระหว่างบทเป็น transition breakdown

- Status: Active
- Date: 2026-08-21
- Owner: Project Owner
- Scope: UI-003 chapter intro, UI-012 chapter debrief, F-002, F-008, F-020, F-021, F-022
- Context: Screenshot review พบว่า player จบบท 1 ที่ 100฿ (+0.0%) แล้วเริ่มบท 2 ที่ 142฿ จึงถามอย่างสมเหตุสมผลว่าเงินเพิ่ม 42฿ มาจากไหน
- Options: (1) ปล่อยให้ผู้เล่นอนุมานจากกติกา, (2) เพิ่ม breakdown ระหว่างบทใน UI, (3) เปลี่ยนกติกาเงินเติม/เงินเฟ้อให้ไม่เกิดช่องว่างนี้
- Decision: เลือกข้อ 2. UI ต้องแสดง transition breakdown ก่อนเริ่มจัดพอร์ตบทใหม่ โดยแยกเงินเติมจากช่วงชีวิตใหม่, เงินเฟ้อ/กำลังซื้อเงินสด และผลต่อพอร์ตจากบทก่อน. ห้ามเรียกส่วนต่างนี้ว่า `กำไร`, `ผลตอบแทน`, หรือ `P/L` จนกว่า ADR-005 ledger/P&L จะ active
- Consequences: Session ถัดไปต้องทำ visible UI/content upgrade ที่ chapter intro modal หรือ surface ระหว่างบท; ห้ามแก้ income, cashDecay, balance, RNG หรือสูตร inflation เพื่อแก้ปัญหาความเข้าใจ
- Validation: cash-only 100฿ → 142฿ ต้องแสดง +60฿ income, ประมาณ -18฿ inflation/cash purchasing power, net +42฿; player ต้องเห็นก่อนกด `เริ่มจัดพอร์ตบทนี้`; copy ต้องใช้ signed money และอ่านได้โดยไม่พึ่งสี
- References: UI_SPEC §20, GAME_DESIGN §2, ADR-2026-005, ADR-2026-019

| Topic | Options/why | Owner | Needed by |
|---|---|---|---|
| Approve ADR-003..005 | unlock replay metadata/ledger | Project Owner + Leads | before ledger changes |
| Cash-only allocation | valid strategy vs invalid empty portfolio | Game Design | Milestone 1 |
| Final cash decay | decay all 4 chapters vs retain 3 transitions | Game Design | before balance changes |
| Money precision | JS number+tolerance vs fixed integer unit | Technical Lead | before ledger/save |
| Save policy | none/local state/replay log | Project Owner/Technical | Milestone 3 |
| Target learner/outcomes | affects rules/content/disclaimer | Owner/Finance reviewer | before content milestone |
| Asset licensing | replace/license/remove | Project Owner | before official release |

## ADR-2026-021 — ใช้ Cozy Pixel Fantasy Adventure และ AI final-asset pipeline

- Status: Active
- Date: 2026-08-21
- Owner: Project Owner
- Scope: Visual presentation for all player-facing UI; no engine/business-rule scope
- Context: Project Owner ต้องการยกเครื่องกราฟิกจาก UI พิกเซลมืดและกรอบแข็งให้เป็นเกมเรียนรู้ชีวิตที่อบอุ่น เป็นมิตร สนุกและมีเหตุการณ์ให้ลุ้น พร้อมใช้ visual references ใน `game.pdf` เพื่อกำหนด mood เท่านั้น
- Options: (1) คง dark retro/NES theme, (2) ใช้ Thai-inspired cozy fantasy, (3) ใช้ contemporary fantasy โดยไม่บังคับความเป็นไทย และสร้าง final raster assets ด้วย AI ภายใต้ Asset Bible
- Decision: เลือกข้อ 3. Mobile portrait เป็น primary orientation; chapter transition ใช้ top-down RPG map และ gameplay ใช้ front-facing illustrated scene. Style identities คือ Trader wizard, VI druid, Medium-term courageous swordsman และ Long-term heavy knight. Event art น่ารักในระดับเบาและจริงจังขึ้นตามระดับ โดย Black Swan ใช้ boss-like staging แบบไม่รุนแรงและไม่ blame ผู้เล่น. AI assets ใช้เป็น final ได้เมื่อมี canonical reference, asset ID/version/provenance และ owner approval รายชิ้น
- Consequences: Session ถัดไปต้องสร้าง/ขออนุมัติ character sheets 4 ชุดและ target mockups 5 หน้า ก่อน batch production; ต้องเพิ่ม background/frame/loading pipeline แบบแบ่งโหลดตามบท. Fantasy art ห้ามสร้าง combat, skill, prediction, immunity, shop, costume, reward currency, collectible หรือ free-roaming feature ที่ engine ไม่มี
- Validation: ART-01–ART-10 ใน UI_SPEC §21; portrait mobile 390×844/320×568; grayscale silhouette identification; fallback/reduced motion; measured payload; no game-logic diff
- References: UI_SPEC §21, GAME_DESIGN `Cozy fantasy adventure presentation`, ADR-2026-019, ADR-2026-020

## Template

รายการใหม่ต้องมี Status, Date, Owner, Scope, Context, Options, Decision, Consequences, Validation และ References; หากเปลี่ยนข้อสรุปให้สร้าง ADR ใหม่และ Supersede รายการเดิม
