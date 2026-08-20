# UI Specification

> Source of truth สำหรับ screen, interaction, state และ accessibility ของเกม “เส้นทางชีวิตนักลงทุน”

## Document Control

- Status: Implementation-ready สำหรับระบบปัจจุบัน; `TBD` ห้าม implement โดยเดา
- Owner: UI/UX
- Last updated: 2026-08-20
- Evidence: `src/`, `docs/plans/2026-07-17-investment-life-path-design.md`, `docs/plans/2026-07-17-engine-spec.md`
- Decisions: ADR-2026-003 ถึง ADR-2026-005

## 1. Verified UX Boundary

- Flow จริง: `cover → style → allocation → stage (5 stages × 4 chapters) → report`
- ผู้เล่นเลือก 1 ใน 4 สไตล์และจัดสรรเงินระหว่างสินทรัพย์ 4 ชนิดกับเงินสด
- ไม่มีราคา/หน่วย/ticker/order type/order book หรือข้อมูลตลาดภายนอก “ซื้อขาย” จึงหมายถึงการปรับ allocation ทั้งพอร์ต
- HUD ห้ามสร้าง risk score ใหม่ ให้แสดง weighted exposure 4 ด้านและ concentration จาก engine selector
- ไม่มี save/load, account, network หรือ permission ในระบบปัจจุบัน; state เหล่านี้เป็น Not applicable
- reducer/engine เป็นเจ้าของ committed state; UI เก็บ draft ได้และ dispatch หลัง confirm เท่านั้น

## 2. UX Principles

1. ไม่เปิดเผยเหตุการณ์อนาคต: ผู้เล่นตัดสินใจก่อนรู้ผล
2. ทุกจำนวนเงินระบุ “บาท”; ร้อยละระบุฐานเทียบ
3. action ที่เปลี่ยนเงิน/ความเสี่ยงต้อง review ก่อน commit
4. กำไร ขาดทุน ความเสี่ยง และสถานะไม่สื่อด้วยสีอย่างเดียว
5. feedback หลังรอบอธิบาย “เกิดอะไร → เพราะอะไร → เรียนรู้อะไร” จาก state จริง
6. Preview ใช้ engine selector ห้ามคัดลอกสูตร business logic เข้า component

## 3. Main User Flow

```text
UI-001 ปกเกม → UI-002 เลือกสไตล์ → UI-003 จัดพอร์ตต้นบท
  ↔ UI-004 คลัง/รายละเอียดเครื่องมือ → UI-006 Review/Confirm
  → UI-007 สัญญาณ → UI-008 เปิดเผย [อาจบังคับ UI-011 Scammer]
  → UI-009 แรงกระแทก → UI-010 ถือ/ตัดขาดทุน/ซื้อเพิ่ม
  → UI-012 สรุปบท → UI-003 บทถัดไป (รวม 4 บท)
  → UI-013 รายงานเกษียณ → UI-001 เล่นใหม่
```

- UI-007/008/010 เข้า UI-005 ปรับพอร์ตได้เฉพาะเมื่อ `canAdjustAt(style, stage)` เป็นจริง; confirm แล้วกลับ stage เดิม
- ก่อน commit ยกเลิกได้โดย state เกมไม่เปลี่ยน; หลัง allocation/behavior/scam commit ไม่มี Undo ใน engine
- ปิด/refresh ระหว่างเกมและ Back จาก style เป็น `TBD` เพราะไม่มี persistence/navigation contract

### UI-to-engine command contract

UI ต้องเรียก `executeCommand(state, command)` จาก `src/game/engine/command.js` สำหรับ command ใหม่ทั้งหมด และเปลี่ยน local React state เป็น `result.state` เฉพาะเมื่อ `result.ok === true`

```js
// success
{ ok: true, state: committedState, error: null }

// failure — state เป็น object เดิม ไม่มี partial commit
{ ok: false, state, error: { code, field?, message } }
```

- Supported commands/required fields: `START`; `SELECT_STYLE(styleId)`; `SET_ALLOCATION(weights)`; `CONFIRM_ALLOCATION(weights)`; `ANSWER_SCAM(accept)`; `CHOOSE_BEHAVIOR(choice)`; `NEXT_STAGE(expectedStageIndex)`; `RESTART`
- ทุก `NEXT_STAGE` ต้องส่งค่า `expectedStageIndex` จาก state snapshot ที่ใช้ render ปุ่ม ห้ามอ่านค่าจาก state ใหม่หลังเริ่ม submit
- UI branch ด้วย `error.code`: `INVALID_ENVELOPE`, `UNKNOWN_COMMAND`, `WRONG_PHASE`, `INVALID_STYLE`, `INVALID_ALLOCATION`, `INVALID_DECISION`, `DECISION_REQUIRED`, `STALE_COMMAND`, `INVALID_STATE`
- `useGameCommand` อาจคืน `DUPLICATE_SUBMIT` เป็น adapter-only no-op ระหว่าง processing lock; code นี้ไม่มาจากและไม่เปลี่ยน `executeCommand` contract, ไม่แก้ committed state และไม่ต้องแสดงเป็น system error
- `error.field` ที่ UI อาจ focus/ผูก inline error: `styleId`, `weights`, `weights.<assetId>`, `accept`, `choice`, `expectedStageIndex`; field ของ `INVALID_STATE` เป็น system error ไม่ใช่ field ให้ผู้เล่นแก้
- UI ห้าม parse `error.message`; ใช้เป็น fallback display เท่านั้น
- Draft allocation อยู่ใน component/UI state และแก้ได้โดยไม่เรียก engine. `CONFIRM_ALLOCATION` เท่านั้นที่ commit draft ต้นบทแบบ atomic. `SET_ALLOCATION` เป็น committed adjustment สำหรับจุดที่ `canAdjustNow` อนุญาต ไม่ใช่ draft update
- เมื่อ failure ให้คง draft, pending choice และ focus เดิม; committed portfolio ต้องอ้าง state เดิมจาก result
- duplicate submit หลัง state เปลี่ยนจะได้ `WRONG_PHASE` หรือ `STALE_COMMAND`; adapter ต้องคง processing lock อย่างน้อย 300ms เพื่อกัน click ที่สองตกบน control ของหน้าจอใหม่ และ UI ต้อง disable processing เพื่อ feedback ที่ชัดเจน

