const nearZero = (value) => Math.abs(value) < 1e-9

export function buildChapterTransitionBreakdown({ prevSummary, chapter, startValue }) {
  if (!prevSummary || !chapter || !Number.isFinite(startValue)) return null

  const previousValue = prevSummary.valueEnd
  const income = chapter.income
  if (!Number.isFinite(previousValue) || !Number.isFinite(income)) return null

  const netChange = startValue - previousValue
  const cashAdjustment = netChange - income

  return {
    previousValue,
    income,
    cashAdjustment: nearZero(cashAdjustment) ? 0 : cashAdjustment,
    netChange: nearZero(netChange) ? 0 : netChange,
    startValue,
  }
}
