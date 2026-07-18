// คณิตศาสตร์ของพอร์ต — pure functions ล้วน ไม่มี state ไม่มี React ไม่มีการสุ่ม
// positions = { [toolId]: amount } เช่น { bond: 40, stock: 60 }

import { getTool, TOOL_COUNT } from './data/tools.js'

export const totalValue = (positions) =>
  Object.values(positions).reduce((sum, amount) => sum + amount, 0)

// สัดส่วนของแต่ละตำแหน่ง { [toolId]: 0..1 } — พอร์ตว่างคืน {} (ไม่ใช่ NaN)
export function weights(positions) {
  const total = totalValue(positions)
  if (total <= 0) return {}
  const result = {}
  for (const [toolId, amount] of Object.entries(positions)) {
    if (amount > 0) result[toolId] = amount / total
  }
  return result
}

// ดัชนี Herfindahl-Hirschman: ผลรวมกำลังสองของสัดส่วน
// ทุ่มตัวเดียว = 1 · กระจายเท่ากันครบ 6 ชนิด = 1/6 ≈ 0.167
export function hhi(positions) {
  const w = weights(positions)
  return Object.values(w).reduce((sum, x) => sum + x * x, 0)
}

// ระดับการกระจุกตัวปรับสเกลเป็น 0..1 เพื่อป้อนสูตร outcome band
// 0 = กระจายสมบูรณ์ (ครบ 6 ชนิดเท่าๆ กัน) · 1 = ทุ่มชนิดเดียว
export function concentration(positions) {
  const total = totalValue(positions)
  if (total <= 0) return 0
  const floor = 1 / TOOL_COUNT
  const raw = (hhi(positions) - floor) / (1 - floor)
  return Math.min(1, Math.max(0, raw))
}

// สุ่มค่าแจกแจงปกติจาก rng ที่แจกแบบเท่ากัน (Box-Muller)
function gaussian(rng) {
  const u = Math.max(1e-12, rng())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng())
}

// เติบโตข้ามบท (1 บท ≈ 10 ปี) — การทบต้นเงียบๆ ที่ให้รางวัลการถือ (ดีไซน์ข้อ 3)
// returnMult มาจากสไตล์นักลงทุน: ระยะยาว 1.15 / เทรดเดอร์ 0.85
//
// ส่ง rng เข้ามา = ผลตอบแทนสุ่มแบบ lognormal รอบค่ากลาง (ใช้ตอนเล่นจริง)
// ไม่ส่ง = ได้ค่ากลางเป๊ะๆ (ใช้ตอนคำนวณเกณฑ์อ้างอิงและตอนเทสต์)
//
// ความผันผวนเป็นของตลาด ไม่ใช่ของสไตล์ → returnMult คูณเฉพาะค่ากลาง ไม่ไปแตะ vol
// (ไม่งั้นนักลงทุนระยะยาวที่ถือคริปโตจะ "ขาดทุนเก่งขึ้น" ด้วย ซึ่งไม่มีเหตุผล)
export function applyGrowth(positions, returnMult = 1, rng = null) {
  const next = {}
  for (const [toolId, amount] of Object.entries(positions)) {
    const tool = getTool(toolId)
    if (!tool) continue
    const median = 1 + (tool.growthMult - 1) * returnMult
    const mult = rng ? median * Math.exp(tool.growthVol * gaussian(rng)) : median
    next[toolId] = Math.max(0, amount * mult)
  }
  return next
}

// ย้ายเงินระหว่างเครื่องมือตามสัดส่วนเป้าหมาย { [toolId]: 0..1 }
// คืนค่าพอร์ตใหม่ + มูลค่าที่ย้าย (ใช้คิดค่าธรรมเนียมของเทรดเดอร์)
export function rebalance(positions, targetWeights, feePct = 0) {
  const total = totalValue(positions)
  if (total <= 0) return { positions: { ...positions }, traded: 0, fee: 0 }

  const sumTarget = Object.values(targetWeights).reduce((s, x) => s + x, 0)
  if (sumTarget <= 0) return { positions: { ...positions }, traded: 0, fee: 0 }

  const target = {}
  for (const [toolId, w] of Object.entries(targetWeights)) {
    target[toolId] = (w / sumTarget) * total // normalize เผื่อสัดส่วนที่ส่งมารวมไม่ถึง 1
  }

  // มูลค่าที่ย้ายจริง = ครึ่งหนึ่งของผลต่างสัมบูรณ์ทั้งหมด (ขายเท่าไหร่ ซื้อเท่านั้น)
  const allIds = new Set([...Object.keys(positions), ...Object.keys(target)])
  let absDiff = 0
  for (const id of allIds) {
    absDiff += Math.abs((target[id] ?? 0) - (positions[id] ?? 0))
  }
  const traded = absDiff / 2
  const fee = traded * feePct

  // ค่าธรรมเนียมหักออกจากพอร์ตตามสัดส่วนหลังย้าย
  const next = {}
  const afterFeeTotal = total - fee
  for (const [id, amount] of Object.entries(target)) {
    if (amount > 0) next[id] = (amount / total) * afterFeeTotal
  }
  return { positions: next, traded, fee }
}
