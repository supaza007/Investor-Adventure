import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialState, currentStage, gameReducer } from './gameState.js'

test('gameplay timing starts at style selection and ends at the final stage', () => {
  let state = gameReducer(createInitialState(42), { type: 'START' })
  state = gameReducer(state, { type: 'SELECT_STYLE', styleId: 'medium', at: '2026-01-01T00:00:00.000Z' })
  assert.equal(state.timing.runStartedAt, '2026-01-01T00:00:00.000Z')

  while (state.phase !== 'report') {
    if (state.phase === 'allocation') {
      state = gameReducer(state, { type: 'CONFIRM_ALLOCATION', weights: { cash: 1 } })
      continue
    }
    if (state.scam?.accepted === null) {
      state = gameReducer(state, { type: 'ANSWER_SCAM', accept: false })
      continue
    }
    if (currentStage(state).key === 'behavior' && !state.behavior) {
      state = gameReducer(state, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      continue
    }
    const isFinalStage = state.chapterIndex === 3 && state.stageIndex === 4
    state = gameReducer(state, {
      type: 'NEXT_STAGE',
      expectedStageIndex: state.stageIndex,
      ...(isFinalStage ? { at: '2026-01-01T00:12:30.000Z' } : {}),
    })
  }

  assert.equal(state.timing.runEndedAt, '2026-01-01T00:12:30.000Z')
  assert.equal(state.timing.runDurationSeconds, 750)
})
