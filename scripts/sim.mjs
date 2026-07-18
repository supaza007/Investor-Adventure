// รัน: node scripts/sim.mjs [จำนวนรอบ]
//
// จำลองเกมจริงหลายพันรอบด้วยกลยุทธ์พอร์ตต่างๆ เพื่อตอบคำถามที่ playtest กับคนจริงตอบช้าเกินไป:
//   1. กระจายความเสี่ยงชนะกระจุกตัวจริงไหม (ถ้าไม่ เกมสอนผิด)
//   2. มีพอร์ตไหนเป็นเฉลยตายตัวไหม (ถ้ามี decision space ยุบเป็น 0 = ปัญหาเดิมของเกมเก่า)
//
// ⚠️ สำคัญ: sim นี้เดินผ่าน gameReducer ตัวจริง ไม่ได้เขียนสูตรจำลองแยก
// เวอร์ชันแรกเขียนลูปจำลองของตัวเอง ผลคือ sim กับเกมจริงคิดผลตอบแทนคนละจำนวนบท
// แล้วเกมแพ้เกณฑ์อ้างอิงของตัวเองอย่างเป็นระบบโดยไม่มีใครรู้ — อย่าเขียนสูตรซ้ำอีก

import { gameReducer, createInitialState, currentStage } from '../src/game/engine/gameState.js'
import { BALANCE } from '../src/game/engine/balance.js'

const RUNS = Number(process.argv[2]) || 2000

const STRATEGIES = {
  'กระจายครบ 6 ชนิด': { bond: 1, esg: 1, fund: 1, stock: 1, derivatives: 1, crypto: 1 },
  'กองทุนรวมล้วน (เกณฑ์อ้างอิง)': { fund: 1 },
  'ตราสารหนี้ล้วน (กลัวเสี่ยง)': { bond: 1 },
  'หุ้นล้วน': { stock: 1 },
  'คริปโตล้วน (ทุ่มสุดตัว)': { crypto: 1 },
  'ตราสารหนี้+หุ้น 50/50': { bond: 1, stock: 1 },
  'ระวังตัวตามอายุ (60/40)': { bond: 2, fund: 2, stock: 1 },
  'ไม่ลงทุนเลย (เงินสดล้วน)': { cash: 1 },
}

// เล่นจบ 1 รอบผ่าน reducer ตัวจริง — ใช้สัดส่วนเดิมทุกบท ไม่ปรับกลางบท
function simulateRun(weights, seed, styleId, behavior) {
  let s = createInitialState(seed)
  s = gameReducer(s, { type: 'START' })
  s = gameReducer(s, { type: 'SELECT_STYLE', styleId })

  let guard = 0
  while (s.phase !== 'report') {
    if (guard++ > 200) throw new Error('state machine ค้าง')
    if (s.phase === 'allocation') {
      s = gameReducer(s, { type: 'SET_ALLOCATION', weights })
      s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
      continue
    }
    const stage = currentStage(s)
    if (stage.key === 'reveal' && s.scam?.accepted === null) {
      s = gameReducer(s, { type: 'ANSWER_SCAM', accept: false })
    }
    if (stage.key === 'behavior' && !s.behavior) {
      s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: behavior })
    }
    s = gameReducer(s, { type: 'NEXT_STAGE' })
  }
  return s.report
}

function stats(reports) {
  const values = reports.map((r) => r.finalValue).sort((a, b) => a - b)
  const at = (p) => values[Math.min(values.length - 1, Math.floor(p * values.length))]
  return {
    median: at(0.5),
    p10: at(0.1),
    p90: at(0.9),
    ruinRate: reports.filter((r) => r.isRuined).length / reports.length,
  }
}

const style = process.argv[3] || 'medium'
const behavior = process.argv[4] || 'hold'
console.log(`\n🎲 จำลอง ${RUNS} รอบต่อกลยุทธ์ · สไตล์ ${style} · สเตจ 4 เลือก "${behavior}" ทุกครั้ง\n`)

const results = {}
for (const [name, w] of Object.entries(STRATEGIES)) {
  const reports = []
  for (let i = 0; i < RUNS; i++) reports.push(simulateRun(w, i * 7919 + 13, style, behavior))
  results[name] = stats(reports)
}

