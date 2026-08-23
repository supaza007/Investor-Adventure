import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChapterTransitionBreakdown } from './presentation.js'

test('อธิบายเงิน 10,000 → 16,203 ว่ามาจากรายได้ใหม่และเงินเฟ้อ ไม่ใช่กำไร', () => {
  const result = buildChapterTransitionBreakdown({
    prevSummary: { valueEnd: 10000 },
    chapter: { n: 2 },
    incomeAdded: 8000,
    startValue: 10000 * (1.02 ** -10) + 8000,
  })

  assert.equal(result.income, 8000)
  assert.ok(Math.abs(result.cashAdjustment - -1796.515) < 0.01)
  assert.ok(Math.abs(result.netChange - 6203.485) < 0.01)
  assert.ok(Math.abs(result.startValue - 16203.485) < 0.01)
})
test('รองรับพอร์ตลงทุนที่เงินสดถูกปรับเพียงบางส่วน', () => {
  const result = buildChapterTransitionBreakdown({
    prevSummary: { valueEnd: 250 },
    chapter: { n: 3 },
    incomeAdded: 10000,
    startValue: 10245,
  })

  assert.deepEqual(result, {
    previousValue: 250,
    income: 10000,
    cashAdjustment: -5,
    netChange: 9995,
    startValue: 10245,
  })
})

test('ไม่สร้าง breakdown จากข้อมูลไม่ครบหรือไม่ใช่ตัวเลข', () => {
  assert.equal(buildChapterTransitionBreakdown({ prevSummary: null, chapter: { n: 2 }, incomeAdded: 8000, startValue: 142 }), null)
  assert.equal(buildChapterTransitionBreakdown({ prevSummary: { valueEnd: 100 }, chapter: { n: 2 }, incomeAdded: 8000, startValue: NaN }), null)
})
