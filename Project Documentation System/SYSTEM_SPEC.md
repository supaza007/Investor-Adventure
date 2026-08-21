# System Specification

> Source of truth สำหรับพฤติกรรมระบบ สถาปัตยกรรม ข้อมูล และข้อกำหนดเชิงเทคนิค

## Document Control

- Status: Draft — implementation-audited baseline
- Last updated: 2026-08-20
- Branch inspected: `release-clean` (ahead of `origin/main` 3 commits)
- Commit: TBD

## 1. Implemented Architecture

- React 19 + Vite 8 + Tailwind CSS 4; static GitHub Pages, offline single-file build และ Electron Windows wrapper. GitHub Actions และ Vite 8 ใช้ Node.js 22 (ขั้นต่ำของ Vite 8 คือ Node 20.19 หรือ 22.12)
- Framework-independent pure reducer ใน `src/game/engine/`; seeded RNG ไม่มี hidden randomness ใน reducer path
- Runtime assets: `src/assets/`; source originals: `assets-source/`; tests: `src/game/engine/*.test.js`; simulation: `scripts/sim.mjs`
- ไม่พบ persistence, backend, account หรือ external market API; มี timing/research state envelope แต่ยังไม่มี telemetry transport/sink

```text
React UI/adapters -> executeCommand -> validate command/state -> gameReducer -> next JSON state
                                      |-> transaction/event ledger (gap)
seed + rules/content versions --------> deterministic engine
save/load + migration (gap) <--------- versioned state
```

## 2. Documentation vs Implementation

| ID | Previous claim | Evidence | Resolution |
|---|---|---|---|
| DISC-001 | platform/architecture TBD | React/Vite/Electron/Pages exists | now Confirmed |
| DISC-002 | save/load baseline FR | no persistence found | Proposed only |
| DISC-003 | Transaction entity baseline | no ledger; only rebalance result/fee | Proposed model below |
| DISC-004 | generic lifecycle with pause/fail | actual `cover/style/allocation/stage/report` | use actual lifecycle |
| DISC-005 | cash decays “every chapter” | code decays only transitions after chapters 1–3 | owner decision required |
| DISC-006 | README says 48 tests | actual run: 50 | update README in Session 2 |
| DISC-007 | JSON-compatible state | rules/content/RNG metadata เพิ่มแล้ว; schema version ยังไม่มี | partial resolution; save gap |

## 3. Domain Model

### GameState

| Group | Fields | Status/invariant |
|---|---|---|
| Version | `versions.rulesVersion`, `versions.contentVersion`, `versions.rngVersion` | Implemented metadata; `gameId`/`schemaVersion` ยัง Proposed ก่อน save/load |
| Lifecycle | `phase`, `chapterIndex`, `stageIndex` | Implemented; valid bounds/phase relation |
| RNG | `initialSeed` Proposed, `seed` Implemented uint32 | deterministic consumption order |
| Player | `styleId`, `positions`, `cash` | Implemented; should be finite/non-negative/valid IDs |
| Scenario | `eventOrder`, `scamChapter`, `isBlackSwan`, `band`, `shock` | Implemented |
| Decisions | `scam`, `behavior`, `reboundOwed`, `immuneToAftershock` | Implemented |
| Audit | `history` Implemented; `transactions`, `domainEvents`, `commandSeq` Proposed | append-only deterministic order |
| Result | `report` | null until report phase |

Logical `PlayerState` = styleId + cash + portfolio + behavior; fields are currently at root. Proposed additions: cumulativeContributed, cumulativeFees.

### Portfolio / Asset

`Portfolio.positions` is `Record<AssetId, Money>` storing market value only. `Asset` content fields: id, name, exposures, growthMult, growthVol, optional shockMult/canRuin, lesson. IDs unique; exposure finite 0..1; growthMult >0; growthVol ≥0.

Money ปัจจุบันเป็น JavaScript number หน่วยเกม; currency, precision และ rounding policy = **TBD**. ไม่มี quantity, price, lot หรือ cost basis

### Transaction (Proposed)