## 4. Layout, Responsive and HUD

- Wide ≥1024px: main 8 columns + HUD rail 4 columns
- Medium 600–1023px: content คอลัมน์เดียว + HUD summary strip ที่ขยายได้
- Compact 320–599px: คอลัมน์เดียว; แสดงมูลค่ารวม/เงินสด/บทก่อน; action เต็มความกว้าง; ไม่มี horizontal scroll
- Touch target ขั้นต่ำ 44×44 CSS px; dialog scroll ได้ใน viewport; รองรับ 200% zoom

### UI-C01 HUD contract

| Field | Display | Source/fallback |
|---|---|---|
| เงินสด | `฿12,345` + accessible label “เงินสด 12,345 บาท” | `state.cash`; ศูนย์แสดง `฿0` |
| มูลค่าพอร์ต | ผลรวม positions | engine selector; ว่าง = “ยังไม่ได้จัดสรร” |
| มูลค่ารวม | เงินสด + พอร์ต | engine selector |
| ผลตอบแทนบท | `▲ เพิ่ม 8% (+฿...)` / `▼ ลด 8% (−฿...)` | ระบุ “เทียบต้นบท”; สูตรสุดท้าย UIQ-005 |
| ความเสี่ยง | เติบโต, เงินเฟ้อ/ค่าเงิน, สภาพคล่อง/หนี้, จิตวิทยา | weighted exposure selector; error ห้ามแทนด้วย 0 |
| ความกระจุกตัว | สินทรัพย์สัดส่วนสูงสุด + % | concentration selector |
| รอบ | `บท 2 จาก 4 · อายุ 30–39` | current chapter |
| เหตุการณ์ | stage ปัจจุบัน; เปิดเผยตาม stage เท่านั้น | current event/stage |

ใช้ locale `th-TH`, หน่วยปรากฏทั้ง visual และ accessible name; emoji decorative ใช้ `aria-hidden`.

## 5. Screen Inventory / Traceability

| UI ID | Screen | Current implementation | Requirement |
|---|---|---|---|
| UI-001 | ปก/เริ่มเกม | `CoverScreen` | FR-001, NFR-003 |
| UI-002 | เลือกสไตล์ | `StyleSelect` | FR-001, NFR-003 |
| UI-003 | Overview/จัดพอร์ตต้นบท | `AllocationScreen` | FR-003, NFR-003/004 |
| UI-004 | คลัง/รายละเอียดเครื่องมือ | allocation modal | FR-003, NFR-003 |
| UI-005 | ปรับพอร์ตระหว่างเหตุการณ์ | allocation overlay | FR-003, NFR-003/004 |
| UI-006 | Review/Confirmation allocation | ต้อง implement | FR-003, NFR-003/004 |
| UI-007 | Stage 1 สัญญาณ | `StageScreen` | FR-003, NFR-003 |
| UI-008 | Stage 2 เปิดเผย | `StageScreen` | FR-003, NFR-003 |
| UI-009 | Stage 3 แรงกระแทก | `StageScreen` | FR-003, NFR-003 |
| UI-010 | Stage 4 พฤติกรรม | `StageScreen` | FR-003, NFR-003/004 |
| UI-011 | Scammer offer | `ScamOffer`/`Modal` | FR-003, NFR-003/004 |
| UI-012 | Stage 5 สรุปบท | `StageScreen`/timeline | FR-003, NFR-003 |
| UI-013 | รายงานเกษียณ | `ReportScreen` | FR-003, NFR-003 |
| UI-014 | Global loading/error/retry | ต้อง implement | NFR-001/002/003/004 |

FR ปัจจุบันกว้างเกินไป; Session 3 ต้องเพิ่ม FR สำหรับ style/allocation/gating/behavior/scam/report/recovery แล้ว update mapping โดยไม่เปลี่ยนความหมาย FR-003

## 6. Screen Specifications

### UI-001 — ปกเกม
- Entry: เปิดแอปหรือ restart; Exit: UI-002
- Data: ชื่อ/logo/tagline และ disclaimer (ข้อความอนุมัติ `TBD`)
- Primary: “เริ่มเกม”
- States: asset loading มี text fallback; init error = UI-014 fatal + “ลองเริ่มใหม่”; success announce navigation
- A11y: `h1`, real button, art decorative, reduced motion

