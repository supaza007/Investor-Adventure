// Encounter Engine — แทน attack/block/debuff เดิมทั้งหมด (ดีไซน์ข้อ 4)
//
// แนวคิด: เหตุการณ์ไม่มี HP ให้ตี มันคือสภาพอากาศ ผลลัพธ์เกิดจาก "การทับซ้อนของ tag"
// ระหว่างความอ่อนไหวของพอร์ตกับประเภทของเหตุการณ์ พอร์ตกระจุกตัวโดนตรงจุดจะเจ็บหนักโดยอัตโนมัติ
// — สอนการกระจายความเสี่ยงผ่านผลลัพธ์ ไม่ใช่ผ่านข้อความ
//
// ทุกฟังก์ชันเป็น pure: การสุ่มต้องส่ง rng เข้ามา (ทดสอบ + sim ซ้ำได้เป๊ะ)

import { getTool } from './data/tools.js'
import { weights, concentration } from './portfolio.js'
import { BALANCE } from './balance.js'

// ความอ่อนไหวของเครื่องมือชิ้นเดียวต่อเหตุการณ์หนึ่ง (ถ่วงตาม tagWeights ของเหตุการณ์)
export function toolExposure(toolId, event) {
  const tool = getTool(toolId)
  if (!tool) return 0
  let sens = 0
  for (const [tag, tagWeight] of Object.entries(event.tagWeights)) {
    sens += tagWeight * (tool.exposure[tag] ?? 0)
  }
  return sens * (tool.shockMult ?? 1) // กองทุนรวมมีกระจายความเสี่ยงในตัว → 0.75
}

// ความอ่อนไหวรวมของทั้งพอร์ต 0..1
export function portfolioExposure(positions, event) {
  const w = weights(positions)
  let total = 0
  for (const [toolId, weight] of Object.entries(w)) {
    total += weight * toolExposure(toolId, event)
  }
  return total
}

// สร้างช่วงผลลัพธ์ (outcome band) จากคุณภาพการเตรียมพอร์ต — ยังไม่สุ่ม
// กระจายดี = ช่วงแคบเลื่อนบวก · กระจุก = ช่วงกว้างเลื่อนลบ (ดีไซน์ข้อ 7)
export function outcomeBand(positions, event, options = {}) {
  const { styleShockMult = 1, isBlackSwan = false } = options
  const S = event.severity

  const D = isBlackSwan ? 0 : concentration(positions)
  const E = isBlackSwan ? BALANCE.blackSwanExposure : portfolioExposure(positions, event)

  const center = -S * E * (1 + BALANCE.concentrationCenterMult * D) * styleShockMult
  const halfWidth = S * (BALANCE.bandWidthBase + BALANCE.bandWidthPerConcentration * D)

  return {
    min: center - halfWidth,
    max: center + halfWidth,
    center,
    exposure: E,
    concentration: D,
    isBlackSwan,
  }
}

// สุ่มผลจริงจากในช่วง แล้วรายงานว่าตกอยู่ตรงไหนของช่วง (0 = แย่สุดในช่วง, 1 = ดีสุดในช่วง)
// สเตจ 5 เอา percentile ไปบอกผู้เล่นว่า "เตรียมดีแต่จับสลากไม่ดี" — เห็นว่าเกมไม่ได้โกง
export function rollShock(band, rng = Math.random) {
  const roll = rng()
  const shockPct = band.min + roll * (band.max - band.min)
  return {
    shockPct,
    percentile: roll,
    band,
  }
}

export const isBlackSwan = (rng = Math.random) => rng() < BALANCE.blackSwanChance

// ลงแรงกระแทกกับพอร์ตจริง
// เครื่องมือที่ล้มละลายได้ (อนุพันธ์/คริปโต) ถูกกระแทกแรงกว่าค่าเฉลี่ยตามความอ่อนไหวของตัวเอง
// และตกถึง 0 ได้จริง ส่วนเครื่องมือปกติมีพื้นกันไว้ที่ 10% (หุ้นดัชนีไม่เคยเป็นศูนย์)
// หมายเหตุ: shockPct ที่ส่งเข้ามาผ่าน outcomeBand มาแล้ว จึงคิด styleShockMult ไปเรียบร้อย — อย่าคูณซ้ำที่นี่
export function applyShock(positions, event, shockPct, options = {}) {
  const { isBlackSwan: bs = false } = options
  const avgExposure = bs ? BALANCE.blackSwanExposure : portfolioExposure(positions, event)
  const next = {}

  for (const [toolId, amount] of Object.entries(positions)) {
    const tool = getTool(toolId)
    if (!tool) continue

    // แจกแรงกระแทกตามสัดส่วนความอ่อนไหวของแต่ละชิ้นเทียบกับค่าเฉลี่ยพอร์ต
    // (ผลรวมยังเท่ากับ shockPct ที่สุ่มได้ แต่คนที่ถือคริปโตเจ็บหนักกว่าคนที่ถือตราสารหนี้ในพอร์ตเดียวกัน)
    const own = bs ? BALANCE.blackSwanExposure : toolExposure(toolId, event)
    const ratio = avgExposure > 0 ? own / avgExposure : 1
    const toolShock = shockPct * ratio

    // Margin call — เลเวอเรจโดนบังคับขายทีเดียวหมด ไม่ใช่ค่อยๆ ลด
    if (tool.canRuin && toolShock < BALANCE.marginCallThreshold) {
      next[toolId] = 0
      continue
    }

    const floor = tool.canRuin ? 0 : 0.1 // หุ้นดัชนี/กองทุนไม่เคยเป็นศูนย์ ต่อให้วิกฤตหนักแค่ไหน
    next[toolId] = Math.max(amount * floor, amount * (1 + toolShock))
  }
  return next
}