```text
Transaction {
  id: "tx-{commandSeq}-{lineSeq}", chapter, stage, commandSeq,
  type: CONTRIBUTION|REBALANCE|FEE|SCAM_LOSS|BUY_DIP|CUT_TO_BOND,
  assetId?, amount, cashDelta, positionDelta, reason, rulesVersion
}
```

- Input: validated command + before state
- Process: calculate all lines and next state atomically
- Output: ordered ledger + next state
- Error: invalid/non-finite line rejects whole command and preserves old state
- Growth/shock are valuation Domain Events ไม่ใช่ transactions

### DomainEvent (Proposed)

```text
DomainEvent {
  id: "evt-{commandSeq}-{eventSeq}", type, chapter, stage,
  payload, seedBefore, seedAfter, rulesVersion, contentVersion
}
```

Baseline types: RunStarted, StyleSelected, PortfolioRebalanced, ScamOffered/Answered, ShockResolved, BehaviorChosen, AftershockResolved, GrowthApplied, ChapterCompleted, RunCompleted, CommandRejected

## 4. Lifecycle and Command Contract

```text
cover -> style -> allocation -> signal -> reveal -> shock -> behavior -> debrief
                    ^                                                   |
                    +--------------- next chapter ----------------------+
                                                                        -> report
```

Implemented core-command pipeline ใน `src/game/engine/command.js`: validate state → validate envelope → phase/required decision → enum/ID/finite/range → reduce → assert state invariants → atomic result. Invalid command คืน state object เดิมโดยไม่ commit การเปลี่ยนแปลง ส่วน transactions/events ยังเป็น Proposed แยกต่างหาก

```text
{ ok:true, state, error:null }
{ ok:false, state:unchanged, error:{ code, field?, message } }
```

Supported core commands: `START`, `SELECT_STYLE`, `SET_ALLOCATION`, `CONFIRM_ALLOCATION`, `ANSWER_SCAM`, `CHOOSE_BEHAVIOR`, `NEXT_STAGE`, `RESTART`.

Codes: `INVALID_ENVELOPE`, `UNKNOWN_COMMAND`, `WRONG_PHASE`, `INVALID_STYLE`, `INVALID_ALLOCATION`, `INVALID_DECISION`, `DECISION_REQUIRED`, `STALE_COMMAND`, `INVALID_STATE`. UI ต้อง branch ด้วย `code`; `message` เป็น fallback ภาษาไทย ไม่ควร parse ข้อความเพื่อหา logic

### 4.1 Supported command fields

| Command | Required fields | Commit behavior |
|---|---|---|
| `START` | `type` | `cover → style` |
| `SELECT_STYLE` | `type`, `styleId` (catalog ID) | สร้าง run/event order และเข้า allocation |
| `SET_ALLOCATION` | `type`, `weights: Record<cash\|AssetId, finite non-negative number>` | commit allocation ทันทีเมื่อ `canAdjustNow(state)` เป็นจริง |
| `CONFIRM_ALLOCATION` | `type`, `weights` รูปแบบเดียวกับด้านบน | validate+allocate+เข้า stage เป็น atomic command เดียว |
| `ANSWER_SCAM` | `type`, `accept: boolean` | commit ได้ครั้งเดียวขณะมี scam pending |
| `CHOOSE_BEHAVIOR` | `type`, `choice: hold\|cut\|buy` | commit ได้ครั้งเดียวที่ behavior stage |
| `NEXT_STAGE` | `type`, `expectedStageIndex: integer` | เดินต่อเมื่อค่าตรง `state.stageIndex` และไม่มี required decision ค้าง |
| `RESTART` | `type` | คืน clean cover state ตาม reducer seed policy ปัจจุบัน |

### 4.2 Stable error contract