### UI-002 — เลือกสไตล์
- Entry: UI-001; Exit: valid selection → UI-003
- Data: 4 styles, persona, pros/cons, adjustment stages, modifiers ที่ Game Design อนุญาตให้เปิดเผย
- Primary: “เล่นด้วยสไตล์นี้”; Validation: id ต้องอยู่ใน catalog
- Empty/error: catalog ว่างเป็น fatal; failure คง selection; success live announce style
- A11y: cards เป็น buttons/`aria-pressed`; arrows มี label; keyboard ไม่ต้อง swipe

### UI-003 — Overview/จัดพอร์ตต้นบท
- Entry: หลังเลือก style/จบบท; Exit: UI-006 → UI-007
- Data: HUD, budget, asset cards 4 ชนิด, allocation, cash, exposure preview, บท/อายุ; ห้ามเผย event
- Primary: “ตรวจสอบพอร์ต”; Secondary: +/−, เปิด UI-004
- Validation: แต่ละ weight 0–100%, ผลรวม ≤100%, remainder เป็น cash, finite number; engine final authority
- Empty: cash 100% เป็น valid; catalog ว่าง fatal
- Error: inline + summary และ focus summary; success ไป review โดย committed state ยังไม่เปลี่ยน
- A11y: +/− name มี tool+ค่าหลังปรับ; hold มี single-press alternative

### UI-004 — รายละเอียดเครื่องมือ
- Entry: info จาก UI-003/005; Exit: ปิดและคืน focus
- Data: ชื่อ/บทบาท/lesson/exposure 4 ด้าน/growth-volatility labels; `canRuin` มีข้อความ ไม่พึ่งสี
- Primary: “ปิดและกลับไปจัดพอร์ต”; ไม่มี buy action เพื่อไม่ bypass review
- Empty/error: id ไม่พบแสดง error + close; art มี fallback
- A11y: labelled dialog, focus trap, Escape, background inert

### UI-005 — ปรับพอร์ต
- Entry: ปุ่มปรากฏเมื่อ engine อนุญาต; Exit: cancel กลับ stage หรือ UI-006 แล้วกลับ stage
- Data: เหมือน UI-003 + before/after, มูลค่าที่ย้าย, fee preview
- Primary: “ตรวจสอบการปรับพอร์ต”
- Validation/empty: cash 0 valid; action เพิ่มเงิน disabled พร้อมเหตุผล
- Error: stale commit โหลด authoritative state และเสนอ “จัดพอร์ตอีกครั้ง”; background ห้ามรับ focus

### UI-006 — Review/Confirmation
- Entry: draft valid จาก UI-003/005; Exit: “กลับไปแก้” หรือ confirm
- Data: before→after ของ cash/tools, total, exposure, concentration, fee และยอดหลัง fee; ถ้า preview ไม่ครบห้าม confirm
- Primary: “ยืนยันจัดพอร์ต/ยืนยันปรับพอร์ต”; ห้าม label “ตกลง”
- Validation: revalidate ก่อน commit; processing ป้องกัน double submit
- Loading: “กำลังยืนยันพอร์ต…” + live polite
- Error: dialog คงอยู่, บอกว่าเงินยังไม่เปลี่ยน, retry/back; unknown transaction ห้าม retry อัตโนมัติ
- Success: status “จัดพอร์ตแล้ว · เงินสดคงเหลือ … บาท”
- A11y: focus heading; Escape=กลับไปแก้ก่อน processing; risk change มี text+icon

### UI-007/008/009 — Signal/Reveal/Shock
- Entry/Exit: engine order; “ต่อไป” หรือ UI-005 เมื่อ allowed
- Data: HUD/timeline/stage; Signal เห็น hint, Reveal เห็น identity/description, Shock เห็น outcome/preparation/luck/exposure
- Primary: “ต่อไป”; Secondary: “ปรับพอร์ต” ตาม selector
- Loading: “กำลังจำลองแรงกระแทก…” และกัน submit ซ้ำ
- Empty/error: no history มีข้อความ; required result ขาดต้องหยุด advancement + retry ห้ามแทนด้วยเลข 0
- Success/A11y: announce stage/outcome; stage text “ขั้น 3 จาก 5”; future timeline disabled และไม่ leak title

### UI-010 — ถือ/ตัดขาดทุน/ซื้อเพิ่ม
- Entry: behavior stage; Exit: confirmed choice → ต่อไป
- Data: current result/cash/options/ผลจาก engine/unavailable reason
- Primary: เลือก option → inline review → “ยืนยัน…”
- Validation: buy disabled หาก cash ไม่พอ; choice ต้องอยู่ใน enum; confirmed แล้ว lock
- Loading/error: disable all; failure คง pending และบอก “ยังไม่ได้บันทึก”; retry
- Success: ✓+ข้อความ ไม่ใช้สีอย่างเดียว; ห้ามเปลี่ยน choice
- A11y: radio group/buttons state ชัด; destructive action ไม่รับ autofocus

