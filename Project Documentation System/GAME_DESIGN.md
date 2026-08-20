# Game Design

> Source of truth สำหรับกติกาและสมดุลเกม เนื้อหาทั้งหมดเป็น simulation เพื่อการเรียนรู้ ไม่ใช่คำแนะนำการลงทุนจริง

## Document Control

- Status: Draft — implementation-audited baseline
- Last updated: 2026-08-20
- Evidence: `README.md`, `docs/plans/2026-07-17-*`, `src/game/engine/`, tests และ simulation

## 1. Confirmed Game

เกมปัจจุบันคือเกม single-player “เส้นทางชีวิตนักลงทุน” อายุ 20–60 คำกริยาหลักคือ **จัดสรรพอร์ต** ไม่ใช่ส่งคำสั่งซื้อขายรายหน่วย จุดประสงค์ที่ยืนยันจาก implementation คือให้เห็น diversification, risk/return, volatility, inflation, overtrading, behavior และ scam ผ่านผลลัพธ์ แต่ target learner และ learning outcomes ที่ Project Owner อนุมัติยังเป็น **TBD**

Design pillars ที่ implement แล้ว: เรียนรู้ผ่านการตัดสินใจ, ความเสี่ยงมีความหมาย, ไม่มีสินทรัพย์ปลอดภัยทุกเหตุการณ์, แยกคุณภาพการเตรียมพอร์ตออกจากดวง, และผลลัพธ์ deterministic เมื่อ input ครบชุดเหมือนกัน

## 2. Core Loop (As Implemented)

1. เริ่ม run และเลือกหนึ่งใน 4 investor styles
2. ระบบใช้ seed สร้างเหตุการณ์ 4 บทและบทที่ scam เกิด
3. รับทุนประจำบทและจัดสรร net worth ระหว่าง cash กับ asset 4 ชนิด
4. เดิน 5 stages: signal → reveal/scam → shock → behavior → debrief
5. ปิดบท: rebound → aftershock → growth → history → เงินบทถัดไป
6. ทำซ้ำ 4 บท แล้วดู retirement report เทียบ benchmark

End condition คือจบบท 4; ไม่มี game over กลางทาง ผลสุดท้ายเป็น `ruined`, `tight`, `adequate`, `comfortable`, `fire` ไม่ใช่ชนะ/แพ้ทวิภาค

## 3. Structure and Content

| System | Confirmed value |
|---|---|
| Chapters | 4: อายุ 20–29, 30–39, 40–49, 50–59; income 100, 60, 100, 80 |
| Assets | bond, fund, stock, crypto |
| Cash | bucket แยก ไม่ใช่ Asset; ไม่รับ market shock |
| Styles | medium, longterm, trader, vi |
| Events | main 11 + scam side event 1; 4 risk tags |
| RNG | seeded Mulberry32; Black Swan 12%; aftershock 25% |
| Chapter 3 | event ที่ severity สูงสุดในชุดที่สุ่มมา |

## 4. Actions — Input / Process / Output / Error

| Action | Input | Process | Output | Invalid/error |
|---|---|---|---|---|
| Start | `START` | cover → style | phase ใหม่ | phase ผิด: no-op |
| Select style | `styleId` | สุ่ม event order/scam; รับทุนบท 1 | allocation | unknown/phase ผิด: no-op |
| Allocate | target weights | rebalance net worth; fee ตาม turnover | positions, cash, fee | contract reject unknown/non-finite/negative/zero-sum แบบ atomic |
| Confirm | weights + confirm command | validate+allocation → signal ใน command เดียว | stage state | invalid allocation ไม่เปลี่ยน committed state |
| Scam answer | `accept` | บันทึกครั้งเดียว | decision | ต้องเป็น boolean และข้ามด้วย NEXT_STAGE ไม่ได้ |
| Behavior | hold/cut/buy | ใช้กติกาด้านล่าง | state ใหม่ | unknown choice ถูก reject และเลือกซ้ำไม่ได้ |
| Next | `expectedStageIndex` | stage ถัดไป/ปิดบท | state/history/report | stale index หรือ required decision ค้างถูก reject |
| Restart | restart | clean cover ด้วย current seed | initial state | seed policy TBD |

## 5. Economy and Risk Rules

### Allocation and fee

