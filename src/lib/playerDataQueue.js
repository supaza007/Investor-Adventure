import { submitPlayerRun } from './playerData.js'

export const PLAYER_DATA_QUEUE_KEY = 'investor-adventure:player-data-queue:v1'

function resolveStorage(storage) {
  if (storage !== undefined) return storage
  return globalThis.localStorage ?? null
}

function readStoredQueue(storage) {
  const target = resolveStorage(storage)
  if (!target) return []

  try {
    const parsed = JSON.parse(target.getItem(PLAYER_DATA_QUEUE_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry.sessionId === 'string')
      : []
  } catch {
    return []
  }
}

function writeStoredQueue(queue, storage) {
  const target = resolveStorage(storage)
  if (!target) return false

  try {
    target.setItem(PLAYER_DATA_QUEUE_KEY, JSON.stringify(queue))
    return true
  } catch {
    return false
  }
}

export function readPlayerDataQueue(storage) {
  return readStoredQueue(storage)
}

export function enqueuePlayerRun(run, storage) {
  if (!run?.sessionId) return { ok: false, skipped: 'SESSION_ID_UNAVAILABLE' }

  const queue = readStoredQueue(storage)
  const index = queue.findIndex((entry) => entry.sessionId === run.sessionId)
  if (index === -1) queue.push(run)
  else queue[index] = run

  const saved = writeStoredQueue(queue, storage)
  return saved
    ? { ok: true, sessionId: run.sessionId, pendingCount: queue.length }
    : { ok: false, skipped: 'STORAGE_UNAVAILABLE', sessionId: run.sessionId }
}

export function removePlayerRun(sessionId, storage) {
  if (!sessionId) return false
  const queue = readStoredQueue(storage)
  return writeStoredQueue(queue.filter((entry) => entry.sessionId !== sessionId), storage)
}

export async function flushPlayerDataQueue({ submit = submitPlayerRun, storage, maxRuns = Infinity } = {}) {
  const queue = readStoredQueue(storage)
  const sentSessionIds = []
  const failedSessionIds = []

  for (const run of queue.slice(0, maxRuns)) {
    try {
      const result = await submit(run)
      if (result?.ok) {
        removePlayerRun(run.sessionId, storage)
        sentSessionIds.push(run.sessionId)
      } else {
        failedSessionIds.push(run.sessionId)
      }
    } catch {
      failedSessionIds.push(run.sessionId)
    }
  }

  return {
    attempted: Math.min(queue.length, maxRuns),
    sent: sentSessionIds.length,
    pending: readStoredQueue(storage).length,
    sentSessionIds,
    failedSessionIds,
  }
}