### UI-011 — Scammer
- Entry: engine trigger ใน reveal; Exit: ต้องตอบ accept/reject ไม่มี backdrop/Escape dismiss
- Data: offer, red flags, จำนวนเงินเสี่ยง (บาท)
- Primary hierarchy: “ปฏิเสธข้อเสนอ” primary; “โอนเงิน” danger secondary
- Confirmation: accept ต้องยืนยันซ้ำพร้อมจำนวนสูงสุดที่เสีย; reject confirm ครั้งเดียว
- Error/success: processing กันซ้ำ; failure คง dialogและยืนยันว่าเงินไม่เปลี่ยน
- A11y: initial focus heading/panel ไม่ใช่โอนเงิน; trap; บอกว่าต้องเลือกก่อนดำเนินต่อ

### UI-012 — สรุปบท
- Entry: debrief; Exit: “ไปบทถัดไป” หรือ “ดูรายงานเกษียณ”
- Data: before/after, change, exposure/concentration, preparation, luck, fees, scam loss, behavior, explanation
- Empty/error: required history ขาด = system error และห้ามไปต่อ; art optional fallback
- Success: timeline completed/open history
- A11y: gain/loss มี ▲/▼+คำ+จำนวน; tone ไม่พึ่งสี; DOM reading order ถูกต้อง

### UI-013 — รายงานเกษียณ
- Entry: จบ 4 บท; Exit: restart → cover ตาม reducer
- Data: spectrum band, final value, contributed, multiple, benchmark, chapters, best/worst, black swan/scam
- Primary: “เล่นอีกครั้งด้วยสไตล์อื่น”
- Empty/error: report/history ขาด = fatal + retry/restart; ห้าม render score หลอก
- A11y: benchmark มี “ดีกว่า/แย่กว่า” + magnitude; no horizontal scroll; headings เป็นลำดับ

### UI-014 — Global feedback/error/retry
- Entry: error boundary/explicit error; Exit: retry context เดิมหรือ restart เมื่อ fatal
- Loading: skeleton มี labelและไม่ปลอมตัวเลข
- Empty: บอกว่าไม่มีอะไรและ action ถัดไป
- Validation: inline+summary ไม่ล้าง input
- Recoverable: “เกิดอะไร + เงินเปลี่ยนหรือไม่ + ทำอะไรต่อ”
- Fatal: reference id + restart; ไม่แสดง stack/secret
- Success: `role=status`, ไม่แย่ง focus, transaction แสดงยอดหลังรายการ
- Retry เฉพาะ idempotent; unknown commit ต้อง reconcile ก่อน

## 7. Component Catalog

| ID | Component | States |
|---|---|---|
| UI-C01 | GameHUD | initial/ready/partial/error/expanded |
| UI-C02 | MoneyValue | positive/zero/negative/unavailable + unit |
| UI-C03 | ChangeIndicator | gain/loss/flat ด้วย icon+word+number |
| UI-C04 | RiskExposure | 4 axes/no-data/error + text equivalent |
| UI-C05 | AllocationControl | default/focus/changing/min/max/disabled/invalid |
| UI-C06 | ToolCard | default/selected/allocated/warning/disabled |
| UI-C07 | PortfolioBreakdown | collapsed/expanded/cash-only/error |
| UI-C08 | ReviewDialog | validating/processing/error/success |
| UI-C09 | ConfirmChoice | idle/pending/processing/confirmed/error |
| UI-C10 | StageProgress | future/current/completed + text position |
| UI-C11 | EventCard | hint/reveal/shock/fallback-art |
| UI-C12 | FeedbackBanner | info/success/warning/validation/system/fatal |
| UI-C13 | Button | hover/focus-visible/pressed/disabled/loading |
| UI-C14 | Modal | dismissible/required/focus trap/scroll/processing |

## 8. Keyboard, Touch and Accessibility

- WCAG 2.2 AA: text ≥4.5:1, large text/UI/focus ≥3:1; focus ไม่ถูก clip
- Tab ตาม DOM; ห้าม positive tabindex; Enter/Space activate; Escape เฉพาะ dismissible modal
- navigation focus ไป main heading; validation ไป summary; close modal คืน trigger
- target ≥44px; gap เป้าหมาย 8px; hover/swipe/hold ไม่ใช่วิธีเดียว
- hold timer หยุดที่ pointerup/pointercancel/blur/unmount
- test 320×568, 390×844, 768×1024, 1366×768, zoom 200%, landscape
- กำไร `▲ เพิ่ม`, ขาดทุน `▼ ลด`, คงเดิม `● คงเดิม`; risk มี label/value/pattern
- `lang="th"`; landmarks/headings; live region เฉพาะ feedback
- `prefers-reduced-motion`; animation/GIF >5 วินาทีหยุดได้หรือใช้ static fallback
- charts/bars มี text equivalent; emoji ไม่เป็น accessible name

## 9. State Matrix

| Context | Loading | Empty | Validation | System | Success/retry |
|---|---|---|---|---|---|
| Catalog/style | text skeleton | catalog missing=fatal | invalid id | restart/reload | announce selection |
| Allocation | preserve draft | cash-only=valid | inline+summary | state unchanged | post-balance; retry |
| Stage | calculating | required result missing=error | reason near action | stop advancement | announce outcome |
| Behavior/scam | disable all | invalid state | option reason | “ยังไม่บันทึก” | lock choice; retry |
| Report | generating | no history=fatal | N/A | retry/restart | report ready |

## 10. Verification / Acceptance

