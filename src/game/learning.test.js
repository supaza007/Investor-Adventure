import test from 'node:test'
import assert from 'node:assert/strict'
import { PRE_QUESTIONS, POST_QUESTIONS, scoreAssessment, buildLearningSummary, buildReadiness } from './learning.js'

test('assessment requires every answer and computes stable domain scores', () => {
  assert.equal(scoreAssessment(PRE_QUESTIONS, { risk: '2' }), null)
  const result = scoreAssessment(POST_QUESTIONS, { inflation: '2', diversification: '2', safety: '2' })
  assert.equal(result.total, 6)
  assert.equal(result.instrumentVersion, 'learning-reflection-v1')
})

test('knowledge gain is separate from portfolio outcome', () => {
  const pre = scoreAssessment(PRE_QUESTIONS, { risk: '1', inflation: '0', diversification: '0' })
  const post = scoreAssessment(POST_QUESTIONS, { inflation: '2', diversification: '2', safety: '2' })
  assert.deepEqual(buildLearningSummary(pre, post), { status: 'assessed', knowledgeGain: 4, domains: post.scores })
  assert.equal(buildLearningSummary(null, post).status, 'not_assessed')
})

test('readiness never invents life/health score', () => {
  const report = { ratio: 1, chapters: [{ prep: { score: 0.5 } }] }
  const dimensions = buildReadiness(report, { post: null })
  assert.equal(dimensions.find((d) => d.id === 'life').score, null)
  assert.equal(dimensions.find((d) => d.id === 'capability').score, null)
})
