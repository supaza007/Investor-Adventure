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
    net_gain: nullableNumber(report?.netGain),
    net_gain_pct: nullableNumber(report?.netGainPct),
    is_ruined: Boolean(report?.isRuined),
    scam_victim: Boolean(report?.scamVictim),
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

export function buildAssessmentAnswerRows(sessionId, preAssessment, postAssessment) {
  return [
    ['pre', preAssessment],
    ['post', postAssessment],
  ].flatMap(([assessmentType, assessment]) => Object.entries(assessment?.answers ?? {}).map(([questionId, answer]) => ({
    session_id: sessionId,
    assessment_type: assessmentType,
    instrument_version: assessment.instrumentVersion ?? 'unknown',
    question_id: questionId,
    answer: String(answer),
    score: Number.isFinite(assessment.scores?.[questionId]) ? assessment.scores[questionId] : null,
  })))
}

export function buildChapterEventRows(sessionId, chapters = []) {
  return chapters.map((entry) => ({
    session_id: sessionId,
    chapter_n: entry.chapter,
    event_id: entry.eventId,
    event_name: entry.eventName,
    income_added: nullableNumber(entry.incomeAdded) ?? 0,
    allocation_before_event: entry.allocationBeforeEvent ?? {},
    base_asset_returns: entry.baseReturns ?? {},
    age_modifiers: entry.ageModifiers ?? {},
    final_asset_returns: entry.assetReturns ?? {},
    character_ability_id: entry.characterAbilityId ?? null,
    ability_triggered: Boolean(entry.abilityTriggered),
    ability_bonus: nullableNumber(entry.abilityBonus) ?? 0,
    ability_cost: nullableNumber(entry.abilityCost) ?? 0,
    ability_net_effect: nullableNumber(entry.abilityNetEffect) ?? 0,
    ability_recovery_bonus: nullableNumber(entry.abilityRecoveryBonus) ?? 0,
    ability_growth_bonus: nullableNumber(entry.abilityGrowthBonus) ?? 0,
    adjustment_count: nullableNumber(entry.adjustmentCount) ?? 0,
    adjustment_prompt_choices: entry.adjustmentPromptChoices ?? {},
    portfolio_adjusted: (nullableNumber(entry.adjustmentCount) ?? 0) > 0,
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
  consent,
  anonymousPlayerId,
  appVersion,
  platform,
  rulesVersion,
  contentVersion,
  rngVersion,
  sessionStatus,
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
    consent,
    anonymousPlayerId,
    appVersion,
    platform,
    rulesVersion,
    contentVersion,
    rngVersion,
    sessionStatus,
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
  consent,
  anonymousPlayerId,
  appVersion,
  platform,
  rulesVersion,
  contentVersion,
  rngVersion,
  sessionStatus = 'completed',
  sessionId,
  idFactory = () => globalThis.crypto?.randomUUID?.(),
}) {
  if (!client) return { ok: false, skipped: 'SUPABASE_NOT_CONFIGURED' }
  if (consent === false) return { ok: false, skipped: 'RESEARCH_CONSENT_DECLINED' }

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

  const sessionRow = {
    ...buildGameSessionRow(payload),
    ...(anonymousPlayerId ? { anonymous_player_id: anonymousPlayerId } : {}),
    ...(consent !== undefined ? { research_consent: Boolean(consent) } : {}),
    ...(consent !== undefined ? { consent_version: consent?.consentVersion ?? consent?.version ?? null } : {}),
    ...(sessionStatus ? { session_status: sessionStatus } : {}),
    ...(appVersion ? { app_version: appVersion } : {}),
    ...(platform ? { platform } : {}),
    ...(rulesVersion ? { rules_version: rulesVersion } : {}),
    ...(contentVersion ? { content_version: contentVersion } : {}),
    ...(rngVersion ? { rng_version: rngVersion } : {}),
  }
  const assessmentRows = buildAssessmentAnswerRows(payload.sessionId, preAssessment, postAssessment)

  if (typeof client.rpc === 'function' && consent !== undefined) {
    const rpcResult = await client.rpc('submit_game_run', {
      payload: {
        session: sessionRow,
        chapters: buildChapterEventRows(payload.sessionId, report?.chapters).map(({ session_id, ...row }) => row),
        assessments: assessmentRows.map(({ session_id, ...row }) => row),
      },
    })
    if (rpcResult.error) throw rpcResult.error
    return { ok: true, sessionId: payload.sessionId }
  }

  const sessionResult = await writeRows(client, 'game_sessions', sessionRow, 'id')
  if (sessionResult.error) throw sessionResult.error

  const chapterRows = buildChapterEventRows(payload.sessionId, report?.chapters)
  if (chapterRows.length) {
    const chapterResult = await writeRows(client, 'chapter_events', chapterRows, 'session_id,chapter_n')
    if (chapterResult.error) throw chapterResult.error
  }
  if (assessmentRows.length) {
    const assessmentResult = await writeRows(client, 'assessment_answers', assessmentRows, 'session_id,assessment_type,question_id')
    if (assessmentResult.error) throw assessmentResult.error
  }

  return { ok: true, sessionId: payload.sessionId }
}