- Unit/component tests ทุก state; integration test cancel=no dispatch, confirm=one dispatch
- Keyboard-only + screen-reader smoke; axe ไม่มี critical/serious
- Visual QA ทุก viewport, zoom 200%, reduced motion; วัด contrast token จริง
- E2E happy path: start→style→allocation→5 stages×4→report→restart
- E2E branches: adjust allowed/denied, cash 0, buy unavailable, scam accept/reject, validation/system error/retry, double click confirm

## 11. Open Questions

| ID | Question | Owner/blocks |
|---|---|---|
| UIQ-001 | กลุ่มอายุ/ความรู้/บริบทชั้นเรียน | Owner; tone/onboarding |
| UIQ-002 | target devices/browsers/min viewport | Tech Lead; support matrix |
| UIQ-003 | save/continue/exit confirmation | Product+Tech; recovery |
| UIQ-004 | selectors: exposure/concentration/fee/before-after | Session 3; HUD/review |
| UIQ-005 | “ผลตอบแทน” ใช้ฐานต้นบท/เงินสมทบ/ทั้งเกม | Game Design; HUD |
| UIQ-006 | เปิดเผย growth/volatility/probability แค่ไหน | Game Design; detail |
| UIQ-007 | disclaimer/financial references ที่อนุมัติ | Finance/Owner |
| UIQ-008 | commit synchronous หรือมี persistence/backend | Tech Lead; retry |
| UIQ-009 | Back จาก style และ restart destination | Product |
| UIQ-010 | design tokens/font/audio policy | UI/Owner |

## 12. Session 3 Dependencies

1. เพิ่ม FR แยก style/allocation/gated adjust/behavior/scam/report/recovery
2. ส่ง selectors: portfolio/total value, chapter return, weighted exposure, concentration, fee/allocation preview
3. ใช้ command result ที่ implement แล้ว `{ok, state, error:{code, field?, message}|null}`; transaction ID ยังไม่มีเพราะ ADR-005 เป็น Proposed
4. UI command adapter is now implemented; `App.jsx` sends `CONFIRM_ALLOCATION(weights)` once from the allocation draft. A dedicated UI-006 review surface remains a separate product slice and is not inferred here.
5. เพิ่ม error boundary/UI-014 และ double-submit protection
6. เพิ่ม semantic progress/live regions และแก้ text size/contrast/touch target
7. รักษา deterministic engine; UI ห้ามสุ่มเอง
8. ตกลง persistence/exit ก่อนเพิ่ม Continue/autosave

## 13. Session 4 — Complete Feature-to-UX Specification

This section is the authoritative player-facing mapping for every feature in `SYSTEM_SPEC.md` §9. A status of `Planned`, `Conditional` or `Partial` is intentional: the screen contract is designed, but the missing engine/backend/content dependency must be delivered before the screen is presented as implemented.

### 13.1 Complete screen inventory

| UI ID | Screen / interaction | Feature IDs | State/data owner | Implementation status |
|---|---|---|---|---|
| UI-001 | Cover / start | F-001, F-016, F-022 | App + content registry | Playable |
| UI-002 | Style selection | F-001, F-013 reflection | style catalog, pre-profile | Playable / pre-profile Planned |
| UI-003 | Allocation workspace | F-002, F-005, F-006, F-008 | allocation draft + selectors | Playable; HUD Partial |
| UI-004 | Asset detail / lesson | F-005, F-022 | tool catalog + source IDs | Playable |
| UI-005 | Mid-stage adjustment | F-004, F-006 | style permission + draft | Playable |
| UI-006 | Allocation review/confirm | F-003, F-005, F-006 | preview contract | Planned |
| UI-007 | Signal stage | F-007, F-021 | event hint/stage | Playable |
| UI-008 | Reveal stage | F-007, F-010 | event/scam state | Playable |
| UI-009 | Shock stage | F-007, F-008, F-022 | band/shock/profile | Playable; disclosure Partial |
| UI-010 | Behavior decision review | F-009, F-006 | behavior draft + cash | Playable; rebound redesign Planned |
| UI-011 | Scam offer modal | F-010, F-022 | scam offer/red flags/loss | Playable |
| UI-012 | Chapter debrief | F-006, F-007, F-008, F-009, F-011 | history/events/ledger | Partial; ledger view Planned |
| UI-013 | Retirement report | F-012, F-016, F-022 | report + readiness dimensions | Partial; four-dimensional report Planned |
| UI-014 | Global feedback/error/retry | F-020, F-021 | command result + app boundary | Partial |
| UI-015 | Pre-assessment onboarding | F-013 | assessment.pre, instrumentVersion | Planned |
| UI-016 | Research consent | F-015, F-021 | consent, purpose, version | Planned |
| UI-017 | Privacy/research settings | F-015, F-016, F-018 | consent status, withdrawal, export | Planned / Conditional backend |
| UI-018 | Post-assessment | F-014 | assessment.post, domain scores | Planned |
| UI-019 | Retirement readiness detail | F-012, F-022 | four dimensions, evidence IDs, missing flags | Planned |
| UI-020 | Assumptions/source disclosure | F-007, F-008, F-012, F-022 | parameter registry/source registry | Planned |
| UI-021 | Personal time/learning summary | F-014, F-016 | durations, pre/post, knowledgeGain | Planned |
| UI-022 | Anonymous student statistics dashboard | F-017, F-018, F-022 | aggregate read model | Conditional; researcher only |
| UI-023 | Dashboard access/role gate | F-017, F-018, F-021 | auth/role/RLS contract | Conditional |
| UI-024 | Save/continue/replay | F-019 | versioned envelope/checksum | Planned |
| UI-025 | Offline/recovery center | F-018, F-019, F-020, F-021 | queue/status/retry state | Planned; core game offline |
| UI-026 | Transaction/event audit | F-011, F-022 | canonical ledger/domain events | Planned |

