// Fixed Event Return Engine
//
// ทุกเหตุการณ์กำหนดผลตอบแทนรายสินทรัพย์ไว้ใน data/events.js โดยตรง
// ไม่มี exposure, severity, outcome band หรือการสุ่มเปอร์เซ็นต์ซ่อนอยู่
// ผลต่อพอร์ต = ผลรวม(มูลค่าสินทรัพย์ × ผลตอบแทนของสินทรัพย์นั้น)

import { getTool } from './data/tools.js'

const cleanRate = (value) => Math.round(value * 1e12) / 1e12

export function returnsForEvent(event, { scale = 1, negativeOnly = false } = {}) {
  const source = event?.returns
  if (!source) return {}

  return Object.fromEntries(Object.entries(source).map(([toolId, value]) => {
    const resolved = negativeOnly ? Math.min(0, value) : value
    return [toolId, cleanRate(resolved * scale)]
  }))
}

export function applyAgeModifiers(baseReturns, chapterIndex, ageModifiers = []) {
  const rule = ageModifiers[chapterIndex] ?? {}
  const modifiers = {}
  const finalReturns = {}

  for (const [toolId, baseReturn] of Object.entries(baseReturns)) {
    let modifier = 0
    if (baseReturn < 0 && rule.negativeRelief) modifier += Math.min(rule.negativeRelief, Math.abs(baseReturn))
    if (baseReturn < 0 && (toolId === 'stock' || toolId === 'crypto') && rule.riskyLossPenalty) modifier -= rule.riskyLossPenalty
    if (baseReturn > 0 && toolId === 'bond' && rule.bondPositiveBonus) modifier += rule.bondPositiveBonus
    modifiers[toolId] = cleanRate(modifier)
    finalReturns[toolId] = cleanRate(baseReturn + modifier)
  }

  return { modifiers, finalReturns }
}

export function applyEventReturns(positions, event, options = {}) {
  const baseReturns = returnsForEvent(event, options)
  const adjusted = applyAgeModifiers(baseReturns, options.chapterIndex, options.ageModifiers)
  const assetReturns = options.ageModifiers ? adjusted.finalReturns : baseReturns
  const next = {}
  const impacts = []
  let beforeTotal = 0
  let changeTotal = 0

  for (const [toolId, amount] of Object.entries(positions)) {
    const tool = getTool(toolId)
    if (!tool || !Number.isFinite(amount) || amount < 0) continue

    const eventReturn = assetReturns[toolId] ?? 0
    const after = Math.max(0, amount * (1 + eventReturn))
    const change = after - amount
    next[toolId] = after
    beforeTotal += amount
    changeTotal += change
    impacts.push({ toolId, before: amount, after, change, returnPct: eventReturn })
  }

  return {
    positions: next,
    baseReturns,
    ageModifiers: adjusted.modifiers,
    assetReturns,
    impacts,
    portfolioReturn: beforeTotal > 0 ? changeTotal / beforeTotal : 0,
  }
}
