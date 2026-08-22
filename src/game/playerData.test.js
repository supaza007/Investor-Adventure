import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChapterEventRows, buildGameSessionRow, submitPlayerRun } from '../lib/playerData.js'

const report = {
  finalValue: 1200,
  contributed: 1000,
  benchmark: 1100,
  ratio: 1200 / 1100,
  multiple: 1.2,
  band: { id: 'comfortable' },
  isRuined: false,
  scamVictim: true,
  blackSwanCount: 1,
  chapters: [{
    chapter: 1,
    eventId: 'inflation',
    eventName: 'เงินเฟ้อ',
    isBlackSwan: false,
    shockPct: -0.1,
    percentile: 0.4,
    exposure: 0.2,
    concentration: 0.3,
    behavior: 'hold',
    scamAccepted: true,
    scamLost: 50,
    valueBefore: 1000,
    valueAfter: 900,
    valueEnd: 950,
  }],
}

test('player payload contains risk, style, post-assessment, result, and gameplay timing', () => {
  const row = buildGameSessionRow({
    sessionId: 'session-1',
    player: { studentName: '  นิดา  ', classRoom: ' ม.6/3 ' },
    report,
    styleId: 'longterm',
    preAssessment: { riskProfile: 'balanced', total: 10, maxScore: 20, instrumentVersion: 'pre-v1' },
    postAssessment: { total: 5, maxScore: 6, scores: { inflation: 2, diversification: 1, safety: 2 }, instrumentVersion: 'post-v1' },
    learning: { knowledgeGain: 2 },
    timing: { runStartedAt: '2026-01-01T00:00:00.000Z', runEndedAt: '2026-01-01T00:12:30.000Z', runDurationSeconds: 750 },
  })

  assert.deepEqual(row, {
    id: 'session-1',
    student_name: 'นิดา',
    class_room: 'ม.6/3',
    risk_profile: 'balanced',
    risk_score: 10,
    risk_max_score: 20,
    assessment_version: 'pre-v1',
    style_id: 'longterm',
    final_value: 1200,
    contributed: 1000,
    benchmark: 1100,
    ratio: 1200 / 1100,
    multiple: 1.2,
    outcome_band: 'comfortable',
    is_ruined: false,
    scam_victim: true,
    black_swan_count: 1,
    post_total: 5,
    post_max_score: 6,
    post_inflation_score: 2,
    post_diversification_score: 1,
    post_safety_score: 2,
    knowledge_gain: 2,
    post_assessment_status: 'assessed',
    post_assessment_version: 'post-v1',
    play_started_at: '2026-01-01T00:00:00.000Z',
    play_ended_at: '2026-01-01T00:12:30.000Z',
    play_duration_seconds: 750,
  })
})

test('skipped assessments stay nullable and every chapter row shares one session id', () => {
  const row = buildGameSessionRow({ sessionId: 'session-2', player: { studentName: 'A', classRoom: 'B' }, report, styleId: 'medium', timing: {} })
  assert.equal(row.risk_profile, null)
  assert.equal(row.risk_score, null)
  assert.equal(row.post_assessment_status, 'skipped')

  const rows = buildChapterEventRows('session-2', report.chapters)
  assert.equal(rows.length, 1)
  assert.ok(rows.every((entry) => entry.session_id === 'session-2'))
  assert.equal(rows[0].scam_lost, 50)
})

test('submission inserts one session row and its chapter rows without requiring SELECT permission', async () => {
  const calls = []
  const client = { from: (table) => ({ insert: async (payload) => { calls.push({ table, payload }); return { error: null } } }) }
  const result = await submitPlayerRun({ client, idFactory: () => 'session-3', player: { studentName: 'A', classRoom: 'B' }, report, styleId: 'vi', timing: {} })

  assert.deepEqual(result, { ok: true, sessionId: 'session-3' })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].table, 'game_sessions')
  assert.equal(calls[1].table, 'chapter_events')
  assert.equal(calls[0].payload.id, calls[1].payload[0].session_id)
})

test('missing Supabase configuration skips persistence without throwing', async () => {
  assert.deepEqual(await submitPlayerRun({ client: null }), { ok: false, skipped: 'SUPABASE_NOT_CONFIGURED' })
})