### 13.2 End-to-end journeys

#### J-001 First play

`UI-001 → UI-015 → UI-016 → UI-002 → UI-003 → UI-006 → UI-007 → UI-008 → UI-011 (if triggered) → UI-009 → UI-010 → UI-012 → (repeat four chapters) → UI-018 → UI-013/UI-019 → UI-021`

- Consent decline bypasses UI-016 research collection and does not block UI-002 or personal report.
- Pre-assessment can be skipped only if Product approves; skip state is explicit `Not assessed`, never an invented score.
- During chapters no assessment questions or research prompts interrupt play.

#### J-002 Replay and comparison

`UI-013/UI-021 → UI-024 (if save/replay exists) → UI-002 → same-seed disclosure → core loop → compare personal reports`

Replay comparison must identify seed/rules/content versions and must not imply that a different outcome proves a real-world strategy.

#### J-003 Research participant

`UI-015 → UI-016 opt-in purpose → UI-001/core loop → UI-018 → UI-017 review/withdraw → UI-022 aggregate dashboard`

Export is unavailable until consent for the exact purpose is active; withdrawal stops future collection and does not delete gameplay history unless the retention policy says so.

#### J-004 Researcher/admin

`UI-023 role/auth → UI-022 filters → aggregate view → de-identified export → audit/retention action`

No player-level identifying data, raw clickstream, or non-consenting run appears in the dashboard.

### 13.3 Screen contracts — onboarding, assessment and research

Each row is a complete contract: Goal; Entry; Data; Primary; Validation; Error; Success; Accessibility; Acceptance.

| UI ID | Goal / Entry / Data | Primary action and validation | Error / success | Accessibility / acceptance |
|---|---|---|---|---|
| UI-015 Pre-assessment | Goal: reflect starting risk knowledge/tolerance. Entry: first run before style. Data: versioned adapted questions, progress, answer draft; never call it official TSI. | “บันทึกแบบประเมิน” after all required answers; allow explicit “ยังไม่ตอบ” only if Product approves. | Invalid/missing answer stays on question and focuses it; content unavailable = skip as `Not assessed`; success stores `assessment.pre` + instrumentVersion and continues to UI-016/002. | Radio/choice group with fieldset/legend, keyboard arrow/Tab, progress text; acceptance: pre score/profile saved, no style lock, no mid-play prompt, no official-test claim.
| UI-016 Research consent | Goal: informed opt-in. Entry: after pre-assessment or settings. Data: purpose, fields, retention, withdrawal, consentVersion, contact, “game still works if decline”. | Separate checkboxes per purpose (research telemetry/export); “ยินยอมและเริ่มเกม” or “ไม่ยินยอมแต่เล่นต่อ”; no pre-checked consent. | Missing required acknowledgement blocks only that purpose; copy/version load failure = safe decline + continue game; success records consent/version/time without blocking play. | Heading-first focus, plain Thai, checkbox labels, no color-only status, screen-reader summary; acceptance: decline preserves play, export disabled, withdrawal discoverable.
| UI-017 Privacy/research settings | Goal: view/change consent and request withdrawal/deletion. Entry: settings or post-report. Data: active purposes/version, collected categories, retention, last sync, withdrawal/deletion request status. | “ถอนความยินยอม”, “หยุดส่งข้อมูล”, “ขอลบข้อมูล” where policy supports; destructive actions require confirmation. | Offline queues request locally and shows pending; server rejection gives retry and keeps prior consent truth; success shows effective timestamp/status. | Dialog focus trap, confirm copy states what stops/does not stop, no hidden destructive action; acceptance: future export filter honors new status.
| UI-018 Post-assessment | Goal: measure learning, not investment performance. Entry: after final report, never during stages. Data: 3 domains (inflation/purchasing power, risk/diversification, fees/scam), pre answer reference, post answers, instrumentVersion. | “ส่งคำตอบและดูผลการเรียนรู้”; validation per domain; allow `Not assessed` for missing. | Invalid answer focuses field; content/version mismatch keeps report and marks domain `Not assessed`; success computes `knowledgeGain` separately from portfolio outcome/luck. | One question per screen or grouped fieldsets, progress, no timed pressure, announce result; acceptance: pre/post/domain gain separate, fixture tests, no claim of validated psychometric score.
| UI-019 Retirement readiness detail | Goal: explain simulation readiness without real-world judgment. Entry: UI-013 report. Data: financial readiness, plan resilience, life/health readiness, financial capability/safety; evidence IDs; missing flags. | “ดูหลักฐาน/สิ่งที่ควรเรียนรู้ต่อ”; no action that changes game state. | Missing input renders `Not assessed` with reason; source registry unavailable shows parameter-only disclosure; success expands each dimension and links source IDs. | Each dimension heading, text equivalent for meters, no pass/fail or color-only band; acceptance: four dimensions separate, no real-life claim, missing never scored.
| UI-020 Assumptions/source disclosure | Goal: distinguish research evidence from game parameters. Entry: help icon from events/report/assets. Data: parameter name/value/version, “simulation assumption” label, source ID/publisher/date/review date, formula explanation. | “กลับไปหน้าก่อน”; optional copy link only if platform supports. | Missing registry blocks unsupported claim and labels `Source pending`; success opens correct anchored source text. | `details/summary` keyboard support, readable citations, no external navigation required offline; acceptance: every numeric claim F-007/F-008/F-012/F-022 classified.
| UI-021 Personal time/learning summary | Goal: show player their session time and learning reflection. Entry: report after UI-018. Data: run/chapter/stage durations in local timezone + UTC label, pre/post domains, knowledgeGain, portfolio outcome and luck separately. | “ดูสรุปของฉัน” / restart; no research export unless UI-016 active. | Missing timestamps shows `เวลาไม่พร้อมใช้`; clock anomaly shows “ตรวจสอบเวลา” not negative duration; success renders non-negative durations and reflection prompt. | Table has headers/units, no animation-only timing, screen reader reads domain separation; acceptance: no raw clickstream, durations tied to runId.