| `error.code` | Meaning | Possible `error.field` |
|---|---|---|
| `INVALID_ENVELOPE` | command ไม่ใช่ object หรือไม่มี string `type` | — |
| `UNKNOWN_COMMAND` | command type ไม่อยู่ใน supported list | `type` |
| `WRONG_PHASE` | command ถูกชนิดแต่ใช้ไม่ได้ใน state ปัจจุบัน | — |
| `INVALID_STYLE` | style ID ไม่อยู่ใน catalog | `styleId` |
| `INVALID_ALLOCATION` | weights ว่าง, unknown asset, negative/non-finite หรือผลรวม non-finite/≤0 | `weights` หรือ `weights.<assetId>` |
| `INVALID_DECISION` | scam/behavior payload ไม่ใช่ enum/boolean ที่รองรับ | `accept` หรือ `choice` |
| `DECISION_REQUIRED` | ยังมี scam หรือ behavior ที่ต้องตอบก่อน NEXT | — |
| `STALE_COMMAND` | `expectedStageIndex` หาย/ไม่เป็น integer/ไม่ตรง current stage | `expectedStageIndex` |
| `INVALID_STATE` | pre/post state invariant ไม่ผ่าน | `phase`, `chapterIndex`, `stageIndex`, `cash`, `positions`, `positions.<assetId>` หรือ `history` |

`error.code` และ field path เป็น machine-readable contract. `error.message` เป็นข้อความ fallback สำหรับผู้เล่นและเปลี่ยนถ้อยคำได้โดยไม่ถือเป็น breaking change. Error ทุกชนิดคืน input state object เดิม (`result.state === inputState`) และไม่มี partial commit

### 4.3 Examples

```js
executeCommand(state, { type: 'NEXT_STAGE', expectedStageIndex: state.stageIndex })
// { ok: true, state: nextState, error: null }

executeCommand(state, { type: 'CONFIRM_ALLOCATION', weights: { stock: Infinity } })
// {
//   ok: false,
//   state, // object เดิม
//   error: {
//     code: 'INVALID_ALLOCATION',
//     field: 'weights.stock',
//     message: 'สัดส่วนต้องเป็นตัวเลขที่ไม่ติดลบ'
//   }
// }
```

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance | Status |
|---|---|---|---|---|
| FR-001 | เริ่ม run/เลือก style | Must | valid style สร้าง 4-tag events, scam chapter, initial cash | Implemented/Tested |
| FR-002 | save/load | Should/TBD | round-trip state; version/checksum validation; failed write preserves old save | Proposed |
| FR-003 | deterministic run | Must | seed+actions+versions เดิมให้ report/state เดิม | Partial: version gap |
| FR-004 | allocate cash + 4 assets | Must | normalize valid weights; conserve value before fee; invalid atomic reject | Implemented/Tested |
| FR-005 | turnover fee | Must | trader 2% moved value; zero move zero fee | Implemented/Tested |
| FR-006 | event set | Must | 4 primary tags; highest severity in chapter 3 | Implemented/Tested |
| FR-007 | exposure/concentration/band | Must | formulas match GAME_DESIGN; finite output | Implemented/Tested |
| FR-008 | shock/margin call | Must | correct floors; no negative value | Implemented/Tested |
| FR-009 | hold/cut/buy once | Must | valid enum/effects; cannot skip required choice | Implemented/Tested |
| FR-010 | scam once/run | Must | deterministic offer; reject 0 loss; accept cash-first loss | Implemented/Tested |
| FR-011 | chapter close | Must | rebound→aftershock→growth→history→income order | Implemented/Tested |
| FR-012 | retirement report | Must | final/contributed/benchmark/band/4 explanations | Implemented/Tested |
| FR-013 | validate commands at engine boundary | Must | reject unknown/NaN/Infinity/negative/out-of-range/wrong phase | Implemented/Tested via `executeCommand` |
| FR-014 | atomic Transaction ledger | Should | reconcile all value transfers and fees | Proposed |
| FR-015 | Domain Event/replay metadata | Should | deterministic IDs/order and seed before/after | Proposed |
| FR-016 | simulation safety disclosure | Must | accessible disclaimer and assumptions; no personalization | Partial/TBD review |
| FR-017 | restart | Must | valid clean cover and documented seed policy | Implemented; policy TBD |
| FR-018 | P/L reconciliation | Should | opening+contribution-fee-scam+valuation=closing within policy | Proposed |
| FR-020 | cash-only allocation | Must | explicit cash=100% is valid; inflation-adjusted purchasing power; no market return | Implemented/Testing |
| FR-021 | systemic Black Swan profile | Must | every asset is shocked with deterministic asset-specific profile | Implemented/Testing |
| FR-022 | pre/post assessment | Should | SET-inspired pre risk profile 10 questions (`learning-reflection-v2`); post 3 domains; risk profile separate from portfolio outcome and knowledge score | Implemented/Playable locally; content review pending |
| FR-023 | research consent | Must | opt-in separate from game terms; decline preserves gameplay; consent version recorded | Designed; state scaffold only |
| FR-024 | gameplay timing telemetry | Should | run/chapter/stage start/end/duration with anonymous run ID | Designed; state scaffold only |
| FR-025 | replay metadata | Must | rules/content/RNG versions and seed metadata | Partial; state fields only, no persistence/golden replay |
| FR-019 | สร้างรายงาน Retirement Readiness หลายมิติ | Must | แสดง financial readiness, plan resilience, life/health readiness และ financial capability แยกกัน; ระบุ `Not assessed` เมื่อไม่มีข้อมูล; ห้ามอ้างว่าเป็นคำแนะนำส่วนบุคคล | Proposed |

