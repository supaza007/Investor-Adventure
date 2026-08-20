# Project Status

## Header

- Overall: Engine command contract verified and committed; UI integration handoff ready
- Last updated: 2026-08-20
- Updated by: Lead Developer / Integrator
- Branch: `release-clean`
- Engine contract commit: `3815cf4`
- Build: Pass (`npm run build`, `npm run build:web`)
- Tests: Pass, 62/62 (`npm test`)

## Verified Snapshot

- React/Vite + Electron; reducer flow cover → style → allocation → 5 stages × 4 chapters → report
- 4 styles, 4 assets + cash, 11 main events + Scammer side event
- Existing UI: cover, style/detail, allocation/tool detail, stage/timeline/portfolio, behavior confirm, scam modal, report
- No save/load, account, external market feed, error boundary or transaction retry contract
- Market model is market-value allocation; no price, quantity, ticker or order type
- Current working tree contains source changes from concurrent work not authored by Session 2; preserved and not reverted

## Session 2 Deliverables

| ID | Work | Status | Evidence |
|---|---|---|---|
| UX-001 | User flow and UI IDs | Done | `UI_SPEC.md` §§3,5 |
| UX-002 | HUD/market/asset/portfolio/transaction spec | Done | `UI_SPEC.md` §§4,6 |
| UX-003 | Confirmation and full state matrix | Done | UI-006/010/011/014, §9 |
| UX-004 | Keyboard/touch/responsive/contrast/accessibility | Done | `UI_SPEC.md` §8 |
| UX-005 | Learning feedback specification | Done | `GAME_DESIGN.md` §8.1 |
| UX-006 | UX decisions and cross-session impact | Done | ADR-2026-007/008 |

## Verification Evidence

| Check | Method | Result | Date |
|---|---|---|---|
| Repository and UI inspection | source/reducer/components/docs review | Pass; UI-001–014 mapped | 2026-08-20 |
| Tests | `npm test` | Pass 54, fail 0 | 2026-08-20 |
| Production build | `npm run build` | Pass; Vite built `dist/index.html` | 2026-08-20 |
| Accessibility | specification review | Requirements complete; runtime axe/screen-reader/contrast audit pending | 2026-08-20 |

## Open / TBD

- UIQ-001–010 ใน `UI_SPEC.md` §11
- Target learner, approved learning rubric, money unit/rounding and disclaimer
- Return basis in HUD; persistence/exit policy; target device/browser
- ADR-2026-003–008 await owner/lead approval where Proposed
- ADR-2026-009 is Active: end report will become a research-backed multi-dimensional Retirement Readiness simulation score

## Session 3 Dependencies / Exact Next Actions

1. Approve ADR-2026-007/008 and expand FR IDs for style/allocation/gating/behavior/scam/report/recovery
2. Provide portfolio/total value, chapter return, weighted exposure, concentration, fee/allocation preview selectors
3. Implement UI-006 draft → preview → confirm → one atomic dispatch
4. Add structured command result/error contract, error boundary and UI-014 retry behavior
5. Add semantic HUD/progress/live region; fix small text, contrast and 44px touch targets
6. Test cancel/no-dispatch, single commit, double click, stale state, cash zero, scam branches
7. Run keyboard-only, screen reader, axe, grayscale/contrast, 4 viewport and 200% zoom QA

## Files Changed by Session 2

- `Project Documentation System/UI_SPEC.md`
- `Project Documentation System/GAME_DESIGN.md` (player feedback/learning only)
- `Project Documentation System/DECISIONS.md`
- `Project Documentation System/PROJECT_STATUS.md`

Session 2 did not intentionally modify game logic/source files.

## Game System Architect — Session 1 Handoff

งานสถาปัตยกรรมระบบใน Session นี้เพิ่ม/ปรับ `GAME_DESIGN.md`, `SYSTEM_SPEC.md` และ ADR-2026-003–006 ก่อนงาน UI/UX ที่เกิดพร้อมกัน โดยรักษา ADR-007/008 และสถานะ Session 2 ด้านบนไว้

