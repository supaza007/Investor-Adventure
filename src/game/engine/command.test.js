import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { COMMAND_ERROR, executeCommand, validateGameState } from './command.js'
import { createInitialState, currentStage, netWorth } from './gameState.js'
import { COMMAND_LOCK_MS } from '../../ui/useGameCommand.js'

const BALANCED = { bond: 1, fund: 1, stock: 1, crypto: 1 }

function run(state, command) {
  const result = executeCommand(state, command)
  assert.equal(result.ok, true, result.error?.message)
  return result.state
}

describe('command contract', () => {
  test('UI duplicate-submit lock ครอบคลุมช่วง double-click หลังเปลี่ยนหน้าจอ', () => {
    assert.ok(COMMAND_LOCK_MS >= 250, 'lock ต้องยาวพอไม่ให้คลิกที่สองตกบนหน้าจอใหม่')
  })

  test('invalid command คืน structured error และ state อ้างอิงเดิม', () => {
    const state = createInitialState(101)
    for (const [command, code] of [
      [null, COMMAND_ERROR.INVALID_ENVELOPE],
      [{}, COMMAND_ERROR.INVALID_ENVELOPE],
      [{ type: 'NOPE' }, COMMAND_ERROR.UNKNOWN_COMMAND],
      [{ type: 'NEXT_STAGE', expectedStageIndex: 0 }, COMMAND_ERROR.WRONG_PHASE],
    ]) {
      const result = executeCommand(state, command)
      assert.equal(result.ok, false)
      assert.equal(result.state, state)
      assert.equal(result.error.code, code)
      assert.ok(result.error.message)
    }
  })

  test('allocation malformed ทุกแบบถูก reject แบบ atomic', () => {
    let state = run(createInitialState(102), { type: 'START' })
    state = run(state, { type: 'SELECT_STYLE', styleId: 'medium' })
    const before = netWorth(state)

    for (const weights of [
      null,
      {},
      { stock: -1 },
      { stock: NaN },
      { stock: Infinity },
      { stock: Number.MAX_VALUE, bond: Number.MAX_VALUE },
      { unknown: 1 },
    ]) {
      const result = executeCommand(state, { type: 'CONFIRM_ALLOCATION', weights })
      assert.equal(result.ok, false)
      assert.equal(result.state, state)
      assert.equal(result.error.code, COMMAND_ERROR.INVALID_ALLOCATION)
      assert.equal(netWorth(result.state), before)
    }
  })

  test('stale NEXT และ required decision ถูก reject โดยไม่ข้าม stage', () => {
    let state = run(createInitialState(103), { type: 'START' })
    state = run(state, { type: 'SELECT_STYLE', styleId: 'medium' })
    state = run(state, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })

    const stale = executeCommand(state, { type: 'NEXT_STAGE', expectedStageIndex: 9 })
    assert.equal(stale.error.code, COMMAND_ERROR.STALE_COMMAND)
    assert.equal(stale.state, state)

    state = run(state, { type: 'NEXT_STAGE', expectedStageIndex: 0 })
    if (state.scam?.accepted === null) {
      const blocked = executeCommand(state, { type: 'NEXT_STAGE', expectedStageIndex: state.stageIndex })
      assert.equal(blocked.error.code, COMMAND_ERROR.DECISION_REQUIRED)
      assert.equal(blocked.state, state)
    }
  })

  test('duplicate submit ของ lifecycle commands ไม่ commit ซ้ำ', () => {
    const cover = createInitialState(109)
    const style = run(cover, { type: 'START' })
    const duplicateStart = executeCommand(style, { type: 'START' })
    assert.equal(duplicateStart.error.code, COMMAND_ERROR.WRONG_PHASE)
    assert.equal(duplicateStart.state, style)

    const allocation = run(style, { type: 'SELECT_STYLE', styleId: 'medium' })
    const duplicateStyle = executeCommand(allocation, { type: 'SELECT_STYLE', styleId: 'medium' })
    assert.equal(duplicateStyle.error.code, COMMAND_ERROR.WRONG_PHASE)
    assert.equal(duplicateStyle.state, allocation)

    const stage = run(allocation, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    const duplicateConfirm = executeCommand(stage, { type: 'CONFIRM_ALLOCATION', weights: { crypto: 1 } })
    assert.equal(duplicateConfirm.error.code, COMMAND_ERROR.WRONG_PHASE)
    assert.equal(duplicateConfirm.state, stage)
  })

  test('state invariant validator ตรวจ non-finite money และ unknown asset', () => {
    const state = createInitialState(104)
    assert.equal(validateGameState(state), null)
    assert.equal(validateGameState({ ...state, cash: Infinity }).code, COMMAND_ERROR.INVALID_STATE)
    assert.equal(validateGameState({ ...state, positions: { mystery: 10 } }).code, COMMAND_ERROR.INVALID_STATE)
    assert.equal(
      validateGameState({ ...state, cash: Number.MAX_VALUE, positions: { stock: Number.MAX_VALUE } }).code,
      COMMAND_ERROR.INVALID_STATE,
    )
  })

  test('valid และ invalid command ไม่ mutate input state', () => {
    const deepFreeze = (value) => {
      if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
      Object.freeze(value)
      for (const child of Object.values(value)) deepFreeze(child)
      return value
    }

    let state = deepFreeze(createInitialState(108))
    const invalid = executeCommand(state, { type: 'SELECT_STYLE', styleId: 'medium' })
    assert.equal(invalid.state, state)
    assert.equal(invalid.error.code, COMMAND_ERROR.WRONG_PHASE)

    const started = executeCommand(state, { type: 'START' })
    assert.equal(started.ok, true)
    assert.notEqual(started.state, state)
    assert.equal(state.phase, 'cover')
    assert.equal(started.state.phase, 'style')
  })

  test('mid-stage allocation ใช้ได้เฉพาะ style/stage ที่อนุญาต', () => {
    let longterm = run(createInitialState(106), { type: 'START' })
    longterm = run(longterm, { type: 'SELECT_STYLE', styleId: 'longterm' })
    longterm = run(longterm, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    const denied = executeCommand(longterm, { type: 'SET_ALLOCATION', weights: { stock: 1 } })
    assert.equal(denied.ok, false)
    assert.equal(denied.error.code, COMMAND_ERROR.WRONG_PHASE)
    assert.equal(denied.state, longterm)

    let trader = run(createInitialState(107), { type: 'START' })
    trader = run(trader, { type: 'SELECT_STYLE', styleId: 'trader' })
    trader = run(trader, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    const before = netWorth(trader)
    const adjusted = executeCommand(trader, { type: 'SET_ALLOCATION', weights: { stock: 1 } })
    assert.equal(adjusted.ok, true)
    assert.ok(netWorth(adjusted.state) < before, 'trader ต้องเสียค่าธรรมเนียมจาก turnover')
  })

  test('RESTART ผ่าน command contract และคืนหน้า cover', () => {
    let state = run(createInitialState(110), { type: 'START' })
    state = run(state, { type: 'SELECT_STYLE', styleId: 'medium' })
    const result = executeCommand(state, { type: 'RESTART' })
    assert.equal(result.ok, true)
    assert.equal(result.state.phase, 'cover')
    assert.equal(result.state.seed, state.seed)
    assert.notEqual(result.state, state)
  })
})

describe('command integration flow', () => {
  test('เล่นครบ 4 บทผ่าน contract โดย state valid ทุก transition', () => {
    let state = run(createInitialState(105), { type: 'START' })
    state = run(state, { type: 'SELECT_STYLE', styleId: 'medium' })
    let guard = 0

    while (state.phase !== 'report') {
      assert.ok(guard++ < 100, 'command flow ไม่ควรวนค้าง')
      if (state.phase === 'allocation') {
        state = run(state, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
        continue
      }
      if (state.scam?.accepted === null) state = run(state, { type: 'ANSWER_SCAM', accept: false })
      if (currentStage(state).key === 'behavior' && !state.behavior) {
        state = run(state, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      }
      state = run(state, { type: 'NEXT_STAGE', expectedStageIndex: state.stageIndex })
      assert.equal(validateGameState(state), null)
    }

    assert.equal(state.history.length, 4)
    assert.ok(state.report)
    assert.ok(Number.isFinite(state.report.finalValue))
  })
})
