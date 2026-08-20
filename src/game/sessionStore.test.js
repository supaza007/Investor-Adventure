import test from 'node:test'
import assert from 'node:assert/strict'
import { createSession, serializeSession, parseSession } from './sessionStore.js'

test('save envelope round-trips and rejects corrupt/incompatible data', () => {
  const gameState = { phase: 'style' }
  const parsed = parseSession(serializeSession(createSession(), gameState))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.value.gameState.phase, 'style')
  assert.deepEqual(parseSession('{nope'), { ok: false, error: 'CORRUPT_SAVE' })
  assert.deepEqual(parseSession(JSON.stringify({ schemaVersion: 99 })), { ok: false, error: 'INCOMPATIBLE_SAVE' })
})