- Input: positions + cash, target weights, style fee rate
- Process: positive weights ถูก normalize; `traded = Σ|target-current| / 2`; `fee = traded × feeRate`
- Output: target portfolio หลังหัก fee และ `lastFee`
- Error: command boundary reject total/weight sum ที่ non-finite หรือ ≤0, negative/NaN/Infinity และ unknown asset; failure คืน committed state object เดิม
- Trader fee 2%; style อื่น 0% ตามโค้ดปัจจุบัน

### Growth and P/L

- แต่ละ asset ใช้ lognormal growth ต่อบทจาก `growthMult`, `growthVol`, style `returnMult` และ seeded RNG
- Event P/L amount = `valueAfter - valueBefore`; P/L % = amount/valueBefore เมื่อฐาน >0
- Final multiple = final net worth / total contributed (340)
- Benchmark ratio = final net worth / 1421; FIRE ≥1.5, comfortable ≥0.9, adequate ≥0.5, tight ≥0
- Ruined เมื่อ final net worth < 340 × 2%
- ปัจจุบันเก็บ market value เท่านั้น ไม่มี price, quantity, lot, cost basis, tax หรือ realized/unrealized P&L แบบบัญชีจริง สิ่งเหล่านี้เป็น **TBD/Proposed out of MVP**

### Exposure, concentration and shock

- `E = Σ(portfolioWeight × toolExposureToEvent)`
- `D = clamp((HHI - 1/4)/(1-1/4), 0, 1)`
- `center = -severity × E × (1 + 0.5D) × styleShockMult`
- `halfWidth = severity × (0.15 + 0.45D)`
- seeded uniform roll ใน band แล้วกระจาย shock ราย asset ตาม relative exposure
- non-ruin asset มี floor 10%; crypto มี floor 0 และ margin call เมื่อ tool shock < -50%; output ต้องไม่ติดลบ
- Black Swan ใช้ E=0.8, D=0 จึงไม่ให้ diversification เปลี่ยน band

### Cash and behavior

