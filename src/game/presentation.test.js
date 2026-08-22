import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChapterTransitionBreakdown } from './presentation.js'

test('อธิบายเงิน 100 → 142 ว่ามาจากรายได้ใหม่และเงินเฟ้อ ไม่ใช่กำไร', () => {
  const result = buildChapterTransitionBreakdown({
    prevSummary: { valueEnd: 100 },
    chapter: { income: 60 },
    startValue: 100 * (1.02 ** -10) + 60,
  })

  assert.equal(result.income, 60)
  assert.ok(Math.abs(result.cashAdjustment - -17.965) < 0.01)
  assert.ok(Math.abs(result.netChange - 42.035) < 0.01)
  assert.ok(Math.abs(result.startValue - 142.035) < 0.01)
})
test('รองรับพอร์ตลงทุนที่เงินสดถูกปรับเพียงบางส่วน', () => {
  const result = buildChapterTransitionBreakdown({
    prevSummary: { valueEnd: 250 },
    chapter: { income: 100 },
    startValue: 345,
  })

  assert.deepEqual(result, {
    previousValue: 250,
    income: 100,
    cashAdjustment: -5,
    netChange: 95,
    startValue: 345,
  })
})

test('ไม่สร้าง breakdown จากข้อมูลไม่ครบหรือไม่ใช่ตัวเลข', () => {
  assert.equal(buildChapterTransitionBreakdown({ prevSummary: null, chapter: { income: 60 }, startValue: 142 }), null)
  assert.equal(buildChapterTransitionBreakdown({ prevSummary: { valueEnd: 100 }, chapter: { income: 60 }, startValue: NaN }), null)
})