### Requirements and Milestones

- Requirements inventory: FR-001–FR-018 และ NFR-001–NFR-012 ใน `SYSTEM_SPEC.md`
- M1 (Session 2 system work): อนุมัติ ADR-003/004/006; เพิ่ม version metadata, structured command errors, invariant/property/fuzz และ golden replay tests; core malformed-input/decision/double-stage guards ถูก concurrent source work ทำและ verify แล้วบางส่วน
- M2 (Session 3 system work): ตัดสิน Money precision + ADR-005; ทำ deterministic Transaction/DomainEvent ledger และ P/L reconciliation
- M3: save/load/migration หลัง schema/ledger stable; integration/E2E/offline/accessibility
- M4: finance review, target learner/rubric, playtest, expanded balance matrix, asset licensing/release smoke

### System Risks / Blockers

- ADR-003–008 ยัง Proposed; target learner, money unit, final cash decay และ save scope ยัง TBD
- ไม่มี schema/rules/content/RNG versions, ledger, reconciliation หรือ persistence
- Engine validation ปัจจุบันใช้ข้อความภาษาไทยใน state; structured error contract ยังไม่มี
- ลิขสิทธิ์ภาพไม่ทราบ; Electron config อ้าง `build/icon.ico` ที่ไม่พบใน inventory
- Concurrent source changes: `src/App.jsx`, `src/components/AllocationScreen.jsx`, `src/components/StageScreen.jsx`, `src/game/engine/gameState.js`, `src/game/engine/gameState.test.js`; Session นี้ไม่ได้สร้างหรือ revert และได้ verify สถานะล่าสุดแล้ว

### Latest Verification After Concurrent Changes

| Check | Result |
|---|---|
| `npm test` | Pass 54/54 |
| `npm run sim -- 1500` | Pass 7/7 gates; benchmark median 1417 vs configured 1421 |
| `npm run build` | Pass; `dist/index.html` 3,446.24 kB, gzip 2,418.28 kB |

### Files Changed by Game System Architect Session

- `Project Documentation System/GAME_DESIGN.md`
- `Project Documentation System/SYSTEM_SPEC.md`
- `Project Documentation System/DECISIONS.md` (ADR-003–006; concurrent ADR-007/008 preserved)
- `Project Documentation System/PROJECT_STATUS.md` (this handoff; concurrent Session 2 status preserved)

### Research Evidence Decision Update

- Project Owner selected the multi-dimensional retirement-readiness outcome.
- Added ADR-2026-009 (Active), FR-019 and NFR-013.
- Next design work: define a source registry, proposed indicators and `Not assessed` policy; do not alter game balance or claim real retirement suitability before finance/content review.

### Formula Evidence Update (2026-08-20)

- เปลี่ยน cash decay จากค่าจูน `0.85` เป็นสูตรมูลค่าที่แท้จริง `(1 + inflation)^(-years)` โดยใช้ 2% เป็นค่ากลางกรอบเป้าหมายเงินเฟ้อไทย 1–3% ของ ธปท.; ค่านี้เป็น simulation assumption
- ยืนยัน HHI `Σ(weight²)` ว่าเป็นสูตรมาตรฐานจาก U.S. DOJ; ไม่เปลี่ยน logic เพราะ implementation ตรงหลักการแล้ว
- ยืนยันหลักการทบต้นและผลกระทบค่าธรรมเนียมจาก Investor.gov/SEC แต่ยังไม่เปลี่ยน asset return, volatility, event probabilities, rebound, margin-call threshold หรือ benchmark เพราะยังไม่มีข้อมูลเฉพาะเกม/ไทยเพียงพอ

### Approved Implementation Update (2026-08-20)

