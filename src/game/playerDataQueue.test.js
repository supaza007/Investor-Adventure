import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAYER_DATA_QUEUE_KEY,
  enqueuePlayerRun,
  flushPlayerDataQueue,
  readPlayerDataQueue,
} from '../lib/playerDataQueue.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

const run = (sessionId) => ({ sessionId, player: { studentName: 'A', classRoom: 'B' } })

test('player data queue keeps one entry per session', () => {
  const storage = memoryStorage()
  assert.deepEqual(enqueuePlayerRun(run('session-1'), storage), { ok: true, sessionId: 'session-1', pendingCount: 1 })
  assert.deepEqual(enqueuePlayerRun({ ...run('session-1'), styleId: 'vi' }, storage), { ok: true, sessionId: 'session-1', pendingCount: 1 })
  assert.deepEqual(readPlayerDataQueue(storage), [{ ...run('session-1'), styleId: 'vi' }])
})

test('player data queue removes a run only after successful submission', async () => {
  const storage = memoryStorage()
  enqueuePlayerRun(run('session-1'), storage)
  enqueuePlayerRun(run('session-2'), storage)
  const submitted = []

  const result = await flushPlayerDataQueue({
    storage,
    submit: async (entry) => {
      submitted.push(entry.sessionId)
      return entry.sessionId === 'session-1' ? { ok: true } : { ok: false, skipped: 'NETWORK_ERROR' }
    },
  })

  assert.deepEqual(submitted, ['session-1', 'session-2'])
  assert.deepEqual(result.sentSessionIds, ['session-1'])
  assert.deepEqual(result.failedSessionIds, ['session-2'])
  assert.deepEqual(readPlayerDataQueue(storage).map((entry) => entry.sessionId), ['session-2'])
})

test('player data queue tolerates corrupt local storage', () => {
  const storage = memoryStorage()
  storage.setItem(PLAYER_DATA_QUEUE_KEY, '{not-json')
  assert.deepEqual(readPlayerDataQueue(storage), [])
})
