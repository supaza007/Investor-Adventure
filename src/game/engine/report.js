// สถานะทางการเงินเมื่ออายุ 60 — ไม่ใช่ win/lose แต่เป็นสเปกตรัม (ดีไซน์ข้อ 7)
//
// หัวใจคือทำให้ผู้เล่นเห็นว่าการจัดพอร์ตแพ้หรือชนะเหตุการณ์ตรงไหน
// ด้วยผลตอบแทนตายตัวที่ตรวจสอบย้อนกลับได้ทุกบท

import { BALANCE } from './balance.js'
import { getEvent } from './data/events.js'

function bandFor(multiple) {
  return BALANCE.outcomeBands.find((b) => multiple >= b.minMultiple) ?? BALANCE.outcomeBands[BALANCE.outcomeBands.length - 1]
}

// สรุปผลจาก Matrix เป็นภาษาคน ใช้ซ้ำทั้ง timeline และรายงานจบเกม
export function prepLabel(eventReturn) {
  const score = Math.max(0, Math.min(1, (eventReturn + 0.2) / 0.35))
  if (eventReturn >= 0.1) return { text: 'พอร์ตได้เปรียบเหตุการณ์นี้', tone: 'good', score }
  if (eventReturn >= 0) return { text: 'พอร์ตรับมือเหตุการณ์นี้ได้', tone: 'good', score }
  if (eventReturn > -0.1) return { text: 'พอร์ตเสียหายจำกัด', tone: 'neutral', score }
  return { text: 'พอร์ตแพ้ทางเหตุการณ์นี้', tone: 'bad', score }
}

export function cashOnlyPrepLabel() {
  return { text: 'ถือเงินสดทั้งหมด — ยังไม่มีการกระจายการลงทุน', tone: 'neutral', score: null }
}

const BEHAVIOR_LABEL = {
  hold: 'ถือต่อ',
  cut: 'ตัดขาดทุน',
  buy: 'ซื้อเพิ่มตอนราคาถูก',
}

export function buildReport(state) {
  const finalValue = Object.values(state.positions).reduce((a, b) => a + b, 0) + state.cash
  const contributed = state.incomeSchedule.reduce((sum, amount) => sum + amount, 0)
  const benchmark = BALANCE.benchmarkValue
  const multiple = contributed > 0 ? finalValue / contributed : 0
  const ratio = multiple
  const isRuined = multiple < 0.2

  const chapters = state.history.map((h) => {
    const event = getEvent(h.eventId)
    const change = h.valueAfter - h.valueBefore
    return {
      ...h,
      // ส่ง emoji ต่อให้ UI ใช้ตอนไม่มีไฟล์ภาพ (เวอร์ชันที่ deploy ขึ้นเว็บ ดู components/art.js)
      emoji: event?.emoji ?? '❓',
      changePct: h.valueBefore > 0 ? change / h.valueBefore : 0,
      change,
      prep: h.cashOnly ? cashOnlyPrepLabel() : prepLabel(h.shockPct),
      behaviorLabel: BEHAVIOR_LABEL[h.behavior] ?? '—',
    }
  })

  // บทที่ช่วย/ทำร้ายพอร์ตมากที่สุด — ตอบคำถาม "แล้วตกลงฉันพลาดตรงไหน"
  const sorted = [...chapters].sort((a, b) => a.changePct - b.changePct)
  const worst = sorted[0] ?? null
  const best = sorted[sorted.length - 1] ?? null

  return {
    finalValue,
    contributed,
    benchmark,
    ratio,
    isRuined,
    band: bandFor(multiple),
    multiple,
    netGain: finalValue - contributed,
    netGainPct: multiple - 1,
    chapters,
    cashOnlyChapters: chapters.filter((c) => c.cashOnly).length,
    worst,
    best,
    scamVictim: chapters.some((c) => c.scamAccepted),
  }
}