### 13.4 Screen contracts — research dashboard, persistence and recovery

| UI ID | Goal / Entry / Data | Primary action and validation | Error / success | Accessibility / acceptance |
|---|---|---|---|---|
| UI-022 Student statistics dashboard | Goal: researcher sees aggregate learning/game statistics. Entry: UI-023 authorized role. Data: consent-filtered counts, completion, chapter/stage durations, pre/post domain distributions, outcome/luck split, filters with cohort `TBD`; minimum cell-size suppression. | “ใช้ตัวกรอง/ดูตาราง/ส่งออกสรุป”; validate date/version/cohort ranges and suppress small groups. | No data = empty explanation + reset filters; offline = cached timestamp/read-only; unauthorized = UI-023; export failure preserves filters and offers retry. | Data table with caption, sortable headers announced, chart text alternative, keyboard filters, contrast; acceptance: aggregate/de-identified, no non-consenting runs, retention/deletion metadata visible.
| UI-023 Dashboard access/role gate | Goal: enforce researcher/admin boundary. Entry: dashboard URL/settings. Data: auth status, role, RLS scope, environment. | “เข้าสู่ระบบ/กลับเกม”; validate role and session expiry. | Unauthorized/expired = no data fetch and clear retry/login; network unavailable = offline explanation; success shows role and scope. | No secret in UI/log, focus error heading, status not color-only; acceptance: RLS/security tests pass before enabling dashboard.
| UI-024 Save/continue/replay | Goal: persist or replay a compatible run. Entry: cover “เล่นต่อ” or report comparison, only after F-019 approved. Data: save slots, schema/rules/content/RNG versions, checksum, timestamp, seed/commandSeq. | “โหลด”, “บันทึก”, “เริ่มใหม่”; validate version/checksum before state replacement and confirm destructive overwrite. | Corrupt/incompatible save remains untouched and offers restart; failed write preserves previous save; success announces slot/version. | Native dialog semantics, keyboard-confirm/cancel, explicit version text; acceptance: round-trip checksum/golden replay, no half-loaded state.
| UI-025 Offline/recovery center | Goal: explain offline status and recover safely. Entry: network error, failed command, retry affordance. Data: core playable/offline status, queued consent/telemetry count, last sync, command error code, retryability. | “ลองอีกครั้ง”, “เล่นต่อแบบออฟไลน์”, “ล้างคิวที่รอส่ง” only with policy confirmation. | Offline core game remains playable; non-idempotent unknown result is held for reconciliation; retry only idempotent; success clears only acknowledged item. | `role=status/alert`, no spinner without text, keyboard reachable retry, acceptance: no data loss, no duplicate export, error code mapped without parsing message.
| UI-026 Transaction/event audit | Goal: explain value movement and event valuation when ledger is approved. Entry: chapter debrief/report optional detail. Data: canonical transaction/domain-event IDs/order, opening, contribution, fee, scam loss, valuation, closing, replay version. | “ขยายรายละเอียด/กลับรายงาน”; no edit/delete. | Missing ledger marks audit unavailable and keeps report; reconciliation mismatch is fatal-to-audit but not silent; success shows equation within precision policy. | Table with units and signed values, expandable rows, accessible equation text; acceptance: opening + flows + valuation = closing, deterministic IDs/order, no new P/L formula in UI.

### 13.5 Core feature acceptance expansion

The existing UI-001–UI-014 contracts remain valid; the following acceptance scenarios close gaps in F-001–F-012 and F-020–F-022:

