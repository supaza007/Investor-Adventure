import test from 'node:test'
import assert from 'node:assert/strict'
import { PRE_QUESTIONS, POST_QUESTIONS, scoreAssessment, buildLearningSummary, buildReadiness, classifyRiskProfile } from './learning.js'

test('assessment requires every answer and computes stable domain scores', () => {
  assert.equal(scoreAssessment(PRE_QUESTIONS, { life_stage: '2' }), null)
  const result = scoreAssessment(POST_QUESTIONS, { inflation: '2', diversification: '2', safety: '2' })
  assert.equal(result.total, 6)
  assert.equal(result.instrumentVersion, 'learning-reflection-v2')
})

test('pre assessment stores the 10-question risk profile separately from learning score', () => {
  assert.equal(PRE_QUESTIONS.length, 10)
  const answers = Object.fromEntries(PRE_QUESTIONS.map((q) => [q.id, '2']))
  const pre = scoreAssessment(PRE_QUESTIONS, answers)
  assert.equal(pre.total, 20)
  assert.equal(pre.maxScore, 20)
  assert.equal(pre.riskProfile, 'aggressive')
})

test('knowledge summary does not invent gain when pre assessment is risk-profile only', () => {
  const pre = scoreAssessment(PRE_QUESTIONS, Object.fromEntries(PRE_QUESTIONS.map((q) => [q.id, '1'])))
  const post = scoreAssessment(POST_QUESTIONS, { inflation: '2', diversification: '2', safety: '2' })
  assert.deepEqual(buildLearningSummary(pre, post), { status: 'risk_profile_only', knowledgeGain: null, preRiskProfile: 'balanced', domains: post.scores })
  assert.equal(buildLearningSummary(null, post).status, 'not_assessed')
  assert.deepEqual(buildLearningSummary(pre, null), { status: 'risk_profile_only', knowledgeGain: null, preRiskProfile: 'balanced' })
})

test('risk profile bands are deterministic', () => {
  assert.equal(classifyRiskProfile(0, 20), 'conservative')
  assert.equal(classifyRiskProfile(10, 20), 'balanced')
  assert.equal(classifyRiskProfile(20, 20), 'aggressive')
})

test('readiness never invents life/health score', () => {
  const report = { ratio: 1, chapters: [{ prep: { score: 0.5 } }] }
  const dimensions = buildReadiness(report, { post: null })
  assert.equal(dimensions.find((d) => d.id === 'life').score, null)
  assert.equal(dimensions.find((d) => d.id === 'capability').score, null)
})