- Implemented systemic Black Swan profile, cash-only-compatible state contract, rules/content/RNG version metadata, research consent envelope, pre/post assessment envelope และ timing telemetry fields
- Added FR-020–FR-025 and ADR-2026-011/012
- Assessment questions/content and Transaction Ledger/P&L reconciliation remain next implementation slice; current state fields are contract scaffolding
- Verification หลังแก้: `npm test` ผ่าน 54/54

## Lead Developer / Integrator — Command Contract Update (2026-08-20)

- Implemented FR-013 authoritative core-command boundary ใน `src/game/engine/command.js`
- Contract: `{ ok:true, state, error:null }` หรือ `{ ok:false, state:unchanged, error:{code, field?, message} }`
- รองรับ start/style/allocation adjustment/allocation confirm/scam/behavior/next/restart และตรวจ stale stage ด้วย `expectedStageIndex`
- เพิ่ม pre/post state invariants สำหรับ phase, chapter/stage bounds, finite non-negative cash/positions, known asset IDs และ history shape
- เพิ่ม `command.test.js`: unit tests สำหรับ malformed envelope/allocation/stale/required decision/state invariants/style permissions และ integration flow ครบ 4 บท
- ADR-2026-006 เปลี่ยนเป็น Active ตามคำสั่ง Session นี้; ADR-003–005 ยัง Proposed และ Transaction Ledger ยังไม่ implement
- UI/UX Session ถัดไปควร migrate event handlers จาก raw `dispatch` ไป `executeCommand`, branch ด้วย `error.code`, เก็บ draft allocation แยกจาก committed state และแสดง fallback `error.message`
- Verification:
  - `npm test` ผ่าน 60/60 (12 suites)
  - `npm run sim` ผ่าน 7/7 gates; 2,000 runs/strategy, benchmark median 1,428 เทียบ configured 1,421
  - `npm run build` ผ่าน; `dist/index.html` 3,448.83 kB, gzip 2,419.19 kB
  - `npm run build:web` ผ่าน; JS 233.78 kB, CSS 50.57 kB
  - `git diff --check` ผ่าน โดยมีเฉพาะคำเตือน LF/CRLF
- Files added by this Lead Developer slice: `src/game/engine/command.js`, `src/game/engine/command.test.js`
- Documents updated: `SYSTEM_SPEC.md`, `DECISIONS.md`, `PROJECT_STATUS.md`
- Remaining blockers: ADR-005/Money precision ก่อน ledger, FR-002/schemaVersion ก่อน save/load, UI ยังไม่ได้ใช้ command contract

## Final Engine Contract Handoff for UI Session (2026-08-20)

### Snapshot

- Feature commit: `3815cf4` (`feat(engine): add authoritative command contract and validation`)
- Branch: `release-clean`
- Engine entry point: `executeCommand(state, command)` from `src/game/engine/command.js`
- Result: `{ok:true,state,error:null}` or `{ok:false,state:originalState,error:{code,field?,message}}`
- Atomic rejection verified by reference equality, frozen-input test, duplicate-submit tests and full 4-chapter integration flow

### UI commands and errors

- Commands: `START`, `SELECT_STYLE`, `SET_ALLOCATION`, `CONFIRM_ALLOCATION`, `ANSWER_SCAM`, `CHOOSE_BEHAVIOR`, `NEXT_STAGE`, `RESTART`
- Every `NEXT_STAGE` must include `expectedStageIndex` captured from the render/state snapshot that initiated submission
- Error codes UI must handle: `INVALID_ENVELOPE`, `UNKNOWN_COMMAND`, `WRONG_PHASE`, `INVALID_STYLE`, `INVALID_ALLOCATION`, `INVALID_DECISION`, `DECISION_REQUIRED`, `STALE_COMMAND`, `INVALID_STATE`
- UI must branch on `error.code`; `error.message` is fallback copy and must not be parsed
- Field paths: `styleId`, `weights`, `weights.<assetId>`, `accept`, `choice`, `expectedStageIndex`; `INVALID_STATE` fields are system-level