## 6. Non-Functional Requirements

| ID | Category | Target | Verification | Status |
|---|---|---|---|---|
| NFR-001 | Performance | reducer p95 <16ms on target device (device TBD) | benchmark | Proposed |
| NFR-002 | Reliability | atomic reject; invariants preserved | unit/property/fuzz | Core commands implemented/tested; fuzz pending |
| NFR-003 | Accessibility | keyboard, semantic labels, non-color cues, WCAG AA | audit | Proposed/Partial |
| NFR-004 | Security | no secrets; validate all trust boundaries | review/test | Partial |
| NFR-005 | Determinism | compatible build produces identical replay | golden fixtures | Partial |
| NFR-006 | Data integrity | finite/non-negative Money; valid references; reconciled report | property test | Proposed |
| NFR-007 | Compatibility | schema/rules/content/RNG versions + migration policy | migration tests | Proposed |
| NFR-008 | Privacy | local-first; minimized opt-in telemetry; no unapproved PII | review | TBD |
| NFR-009 | Offline | single-file core game needs no network | offline smoke | Implemented; smoke TBD |
| NFR-010 | Maintainability | centralized balance; engine independent of React; no hidden RNG | review/tests | Implemented |
| NFR-011 | Testability | unit+integration+E2E+≥1,500-run CI balance gate | CI evidence | unit/sim yes; E2E no |
| NFR-012 | Financial safety | educational simulation; no recommendation/trade execution | expert content review | Partial |
| NFR-013 | Evidence traceability | ทุก claim ด้านการเงิน/เกษียณมี source ID, publisher, date, claim, review date; game-balance parameter แยกจาก evidence | documentation audit | Proposed |

## 7. Formula Evidence and Calibration Boundary

