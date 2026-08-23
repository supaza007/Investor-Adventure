import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReport } from './report.js'

const reportAt = (finalValue) => buildReport({
  positions: { bond: finalValue },
  cash: 0,
  incomeSchedule: [100],
  history: [],
})

test('สถานะทางการเงินใช้เงินที่ได้รับจริงและตัดช่วงตรงตามแผน', () => {
  assert.equal(reportAt(19.99).band.id, 'ruined')
  assert.equal(reportAt(20).band.id, 'tight')
  assert.equal(reportAt(149.99).band.id, 'tight')
  assert.equal(reportAt(150).band.id, 'adequate')
  assert.equal(reportAt(400).band.id, 'comfortable')
  assert.equal(reportAt(800).band.id, 'fire')
})

test('รายงานแสดงกำไรสุทธิทั้งบาทและเปอร์เซ็นต์', () => {
  const report = reportAt(150)
  assert.equal(report.contributed, 100)
  assert.equal(report.netGain, 50)
  assert.equal(report.netGainPct, 0.5)
  assert.equal(report.multiple, 1.5)
})
