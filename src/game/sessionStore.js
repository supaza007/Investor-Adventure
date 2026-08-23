export const SESSION_SCHEMA_VERSION = 4
export const SESSION_STORAGE_KEY = 'investor-adventure:session:v4'

function createAnonymousPlayerId() {
  return globalThis.crypto?.randomUUID?.() ?? null
}

export function createSession() {
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    player: { studentName: '', classRoom: '' },
    consent: null,
    anonymousPlayerId: createAnonymousPlayerId(),
    assessment: { pre: null, post: null },
    timing: { startedAt: null, endedAt: null },
    updatedAt: null,
  }
}

export function serializeSession(session, gameState) {
  return JSON.stringify({ schemaVersion: SESSION_SCHEMA_VERSION, session: { ...session, updatedAt: new Date().toISOString() }, gameState })
}

export function parseSession(raw) {
  try {
    const value = JSON.parse(raw)
    if (value?.schemaVersion !== SESSION_SCHEMA_VERSION || !value.session || !value.gameState) return { ok: false, error: 'INCOMPATIBLE_SAVE' }
    if (!['cover', 'style', 'allocation', 'stage', 'report'].includes(value.gameState.phase)) return { ok: false, error: 'CORRUPT_SAVE' }
    return {
      ok: true,
      value: {
        ...value,
        session: {
          ...value.session,
          player: value.session.player ?? { studentName: '', classRoom: '' },
        },
      },
    }
  } catch {
    return { ok: false, error: 'CORRUPT_SAVE' }
  }
}