| Formula/component | Current implementation | Evidence status and source |
|---|---|---|
| Cash purchasing-power factor | `cash × (1 + 0.02)^(-10)` per 10-year chapter | Formula is standard real-value conversion; 2% is a simulation assumption using the midpoint of BOT's 1–3% medium-term inflation target. [BOT target](https://www.bot.or.th/th/our-roles/monetary-policy/monetary-policy-target.html) |
| Portfolio concentration | `HHI = Σ(weight²)` then normalized to 0–1 | Evidence-backed mathematical measure; DOJ defines HHI as the sum of squared shares. [DOJ HHI](https://www.justice.gov/atr/herfindahl-hirschman-index) |
| Compounding | asset multiplier applied once per 10-year chapter | Compounding principle is evidence-backed, but asset multipliers/volatility and style multipliers remain calibrated simulation parameters. [Investor.gov](https://www.investor.gov/introduction-investing) |
| Rebalance turnover and fee | `Σ|target-current| / 2`, then fee on traded value | Turnover/fee reducing portfolio value is conceptually supported by SEC; the 2% trader rate is game balance, not a market fee. [SEC fee bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated) |
| Shock bands, Black Swan, aftershock, rebound, margin call | deterministic seeded game mechanics | No direct source found for these exact probabilities/multipliers; retain as labeled simulation mechanics pending calibration study. |
| Benchmark 1,421 and outcome cutoffs | fixed value and ratio bands | Not evidence-backed; derived from internal simulation. Must not be presented as a real retirement standard. |

## 8. Persistence and Test Strategy

Storage/autosave/retention/migration are **TBD**. Minimum Proposed envelope: schemaVersion, rulesVersion, contentVersion, rngAlgorithm, initial/current seed, commandSeq, payload, checksum; deserialize แล้วต้อง validate

Required test layers: current unit tests; property/fuzz invalid commands; golden replay state hash; UI-engine integration; E2E full run/scam/restart/save-load; balance matrix across strategies×styles×behaviors×seeds; offline/accessibility smoke

## 9. Complete Feature Inventory and Architecture Audit (2026-08-21)

This is the authoritative feature inventory for Session 2/3 planning. Status claims require source, test, UI wiring, and deployment evidence as defined in `PROJECT_STATUS.md`.

| Feature ID | Feature / player goal | State/data | Rules and player action | UI required | Acceptance criteria | Test criteria | Status |
|---|---|---|---|---|---|---|---|
| F-001 | Start run and choose style | phase, styleId, seed | valid style starts one deterministic run | Cover, StyleSelect | style selection creates allocation state | unit + full-run | Playable/Implemented |
| F-002 | Allocate portfolio and cash | positions, cash, weights | non-negative finite weights; rebalance; fee | AllocationScreen | total conserved minus fee; cash-only valid | unit/property/E2E | Playable/Implemented |
| F-003 | Review allocation before commit | draft weights, preview | cancel leaves committed state unchanged | UI-006 ReviewDialog | one confirm commits exactly once | component/E2E double-click | Planned/Proposed |
| F-004 | Adjust portfolio at allowed stages | positions, style rules | only permitted style/stage can adjust | UI-005 overlay | denied adjustment is no-op with reason | matrix tests | Playable/Implemented |
| F-005 | Asset catalog and lessons | tool definitions/exposure | four tools, cash separate; no live price | ToolCard/modal | every tool has valid data and fallback art | data tests | Playable/Implemented |
| F-006 | Risk exposure/concentration | weighted exposure, HHI, band | deterministic formulas; no NaN | HUD/RiskExposure | values match engine and text equivalent | unit/property/visual | Partial: engine Playable; HUD integrated only partly |
| F-007 | Systemic events and shock | eventOrder, event, band, shock | four tags; seeded shock; asset-specific Black Swan profile | Signal/Reveal/Shock | event hidden until reveal; no negative value | unit/seed matrix/E2E | Playable/Implemented |
| F-008 | Inflation and cash purchasing power | inflation params, cash | `cash × (1+inflation)^(-years)` between chapters | allocation/report explanation | cash-only completes and shows purchasing-power loss | formula/unit/E2E | Engine Implemented/Tested; dedicated explanation Partial |
| F-009 | Behavior decisions | behavior, rebound, aftershock | hold/cut/buy once; required before progress | Behavior confirmation | choice locked; effects reconciled | unit/E2E/anti-exploit | Playable/Implemented; rebound redesign Planned |
| F-010 | Scam education | scam offer/accepted/lost | one offer/run; accept/reject required; cash-first loss | Scam modal | red flags and amount shown; no dismiss bypass | branch/E2E | Playable/Implemented |
| F-011 | Transaction/Event ledger and P/L | transactions, domainEvents, balances | every transfer/fee and valuation event has deterministic ID/order | ledger-aware review/report (not yet built) | opening + flows + valuation = closing | property/golden replay | Planned |
| F-012 | Retirement-readiness report | four dimensions, evidence IDs, Not assessed | no real-world readiness claim; show simulation only | Report + assessment summary | dimensions separate; missing input not scored | unit/content/E2E | Designed/Partial engine report only |
| F-013 | Pre-assessment (SET-inspired) | assessment.pre, instrumentVersion `learning-reflection-v2`, 10 answers, total/maxScore/riskProfile | adapted 10-question risk profile; not official TSI; no gameplay lock | onboarding assessment | all 10 questions shown; score/profile saved or explicit skip; profile separate from style and return | content/unit/UX | Implemented/Playable locally; content review pending |
| F-014 | Post-assessment and knowledge gain | assessment.post, domain scores | inflation, risk/diversification, fees/scam; no mid-play questions | post-report assessment | pre/post/domain gain separate from portfolio/luck | psychometric pilot/unit | Planned |
| F-015 | Research consent | consent, consentVersion, purpose | research opt-in separate from game terms; decline preserves play | consent screen/settings | no research export without opt-in; withdrawal path | privacy/unit/E2E | Engine scaffold only; UI/integration Planned |
| F-016 | Timing telemetry | run/chapter/stage timestamps/durations | record start/end only; UTC canonical; no clickstream by default | optional privacy notice; researcher view | durations non-negative and tied to anonymous run | clock/unit/privacy | State scaffold only; transport Planned |
| F-017 | Anonymous student statistics | anonymousPlayerId, runId, cohort metadata TBD | minimize fields; aggregate access; retention/deletion | researcher dashboard (not player UI) | export is consent-filtered and de-identified | schema/RLS/DSAR | Designed; no backend |
| F-018 | Supabase integration | auth/db/API/storage TBD | only if scope approved; RLS and env secrets required | admin/research dashboard | migration, RLS, retry/reconcile, offline queue policy | integration/security/E2E | Out of current implementation; Proposed |
| F-019 | Persistence/save/replay | schema/rules/content/RNG versions, commandSeq | versioned envelope; migration or explicit incompatible replay | save/continue/restart | round-trip checksum; failed save preserves state | migration/golden replay | Planned |
| F-020 | Error/recovery/anti-exploit | structured command result, invariants | atomic rejection, stale guards, duplicate lock | global error/retry | invalid command leaves same state; recoverable/fatal paths distinct | unit/fuzz/E2E | Engine Implemented/Tested; UI Partial |
| F-021 | Accessibility/responsive | semantic UI, labels, focus | WCAG target and no color-only meaning | all screens | keyboard/zoom/mobile/screen reader checks pass | axe/manual/visual | Specified; runtime Partial |
| F-022 | Balance calibration and safety disclosure | parameter registry, source IDs | simulation parameters cannot masquerade as market facts | help/report disclosure | every numeric claim classified and versioned | matrix/sensitivity/content review | Planned |

### Dependency graph

```text
F-001/F-005/F-020
        ↓
F-002/F-004/F-006/F-007/F-008/F-009/F-010
        ↓
F-011 (ledger + P/L) ─────┐
        ↓                  ├─ F-012 retirement report
F-019 persistence/replay ─┘

F-013 pre-assessment → F-014 post-assessment → F-012 knowledge/readiness presentation
F-015 consent → F-016 telemetry → F-017 statistics → F-018 Supabase (optional)
F-022 calibration/content review constrains F-007/F-008/F-012/F-014
F-021 accessibility applies to every player-facing F-001–F-016 screen
```

### Session 2 dependencies

1. Product/owner: target learner, age/minor policy, cash-only semantics, retirement-report language, research purpose and consent wording.
2. Finance/content: approve source registry, SET-inspired assessment adaptation, Black Swan profile policy, parameter classification and disclaimer.
3. Technical: choose money precision, ledger canonical event schema, version policy, local-first vs online research collection, and whether Supabase is in scope.
4. UX: approve UI-006 review, onboarding assessment, consent, post-assessment and report information architecture.

### Session 3 implementation plan

| Milestone | Scope | Deliverable | Exit evidence |
|---|---|---|---|
| M3.1 | Domain contract | transaction/domain-event ledger, P/L reconciliation, deterministic IDs | property tests and golden replay |
| M3.2 | Player onboarding | SET-inspired pre-assessment, consent opt-in, privacy notice, anonymous run IDs | playable UI + consent E2E |
| M3.3 | Learning assessment | post-assessment, domain scoring, knowledgeGain, Not assessed policy | content review + pre/post test fixtures |
| M3.4 | Telemetry | run/chapter/stage timing, offline queue policy, consent filter | timing tests + export fixture |
| M3.5 | Research backend (conditional) | Supabase schema, migrations, RLS, API contract, dashboard read model | security review + integration tests |
| M3.6 | Report and calibration | four-dimensional readiness report, source registry, parameter disclosure, sensitivity matrix | expert review + simulation gates |
| M3.7 | Persistence and hardening | save/load/migration, error boundary, accessibility/E2E | round-trip, fuzz, browser/accessibility evidence |

## 10. Technical Debt / Risks

| ID | Risk | Priority |
|---|---|---|
| TD-001 | legacy React UI ยังเรียก reducer โดยตรง; structured contract พร้อมแล้วแต่ยังไม่ migrate UI | Medium |
| TD-002 | no schema/rules/content/RNG version | High |
| TD-003 | no transaction/event ledger | High |
| TD-004 | numeric precision/rounding TBD | Medium |
| TD-005 | no E2E/accessibility/offline evidence | Medium |
| TD-006 | current image rights unknown | High |
| TD-007 | Electron config references `build/icon.ico`; file inventory did not find it | Medium |
| TD-008 | financial content lacks documented expert approval | High |

## 11. End-to-End Learning Slice — implementation evidence (2026-08-21)

- F-003/UI-006: allocation now remains a local draft until a review modal shows before/after value, estimated engine fee, allocation list and HHI; cancel performs no command and confirm performs one command.
- F-012–F-016: versioned pre/post learning reflections, optional local research consent, session timing, knowledge-gain separation and four readiness dimensions are integrated in the player journey. Missing life/health or assessment input is rendered `Not assessed`.
- F-019: local single-slot save/continue is partially integrated with `schemaVersion: 1` and corrupt/incompatible rejection. Checksum, migrations, command replay and multiple slots remain Planned; this is not a canonical replay implementation.
- F-020/F-021/F-022: command errors remain code-driven; assessment fieldsets, consent labels, report text equivalents, focus styles and responsive overflow checks are covered. Full axe/screen-reader certification and content/finance review remain open.
- F-011 remains Planned because ADR-005 and money precision are unresolved. The report history is not relabelled as a canonical ledger or P/L reconciliation.
- F-017/F-018 remain Blocked/Conditional. No Supabase dependency, secret, network send or researcher dashboard is included while ADR-014, RLS, retention and governance are unapproved.

### Learning/session contracts

`AssessmentResult = {instrumentVersion, answers, scores, total, maxScore, riskProfile, completedAt}`. For pre-assessment version `learning-reflection-v2`, riskProfile is `conservative`, `balanced` or `aggressive` from the 10-question risk reflection score; post-assessment may set `riskProfile:null`. Missing required answers return `null` and UI preserves the draft. `SessionEnvelope = {schemaVersion:1, session, gameState}`; parse returns `{ok:false,error:'CORRUPT_SAVE'|'INCOMPATIBLE_SAVE'}` without replacing live state. Research consent decline never blocks gameplay and all data remains local in this release.

### Pre-assessment v2 contract

Input: 10 required radio answers from `PRE_QUESTIONS`, each encoded as `0`, `1` or `2`.
Process: sum numeric answers, set `maxScore = 20`, classify `total/maxScore` as conservative `<0.34`, balanced `<0.67` or aggressive otherwise.
Output: versioned assessment result stored in `session.assessment.pre`.
Error: incomplete answer set returns `null`; UI keeps the local draft and asks the player to answer all questions or explicitly skip.

The 10 owner-approved prompts are: life stage, view of volatility, self-described investing style, loss attribution, one-year return/loss preference, windfall allocation, job-loss travel response, game-show risk choice, land opportunity threshold and income preference. This instrument is for educational reflection only and must not be displayed as the official SET TSI questionnaire.
