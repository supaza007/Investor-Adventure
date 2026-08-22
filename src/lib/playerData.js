import { supabase } from './supabaseClient.js'

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '')
const nullableNumber = (value) => (Number.isFinite(value) ? value : null)

export function buildGameSessionRow({ player, report, styleId, preAssessment, postAssessment, learning, timing, sessionId }) {
  return {
    id: sessionId,
    student_name: cleanText(player?.studentName),
    class_room: cleanText(player?.classRoom),
    risk_profile: preAssessment?.riskProfile ?? null,
    risk_score: nullableNumber(preAssessment?.total),
    risk_max_score: nullableNumber(preAssessment?.maxScore),
    assessment_version: preAssessment?.instrumentVersion ?? null,
    style_id: styleId ?? null,
    final_value: nullableNumber(report?.finalValue),
    contributed: nullableNumber(report?.contributed),
    benchmark: nullableNumber(report?.benchmark),
    ratio: nullableNumber(report?.ratio),
    multiple: nullableNumber(report?.multiple),
    outcome_band: report?.band?.id ?? null,
    is_ruined: Boolean(report?.isRuined),
    scam_victim: Boolean(report?.scamVictim),
    black_swan_count: Number.isInteger(report?.blackSwanCount) ? report.blackSwanCount : 0,
    post_total: nullableNumber(postAssessment?.total),
    post_max_score: nullableNumber(postAssessment?.maxScore),
    post_inflation_score: nullableNumber(postAssessment?.scores?.inflation),
    post_diversification_score: nullableNumber(postAssessment?.scores?.diversification),
    post_safety_score: nullableNumber(postAssessment?.scores?.safety),
    knowledge_gain: nullableNumber(learning?.knowledgeGain),
    post_assessment_status: postAssessment ? 'assessed' : 'skipped',
    post_assessment_version: postAssessment?.instrumentVersion ?? null,
    play_started_at: timing?.runStartedAt ?? null,
    play_ended_at: timing?.runEndedAt ?? null,
    play_duration_seconds: nullableNumber(timing?.runDurationSeconds),
  }
}

export function buildChapterEventRows(sessionId, chapters = []) {
  return chapters.map((entry) => ({
    session_id: sessionId,
    chapter_n: entry.chapter,
    event_id: entry.eventId,
    event_name: entry.eventName,
    is_black_swan: Boolean(entry.isBlackSwan),
    shock_pct: nullableNumber(entry.shockPct) ?? 0,
    percentile: nullableNumber(entry.percentile) ?? 0,
    exposure: nullableNumber(entry.exposure) ?? 0,
    concentration: nullableNumber(entry.concentration) ?? 0,
    behavior: entry.behavior ?? null,
    scam_accepted: Boolean(entry.scamAccepted),
    scam_lost: nullableNumber(entry.scamLost) ?? 0,
    value_before: nullableNumber(entry.valueBefore) ?? 0,
    value_after: nullableNumber(entry.valueAfter) ?? 0,
    value_end: nullableNumber(entry.valueEnd) ?? 0,
  }))
}

export function createPlayerRunPayload({
  player,
  report,
  styleId,
  preAssessment,
  postAssessment,
  learning,
  timing,
  sessionId,
  idFactory = () => globalThis.crypto?.randomUUID?.(),
}) {
  const resolvedSessionId = sessionId ?? idFactory?.()
  if (!resolvedSessionId) return null

  return {
    sessionId: resolvedSessionId,
    player,
    report,
    styleId,
    preAssessment,
    postAssessment,
    learning,
    timing,
  }
}

async function writeRows(client, table, rows, onConflict) {
  const query = client.from(table)
  if (typeof query.upsert === 'function') {
    return query.upsert(rows, { onConflict, ignoreDuplicates: true })
  }
  return query.insert(rows)
}

export async function submitPlayerRun({
  client = supabase,
  player,
  report,
  styleId,
  preAssessment,
  postAssessment,
  learning,
  timing,
  sessionId,
  idFactory = () => globalThis.crypto?.randomUUID?.(),
}) {
  if (!client) return { ok: false, skipped: 'SUPABASE_NOT_CONFIGURED' }

  const payload = createPlayerRunPayload({
    player,
    report,
    styleId,
    preAssessment,
    postAssessment,
    learning,
    timing,
    sessionId,
    idFactory,
  })
  if (!payload) return { ok: false, skipped: 'SESSION_ID_UNAVAILABLE' }

  const sessionRow = buildGameSessionRow(payload)
  const sessionResult = await writeRows(client, 'game_sessions', sessionRow, 'id')
  if (sessionResult.error) throw sessionResult.error

  const chapterRows = buildChapterEventRows(payload.sessionId, report?.chapters)
  if (chapterRows.length) {
    const chapterResult = await writeRows(client, 'chapter_events', chapterRows, 'session_id,chapter_n')
    if (chapterResult.error) throw chapterResult.error
  }

  return { ok: true, sessionId: payload.sessionId }
}
