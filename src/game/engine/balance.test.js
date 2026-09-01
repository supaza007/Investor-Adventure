import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialState, currentStage, gameReducer } from './gameState.js'

function play(weights, seed) {
  let state = createInitialState(seed)
  state = gameReducer(state, { type: 'START' })
  state = gameReducer(state, { type: 'SELECT_STYLE', styleId: 'medium' })

  while (state.phase !== 'report') {
    if (state.phase === 'allocation') {
      state = gameReducer(state, { type: 'SET_ALLOCATION', weights })
      state = gameReducer(state, { type: 'CONFIRM_ALLOCATION' })
      continue
    }
    const stage = currentStage(state)
    if (stage.key === 'reveal' && state.scam?.accepted === null) {
      state = gameReducer(state, { type: 'ANSWER_SCAM', accept: false })
    }
    if (stage.key === 'behavior' && !state.behavior) {
      state = gameReducer(state, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
    }
    state = gameReducer(state, { type: 'NEXT_STAGE' })
  }
  return state.report
}

function sample(weights, runs = 2000) {
  return Array.from({ length: runs }, (_, index) => play(weights, index * 7919 + 13))
}

test('กองทุนอ้างอิงอยู่ในช่วงฐานะที่สอดคล้องกับเกณฑ์รวย 4 เท่า', () => {
  const reports = sample({ fund: 1 })
  const rich = reports.filter((report) => report.band.id === 'fire').length / reports.length
  const secureOrRich = reports.filter((report) => ['fire', 'comfortable'].includes(report.band.id)).length / reports.length

  assert.ok(rich >= 0.50 && rich <= 0.70, `อัตรารวย ${(rich * 100).toFixed(1)}% หลุดช่วง 50–70%`)
  assert.ok(secureOrRich >= 0.75 && secureOrRich <= 0.90, `อัตรามั่นคงหรือรวย ${(secureOrRich * 100).toFixed(1)}% หลุดช่วง 75–90%`)
})

test('เงินสดและตราสารหนี้ไม่ถูกจัดเป็นรวย แต่สินทรัพย์เสี่ยงยังมีทั้งหางบนและหางล่าง', () => {
  const cash = sample({ cash: 1 }, 500)
  const bond = sample({ bond: 1 }, 500)
  const crypto = sample({ crypto: 1 })

  assert.ok(cash.every((report) => !['fire', 'comfortable'].includes(report.band.id)))
  assert.ok(bond.every((report) => report.band.id !== 'fire'))
  assert.ok(crypto.some((report) => report.band.id === 'fire'))
  assert.ok(crypto.some((report) => ['tight', 'ruined'].includes(report.band.id)))
})