- Cash purchasing-power decay ตอน transition หลังบท 1–3 ก่อนรับ income บทถัดไป; **ไม่ decay หลังบท 4 ตาม implementation**. สูตรที่ใช้จริงตั้งแต่ Session นี้คือ `cash × (1 + inflationAnnualRate)^(-yearsPerChapter)` โดยใช้ `inflationAnnualRate = 0.02` และ `yearsPerChapter = 10`; 2% เป็นค่ากลางของกรอบเป้าหมายเงินเฟ้อไทย 1–3% ของ ธปท. ([แหล่งอ้างอิง](https://www.bot.or.th/th/our-roles/monetary-policy/monetary-policy-target.html)) จึงต้องแสดงว่าเป็น simulation assumption ไม่ใช่การพยากรณ์
- hold: rebound = loss×40%, เสี่ยง aftershock
- cut: rebalance ไป bond ทั้งหมด, จ่าย style fee, ไม่มี rebound, immune aftershock
- buy: เท cash ทั้งหมดตามพอร์ตเดิม (ถ้าพอร์ตศูนย์ใช้ fund), rebound = loss×40%×2×VI bonus 1.5
- Aftershock chance 25%, severity = shock เดิม×0.5; แล้วจึง growth

### Scam and determinism

- Scam เกิด 1 ครั้ง/run; offer = net worth × (15% + 35%×crypto share); accept เสียก้อนนั้น 100% โดยหัก cash ก่อน; reject ไม่เสีย
- Determinism ต้องนิยามด้วย `(initial seed, ordered validated actions, rulesVersion, contentVersion, RNG algorithm)` เดียวกัน; ปัจจุบันมีเพียง evolving seed และ action sequence

## 6. Existing / Fix / New

| Bucket | Systems |
|---|---|
| Existing + tested | seeded RNG, 4×5 lifecycle, allocation/fee, exposure/HHI, shock, Black Swan, margin call, behaviors, scam, growth, report, simulation gate |
| Fix/harden | command validation/structured errors และ required-decision/stale guards เสร็จแล้ว; cash-decay review, fee audit, README test count ยังติดตาม |
| New | Transaction/Event ledger, save/load, migration, property/fuzz และ E2E tests |
| Await scope | unit price/quantity/order book, cost basis/tax, live feed, backend/account |

## 7. Edge Cases and Exploits

| ID | Case | Current impact | Proposed control |
|---|---|---|---|
| EXP-001 | negative/NaN/Infinity weights | Fixed concurrently; verified by current tests | retain finite/range tests and structured error follow-up |
| EXP-002 | unknown asset ID | Fixed concurrently; verified by current tests | retain whitelist tests |
| EXP-003 | skip scam answer | Fixed concurrently; progress is blocked | retain required-decision tests |
| EXP-004 | unknown behavior | Fixed concurrently; invalid enum rejected | retain enum tests |
| EXP-005 | confirm empty allocation | Fixed concurrently; zero-sum allocation rejected | confirm cash-only design semantics separately |
| EXP-006 | repeated allocation | repeated fee/free reallocation | idempotency/ledger; intended behavior TBD |
| EXP-007 | stale/double NEXT_STAGE | Fixed concurrently with expectedStageIndex | retain duplicate-action tests |
| EXP-008 | balance/content patch | seed replay changes silently | version metadata + golden replay |

Balance risk: simulation ล่าสุดหุ้นล้วน median สูงสุด 1,515 เทียบพอร์ตกระจาย 1,418 (+7%) แต่ผ่าน gate “ไม่มี dominant strategy” (<60% gap) ต้องทดสอบเพิ่มข้าม styles/behaviors ไม่ใช้ median อย่างเดียว

## 8. Approved updates: assessment, cash-only, systemic shock and research telemetry

- Black Swan ใช้ systemic shock profile: bond 0.35, fund 0.55, stock 0.80, crypto 1.20; ทุกค่าติดป้าย Proposed/Expert-calibrated จนผ่าน review
- อนุญาต cash-only allocation; เงินสดไม่มี market return แต่ลดกำลังซื้อด้วยสูตรเงินเฟ้อ และไม่ถือเป็นความล้มเหลว
- ก่อนเล่น: แบบประเมิน risk tolerance ที่ดัดแปลงจากแนวคิด SET TSI; ใช้เพื่อสะท้อนกับ style ไม่ล็อกสินทรัพย์และไม่อ้างเป็น TSI ทางการ
- ระหว่างเล่น: ไม่มีคำถามแทรก
- หลังเล่น: post-assessment 3 ด้าน ได้แก่ inflation/purchasing power, risk-return/diversification และ fees/scam โดยอ้างกรอบ BOT/OECD/INFE/SEC; แสดง pre/post/knowledgeGain แยกจาก portfolio outcome และ luck
- Research consent เป็น opt-in แยกจาก game terms; ปฏิเสธได้โดยยังเล่นและดูผลตัวเองได้
- Research telemetry ใช้ anonymousPlayerId/runId และบันทึก run/chapter/stage start/end/duration เมื่อมี timestamp; ไม่เก็บทุกคลิกโดยไม่จำเป็น
- State มี rulesVersion/rngVersion/contentVersion เพื่อรองรับ replay ที่ตรวจสอบซ้ำได้

## 9. TBD / Open Decisions

## 8.2 Research-Backed Retirement Readiness Outcome — Approved Direction

Decision: ผลจบเกมจะเปลี่ยนจากการตีความว่า “พอร์ตถึง benchmark” เป็น **คะแนนความพร้อมเกษียณหลายมิติในสถานการณ์จำลอง** โดยพอร์ตลงทุนเป็นเพียงหนึ่งมิติ ห้ามใช้คำตัดสินว่า “ผู้เล่นพร้อมเกษียณจริง” หรือให้คำแนะนำการลงทุนเฉพาะบุคคล

| Dimension | Game evidence | Evidence basis | Implementation status |
|---|---|---|---|
| Financial readiness | final value เทียบเป้าหมาย, cash reserve, contribution, fees, liquidity shock | [CMRI Retirement Readiness Index 2566](https://www.cmri.or.th/th/research-portal-detail/75C-%E0%B8%94%E0%B8%B1%E0%B8%8A%E0%B8%99%E0%B8%B5%E0%B8%8A%E0%B8%B5%E0%B9%89%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%94%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%81%E0%B8%A9%E0%B8%B5%E0%B8%A2%E0%B8%93%E0%B8%AD%E0%B8%B2%E0%B8%A2%E0%B8%B8%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4-%E0%B8%9B%E0%B8%B5-2566), [BOT retirement analysis](https://www.bot.or.th/th/research-and-publications/articles-and-publications/articles/statistical-articles/Stat_Article_01Aug25.html) | Proposed |
| Plan resilience | concentration, exposure, loss depth, Black Swan/aftershock response, scam outcome | [SEC portfolio guidance](https://insight-fund.sec.or.th/plan-to-invest/port-management), [SET risk/return](https://www.set.or.th/th/about/mediacenter/insights/article/221-return-risk) | Partial: engine evidence exists |
| Life and health readiness | self-reported simulation scenario only; health/life preparedness must not be inferred from investment result | CMRI Q-RRI; [Thai later-life well-being study](https://journals.sagepub.com/doi/abs/10.1177/0733464816649281) | Proposed |
| Financial capability and safety | allocation choices, fee awareness, emergency-cash use, source-checking and scam response | [BOT Financial Literacy survey](https://www.bot.or.th/th/news-and-media/news/news-20211028.html), [SEC Anti-Scam Center](https://www.sec.or.th/TH/Pages/scam-hub.aspx) | Partial: gameplay evidence exists |

Required output: report must show each dimension separately, identify missing data as `Not assessed`, disclose every game-balance parameter, cite the source behind each learning claim, and present a next-learning topic rather than a real-world financial prescription.

### Core-loop evidence map

| Core-loop step | Claim the game may teach | Required source type |
|---|---|---|
| Set retirement goal | time horizon and a future goal affect planning | Thai retirement research/official statistics |
| Assess starting point | risk tolerance is not a personal investment recommendation | SET/SEC educational material |
| Budget and reserve | savings, debt and emergency resilience influence retirement security | BOT financial-literacy/retirement research |
| Allocate portfolio | diversification balances risk, return and liquidity | SEC/SET portfolio guidance |
| Resolve market event | macro shocks create uncertainty; event numbers remain simulation parameters | official statistics/research for context + documented game model |
| Choose behavior | action is a simulation trade-off, never a recommended reaction | source-backed learning copy + explicit disclaimer |
| Evaluate scam offer | guaranteed/high/urgent returns are red flags | SEC Anti-Scam Center |
| Debrief and retire | readiness is multi-dimensional, not a single return | CMRI and Thai later-life well-being research |

## 8.1 Player Feedback and Learning Experience (Session 2)

ส่วนนี้กำหนดวิธีอธิบายผลจาก engine ไม่เพิ่มสูตรหรือ business rule ใหม่

| Learning objective | Feedback moment | Evidence shown |
|---|---|---|
| การกระจายความเสี่ยง | ก่อนยืนยันพอร์ต/สรุปบท | สัดส่วนสูงสุด, exposure 4 ด้าน, ผลของ concentration |
| แยกการเตรียมตัวจากโชค | shock/debrief | preparation band เทียบ outcome/luck; Black Swan ป้องกันไม่ได้ |
| เห็นต้นทุน overtrading | review/สรุปบท | fee เป็นบาท, before/after, fee สะสมจาก engine |
| เข้าใจ panic selling/buying the dip | ยืนยัน behavior/debrief | action, เงินที่ใช้/ได้รับ, ผลและคำอธิบายเฉพาะ style |
| รู้เท่าทัน scam | scam/report | red flags, จำนวนเสียจริง, คำเตือนการันตีผลตอบแทน |
| มองผลระยะยาว | report | final value, contribution, benchmark, spectrum, best/worst chapter |

- ก่อน commit แสดงเฉพาะ preview จาก engine และห้ามใบ้ event อนาคต
- หลังเกิดผลอธิบาย “เกิดอะไร → เพราะอะไร → ลองอะไรครั้งหน้า” จาก state จริง
- gain/loss มีคำ เครื่องหมาย บาท และร้อยละ ไม่ใช้สีลำพัง
- Black Swan ไม่ใช้ภาษาตำหนิ; scam feedback อธิบาย red flags โดยไม่ดูหมิ่น
- retirement report เป็น spectrum เพื่อการเรียนรู้ ไม่ใช่คำแนะนำเฉพาะบุคคล

- Target age/knowledge, approved learning rubric, success metrics, verified 10–15 minute duration
- Cash-only ตั้งใจให้ valid หรือไม่; cash ควร decay หลังบท 4 หรือไม่
- Money unit/currency/rounding; save/replay scope; ledger detail; benchmark fixed หรือ scenario-derived
- Finance expert review และขอบเขต realism ของชื่อ asset/event
