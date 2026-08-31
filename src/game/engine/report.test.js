import test from 'node:test'
import assert from 'node:assert/strict'
import { benchmarkForIncomeSchedule, buildReport } from './report.js'

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
  assert.equal(reportAt(599.99).band.id, 'adequate')
  assert.equal(reportAt(600).band.id, 'comfortable')
  assert.equal(reportAt(1199.99).band.id, 'comfortable')
  assert.equal(reportAt(1200).band.id, 'fire')
})

test('benchmark ให้เวลาเงินก้อนแรกทบต้นมากกว่าเงินก้อนสุดท้าย', () => {
  assert.equal(benchmarkForIncomeSchedule([100, 100, 100, 100]), 100 * (1.75 ** 4 + 1.75 ** 3 + 1.75 ** 2 + 1.75))
  assert.equal(benchmarkForIncomeSchedule([100]), 175)
})

test('ฐานะทางการเงินแยกจากผลงานเทียบ benchmark', () => {
  const report = reportAt(175)
  assert.equal(report.band.id, 'adequate')
  assert.equal(report.benchmark, 175)
  assert.equal(report.benchmarkRatio, 1)
  assert.equal(report.benchmarkBand.id, 'near')
})

test('รายงานแสดงกำไรสุทธิทั้งบาทและเปอร์เซ็นต์', () => {
  const report = reportAt(150)
  assert.equal(report.contributed, 100)
  assert.equal(report.netGain, 50)
  assert.equal(report.netGainPct, 0.5)
  assert.equal(report.multiple, 1.5)
})