const benchmark = results['กองทุนรวมล้วน (เกณฑ์อ้างอิง)'].median

console.log('กลยุทธ์'.padEnd(32) + 'กลาง'.padStart(8) + 'แย่ 10%'.padStart(9) + 'ดี 10%'.padStart(9) + 'ช่วงกว้าง'.padStart(11) + 'ล้มละลาย'.padStart(10) + '  vs เกณฑ์')
console.log('─'.repeat(93))
for (const [name, s] of Object.entries(results)) {
  const vsBench = ((s.median / benchmark - 1) * 100).toFixed(0)
  console.log(
    name.padEnd(32) +
      s.median.toFixed(0).padStart(8) +
      s.p10.toFixed(0).padStart(9) +
      s.p90.toFixed(0).padStart(9) +
      (s.p90 - s.p10).toFixed(0).padStart(11) +
      (s.ruinRate * 100).toFixed(1).padStart(9) + '%' +
      `  ${vsBench > 0 ? '+' : ''}${vsBench}%`.padStart(9),
  )
}

console.log('\n── ตรวจว่าเกมสอนถูกไหม ──')
const spread6 = results['กระจายครบ 6 ชนิด']
const allBond = results['ตราสารหนี้ล้วน (กลัวเสี่ยง)']
const allCrypto = results['คริปโตล้วน (ทุ่มสุดตัว)']
const allCash = results['ไม่ลงทุนเลย (เงินสดล้วน)']
const contributed = BALANCE.chapters.reduce((s, c) => s + c.income, 0)


const check = (ok, msg) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}`)
  return ok
}
const checks = [
  check(spread6.median > allBond.median, 'กระจายความเสี่ยงชนะการหลบอยู่ในตราสารหนี้'),
  check(spread6.p90 - spread6.p10 < allCrypto.p90 - allCrypto.p10, 'กระจายความเสี่ยง = ผลลัพธ์คาดเดาได้กว่าการทุ่มสุดตัว'),
  // ล้มละลายถาวรเกิดยาก (~1%) เพราะเงินเดือนก้อนใหม่เข้ามาทุกบทให้สร้างตัวใหม่ได้ — ซึ่งสมจริง
  // บทลงโทษที่แท้จริงของการทุ่มสุดตัวจึงอยู่ที่หางล่าง ไม่ใช่ที่อัตราหมดตัว
  // เช็คเฉพาะสไตล์เริ่มต้น: คนถือยาวโดน margin call ยากกว่าโดยตั้งใจ (แรงกระแทกถูกหน่วง 20%)
  style !== 'medium' || check(allCrypto.ruinRate > 0, 'ทุ่มคริปโตหมดตัวถาวรได้จริง (ไม่ใช่แค่ขู่)'),
  check(allCrypto.p10 < contributed * 0.5, 'ทุ่มคริปโต: 10% ล่างเสียเงินเก็บทั้งชีวิตเกินครึ่ง'),
  check(allBond.ruinRate === 0, 'ตราสารหนี้ไม่ทำให้ล้มละลาย (แค่โตไม่ทันเงินเฟ้อ)'),
  check(allCash.median < contributed, 'ไม่ลงทุนเลยแพ้เงินเฟ้อ — ได้คืนน้อยกว่าเงินที่ใส่ไป'),
]

const [best, second] = [...Object.entries(results)].sort((a, b) => b[1].median - a[1].median)
const gap = best[1].median / second[1].median
checks.push(check(gap < 1.6, `ไม่มีเฉลยตายตัว — "${best[0]}" นำอันดับ 2 อยู่ ${((gap - 1) * 100).toFixed(0)}% (ต้องต่ำกว่า 60%)`))

console.log(`\nℹ️  เกณฑ์อ้างอิงที่วัดได้ = ${benchmark.toFixed(0)} · ที่ตั้งไว้ใน balance.js = ${BALANCE.benchmarkValue}`)
if (Math.abs(benchmark - BALANCE.benchmarkValue) / benchmark > 0.05) {
  console.log(`   ⚠️  ต่างกันเกิน 5% — ต้องแก้ benchmarkValue ใน balance.js เป็น ${Math.round(benchmark)}`)
}
console.log(`   ทุนรวมที่ใส่ตลอดเกม = ${contributed}\n`)
process.exit(checks.every(Boolean) ? 0 : 1)
