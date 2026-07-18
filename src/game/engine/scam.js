// Scammer — กลไกพิเศษ ไม่ใช่แค่ tag matching (ดีไซน์ข้อ 8)
//
// ต่างจากเหตุการณ์อื่นตรงที่ความเสียหายไม่ได้มาจากการที่พอร์ตอ่อนไหว
// แต่มาจากการที่ผู้เล่น "กดรับข้อเสนอ" เอง — เป็นเหตุการณ์เดียวในเกมที่หลบได้ 100% ถ้าอ่านสัญญาณออก

import { BALANCE } from './balance.js'
import { weights } from './portfolio.js'

// ขนาดข้อเสนอโตตามสัดส่วนคริปโต+อนุพันธ์ในพอร์ต
// มิจฉาชีพจริงเล็งคนที่แสดงพฤติกรรมอยากรวยเร็ว ไม่ได้สุ่มยิงมั่ว — เกมจึงเล็งแบบเดียวกัน
export function makeScamOffer(positions, cash) {
  const w = weights(positions)
  const greedShare = (w.crypto ?? 0) + (w.derivatives ?? 0)
  const total = Object.values(positions).reduce((a, b) => a + b, 0) + cash
  const pct = BALANCE.scam.baseOfferPct + BALANCE.scam.greedOfferPct * greedShare

  return {
    offerAmount: total * pct,
    promisedReturnPct: BALANCE.scam.promisedReturnPct,
    greedShare,
    accepted: null, // null = ยังไม่ตอบ
    lost: 0,
  }
}

// รับข้อเสนอ = เสียเงินก้อนนั้นทั้งหมด หักจากเงินสดก่อน แล้วค่อยขายพอร์ตถ้าเงินสดไม่พอ
// (เหมือนโลกจริง: เหยื่อโอนเงินสดก่อน พอไม่พอก็ขายของในพอร์ตไปโอนเพิ่ม)
export function applyScamLoss(positions, cash, scam) {
  const target = scam.offerAmount * BALANCE.scam.lossPct
  const fromCash = Math.min(cash, target)
  let remaining = target - fromCash
  const nextCash = cash - fromCash
  const nextPositions = { ...positions }

  if (remaining > 0) {
    const total = Object.values(nextPositions).reduce((a, b) => a + b, 0)
    if (total > 0) {
      const take = Math.min(remaining, total)
      for (const id of Object.keys(nextPositions)) {
        nextPositions[id] -= take * (nextPositions[id] / total)
      }
      remaining -= take
    }
  }

  return { positions: nextPositions, cash: nextCash, lost: target - remaining }
}
