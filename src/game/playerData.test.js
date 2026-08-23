import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAssessmentAnswerRows, buildChapterEventRows, buildGameSessionRow, submitPlayerRun } from '../lib/playerData.js'

const report = {
  finalValue: 1200,
  contributed: 1000,
  benchmark: 1100,
  ratio: 1200 / 1100,
  multiple: 1.2,
  netGain: 200,
  netGainPct: 0.2,
  band: { id: 'comfortable' },
  isRuined: false,
  scamVictim: true,
  chapters: [{
    chapter: 1,
    eventId: 'inflation',
    eventName: 'เงินเฟ้อ',
    incomeAdded: 10000,
    allocationBeforeEvent: { bond: 5000, cash: 5000 },
    baseReturns: { bond: -0.1 },
    ageModifiers: { bond: 0.05 },
    assetReturns: { bond: -0.05 },
    characterAbilityId: 'patient_compounding',
    abilityTriggered: true,
    abilityBonus: 125,
    abilityCost: 0,
    abilityNetEffect: 125,
    abilityRecoveryBonus: 25,
    abilityGrowthBonus: 100,
    adjustmentCount: 0,
    adjustmentPromptChoices: { reveal: 'skip' },
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
    net_gain: 200,
    net_gain_pct: 0.2,
    is_ruined: false,
    scam_victim: true,
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
  assert.equal(rows[0].income_added, 10000)
  assert.deepEqual(rows[0].age_modifiers, { bond: 0.05 })
  assert.equal(rows[0].character_ability_id, 'patient_compounding')
  assert.equal(rows[0].ability_bonus, 125)
  assert.equal(rows[0].ability_net_effect, 125)
  assert.deepEqual(rows[0].adjustment_prompt_choices, { reveal: 'skip' })
  assert.equal(rows[0].portfolio_adjusted, false)
})

test('assessment answers are stored as one analytics row per question', () => {
  const rows = buildAssessmentAnswerRows(
    'session-answers',
    { instrumentVersion: 'pre-v1', answers: { q1: '2' }, scores: { q1: 2 } },
    { instrumentVersion: 'post-v1', answers: { inflation: '2' }, scores: { inflation: 2 } },
  )
  assert.deepEqual(rows.map(({ session_id, assessment_type, question_id, score }) => ({ session_id, assessment_type, question_id, score })), [
    { session_id: 'session-answers', assessment_type: 'pre', question_id: 'q1', score: 2 },
    { session_id: 'session-answers', assessment_type: 'post', question_id: 'inflation', score: 2 },
  ])
})

test('consent-aware submission uses the atomic analytics RPC', async () => {
  const calls = []
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { error: null } } }
  const result = await submitPlayerRun({
    client,
    idFactory: () => 'session-rpc',
    player: { studentName: 'A', classRoom: 'B' },
    report,
    styleId: 'vi',
    consent: { researchTelemetry: true, consentVersion: 'research-consent-v1' },
    preAssessment: { answers: { q1: '1' }, scores: { q1: 1 }, instrumentVersion: 'pre-v1' },
  })
  assert.deepEqual(result, { ok: true, sessionId: 'session-rpc' })
  assert.equal(calls[0].name, 'submit_game_run')
  assert.equal(calls[0].args.payload.session.research_consent, true)
  assert.equal(calls[0].args.payload.chapters.length, 1)
  assert.equal(calls[0].args.payload.assessments.length, 1)
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