| Feature | Required player-visible behavior | Scenario IDs |
|---|---|---|
| F-001/F-002 | start, valid style, allocation including 100% cash; money units visible | CORE-01..04 |
| F-003/F-004 | draft cancel preserves committed portfolio; allowed/denied adjustment; one commit | ALLOC-01..05 |
| F-005/F-006 | every asset detail has lesson/exposure; risk and HHI text alternative | ASSET-01..04 |
| F-007/F-008 | signal hides event; reveal precedes shock; systemic profile disclosed; cash-only shows purchasing-power loss | EVENT-01..06 |
| F-009/F-010 | behavior/scam required, locked after commit, red flags and loss amount shown | DEC-01..05 |
| F-011/F-012 | ledger/audit and four readiness dimensions only when dependencies available; `Not assessed` otherwise | REPORT-01..06 |
| F-020/F-021/F-022 | each error code has safe state preservation; keyboard/mobile/grayscale; assumptions/source labels | SAFE-01..08 |

## 14. UI interaction contracts

```text
UI event → command adapter → executeCommand(snapshot, command)
  ok=true  → replace committed state, clear transient error, announce success
  ok=false → keep exact state reference and local draft, branch by error.code,
             focus error.field when present, offer retry only when retryable
```

- Pre/post assessment and consent are local drafts until explicit submit; changing a checkbox/answer must not mutate committed game state.
- Review surfaces show before/after, fee/risk delta and source/assumption label where applicable; cancel has no engine call.
- Dashboard/export commands are separate from gameplay commands and require consent/role checks at the service boundary.
- Save/load must validate envelope before replacing state; an incompatible replay can never partially enter the reducer.
- Offline status never changes game rules; it only controls network-dependent research/persistence actions.

## 15. Cross-feature UI state matrix

| State | Player-visible treatment | Applicable screens |
|---|---|---|
| Initial | heading + purpose + no fake numeric value | UI-001,015,016,022–025 |
| Loading | labelled skeleton/progress; controls disabled only when necessary | all data screens |
| Ready | complete data, primary action, current scope/version | all |
| Empty | explain why empty, safe next action, never blank panel | UI-005,013,017–022,026 |
| Partial/Not assessed | identify missing dimension/field and what is not inferred | UI-018,019,021,022 |
| Validation | inline field + summary + preserve draft/focus | UI-003,006,015,016,018,022–024 |
| Recoverable error | code-specific copy, retry policy, state unchanged | UI-006,014,017,022–026 |
| Fatal/system | no stack/secret; reference ID; restart or support path | UI-014,020,023–026 |
| Success | `role=status`, result values/units, next action | all submit/commit screens |
| Offline | core play continues; network actions show queue/last sync/retry | UI-017,022–025 |

## 16. Accessibility and responsive acceptance

- All UI-001–UI-026 have a single visible `h1`, landmark order, logical focus order and a keyboard path to every primary action.
- Assessment uses semantic fieldsets; consent uses explicit labels and independent purpose controls; dashboard uses table captions and chart text alternatives.
- Scores/meters show label + numeric/text status; never rely on green/red or a chart legend alone.
- At 320×568, 390×844, 768×1024 and 1440×900: no document-level horizontal overflow, no clipped primary action, and dialog content remains scrollable.
- At 200% zoom and text spacing overrides: content remains usable; at reduced motion, progress/shock animation has a static explanation.
- Screen-reader announcements identify chapter/stage, money unit, assessment domain, consent purpose, error code category and success result without exposing secrets.

## 17. Session 3 implementation handoff

1. Implement UI-006 before/after preview and add selectors for fee, weighted exposure, concentration and cash purchasing-power delta.
2. Implement UI-015 and content-reviewed question/instrument contracts; persist only the approved assessment envelope.
3. Implement UI-016/017 with separate purpose consent, version, withdrawal and offline-safe state; do not couple consent to playability.
4. Implement UI-018/019/020/021 after post-assessment/readiness/source registry contracts are approved; preserve `Not assessed` semantics.
5. Implement UI-014/025 global recovery and offline state, including command error-code mapping and idempotent retry policy.
6. Implement UI-022/023 only after backend/RLS/retention/consent-filter contracts are approved; dashboard is not a player screen.
7. Implement UI-024/026 only after F-019/F-011 ledger and version/checksum contracts are approved; UI must not invent reconciliation.
8. Add component/E2E/accessibility tests for CORE, ALLOC, ASSET, EVENT, DEC, REPORT and SAFE scenario IDs above.

## 18. Implemented player journey evidence (2026-08-21)

- UI-006 is Integrated/Playable: review shows pre/post value, engine fee preview, HHI and exact draft allocation; cancel closes without dispatch and confirm calls the authoritative allocation command once.
- UI-015/UI-016 are Integrated/Playable: semantic fieldsets, explicit optional skip, no official-TSI claim, unselected consent and safe decline. This release clearly states that no telemetry leaves the device.
- UI-018/UI-019/UI-020/UI-021 are Integrated/Playable: post reflection, four separate readiness dimensions, `Not assessed`, assumptions disclosure, session duration and learning gain separated from portfolio/luck.
- UI-024 is Partial/Playable for one local slot: reload offers Continue and validates schema/phase before replacement; checksum/migrations/replay comparison remain Planned.
- UI-017, UI-022, UI-023 and network portions of UI-025 remain Blocked/Conditional on approved governance/backend. UI-026 remains Planned with ADR-005.
- Browser E2E completed the full first-play journey with consent decline, scam rejection, behavior decisions, all four chapters, post-assessment, report, reload/continue and restart. Console warnings/errors: 0. Document horizontal overflow: none at 390×844 and 1366×768.
