// รายงานผลเกษียณ (อายุ 60) — ไม่ใช่ win/lose แต่เป็นสเปกตรัม (ดีไซน์ข้อ 7)
//
// หัวใจคือทำให้ผู้เล่นเห็นว่า "ตัดสินใจถูกแล้วยังแพ้ได้" โดยไม่รู้สึกว่าเกมโกง
// จึงต้องโชว์ทั้งคุณภาพการเตรียมพอร์ต และผลที่จับสลากได้ เทียบกันตรงๆ ทุกบท

import { BALANCE } from './balance.js'
import { getEvent } from './data/events.js'

const totalContributed = () => BALANCE.chapters.reduce((s, c) => s + c.income, 0)

function bandFor(ratio) {
  return BALANCE.outcomeBands.find((b) => ratio >= b.minRatio) ?? BALANCE.outcomeBands[BALANCE.outcomeBands.length - 1]
}

// แปล percentile ที่จับสลากได้เป็นภาษาคน — นี่คือส่วนที่ทำให้ผู้เล่นไม่รู้สึกโดนโกง
function luckLabel(percentile) {
  if (percentile >= 0.8) return { text: 'โชคดีกว่าที่ควรจะเป็น', tone: 'good' }
  if (percentile >= 0.55) return { text: 'ผลออกมาดีกว่าค่ากลางเล็กน้อย', tone: 'good' }
  if (percentile >= 0.45) return { text: 'ผลออกมาตามค่ากลาง', tone: 'neutral' }
  if (percentile >= 0.2) return { text: 'ผลออกมาแย่กว่าค่ากลางเล็กน้อย', tone: 'bad' }
  return { text: 'จับสลากได้กรณีโชคร้ายที่สุด', tone: 'bad' }
}

// แปลคุณภาพการเตรียมพอร์ตเป็นภาษาคน (ยิ่งกระจุก+ยิ่งอ่อนไหว = เตรียมแย่)
function prepLabel(exposure, concentration) {
  const score = 1 - (exposure * 0.7 + concentration * 0.3)
  if (score >= 0.7) return { text: 'เตรียมพอร์ตมาดีมาก', tone: 'good', score }
  if (score >= 0.5) return { text: 'เตรียมพอร์ตมาพอใช้', tone: 'neutral', score }
  if (score >= 0.3) return { text: 'พอร์ตอ่อนไหวต่อเหตุการณ์นี้', tone: 'bad', score }
  return { text: 'พอร์ตกระจุกตรงจุดอ่อนพอดี', tone: 'bad', score }
}

const BEHAVIOR_LABEL = {
  hold: 'ถือต่อ',
  cut: 'ตัดขาดทุน',
  buy: 'ซื้อเพิ่มตอนราคาถูก',
}

export function buildReport(state) {
  const finalValue = Object.values(state.positions).reduce((a, b) => a + b, 0) + state.cash
  const contributed = totalContributed()
  const benchmark = BALANCE.benchmarkValue
  const ratio = finalValue / benchmark
  const isRuined = finalValue < contributed * BALANCE.ruinThreshold

  const chapters = state.history.map((h) => {
    const event = getEvent(h.eventId)
    const change = h.valueAfter - h.valueBefore
    return {
      ...h,
      // ส่ง emoji ต่อให้ UI ใช้ตอนไม่มีไฟล์ภาพ (เวอร์ชันที่ deploy ขึ้นเว็บ ดู components/art.js)
      emoji: event?.emoji ?? '❓',
      changePct: h.valueBefore > 0 ? change / h.valueBefore : 0,
      change,
      luck: luckLabel(h.percentile),
      prep: prepLabel(h.exposure, h.concentration),
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
    band: isRuined ? { id: 'ruined', label: 'ล้มละลาย' } : bandFor(ratio),
    multiple: finalValue / contributed,
    chapters,
    worst,
    best,
    scamVictim: chapters.some((c) => c.scamAccepted),
    blackSwanCount: chapters.filter((c) => c.isBlackSwan).length,
  }
}