### Draft and committed state

- Allocation draft belongs to local UI/component state and must not call the engine on every edit
- Initial/chapter allocation commits once with `CONFIRM_ALLOCATION(weights)`; invalid result retains the draft and original committed portfolio
- Mid-stage committed adjustment uses `SET_ALLOCATION(weights)` only where `canAdjustNow(state)` permits it
- ADR-2026-007 remains Proposed: do not add or assume new confirmation semantics until approved

### Raw reducer paths still present

- `src/App.jsx`: start, style selection, allocation confirm, mid-stage allocation and restart use raw React `dispatch`
- `src/components/StageScreen.jsx`: behavior, scam answer and next-stage use raw `dispatch`
- UI integration session must migrate these call sites to the contract without changing engine rules

### Verification

| Command | Result |
|---|---|
| `npm test` | Pass 62/62, 12 suites |
| `npm run sim` | Pass 7/7 gates; 2,000 runs/strategy; measured benchmark 1,428 vs configured 1,421 |
| `npm run build` | Pass; `dist/index.html` 3,448.87 kB, gzip 2,419.23 kB |
| `npm run build:web` | Pass; JS 233.82 kB, CSS 50.57 kB |
| `git diff --check` | Pass; line-ending warnings only |

### UI session must not change

- Do not change balance values, RNG order, shock/growth formulas or game rules
- Do not activate ADR-005 or ADR-007
- Do not implement transaction/domain-event ledger, P/L reconciliation or save/load in the UI integration slice
- Do not parse Thai error messages or bypass `expectedStageIndex`

### UI session next work

1. Introduce a React adapter/hook that owns current committed state and calls `executeCommand`
2. Migrate the raw reducer paths listed above; preserve local allocation draft on errors
3. Map error codes/fields to inline/global feedback and processing-disabled states
4. Add UI integration tests for cancel/no commit, invalid allocation, duplicate submit, stale NEXT, scam/behavior gating and restart
5. Run keyboard/accessibility/responsive QA after contract migration

## UI Integration Session 3 Completion (2026-08-20)

- Commit: this UI integration commit; final hash is reported in the session handoff below.
- Outcome: UI event paths now call `executeCommand`; committed state changes only on `ok === true`.
- Adapter: added `src/ui/useGameCommand.js`; owns committed state, structured error, processing lock and error dismissal.
- Migrated raw paths: `START`, `SELECT_STYLE`, `CONFIRM_ALLOCATION`, `SET_ALLOCATION`, `ANSWER_SCAM`, `CHOOSE_BEHAVIOR`, `NEXT_STAGE`, `RESTART`.
- `NEXT_STAGE` always sends `expectedStageIndex` from the render snapshot.
- Allocation draft remains local to `AllocationScreen`; rejected commands do not replace parent state or draft.
- Error UI branches by code for allocation/stage; `field` focuses the matching allocation control when available; `message` is fallback copy.
- Duplicate submit is disabled by adapter ref lock and UI `submitting` state.
- Tests: `npm test` pass 63/63; added command-contract restart coverage; existing invalid allocation/overflow, duplicate, stale, scam, behavior and full-run tests pass.
- Build: `npm run build` pass; `npm run build:web` pass; `git diff --check` pass with line-ending warnings only.
- Concurrent/pre-existing files preserved: `src/game/engine/balance.js`, `src/game/engine/encounter.js`, `.obsidian/`, `game-core-loop-captures/`, `output/`, `research-data-prototype-preview.html`, `tmp/`.
- Remaining: browser-level responsive/accessibility audit and dedicated component test harness; UI-006 visual review remains separate from this contract migration.

### Excluded working-tree items

The feature commit intentionally excludes pre-existing/concurrent UI, balance/Black-Swan, captures, prototype, output, tmp and `.obsidian` changes. They remain in the working tree and must be reviewed by their owning session; they were not deleted or overwritten.
