// เทสต์ state machine — เล่นเกมจนจบด้วยโค้ดล้วน ไม่ต้องมี UI
// รัน: npm test

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  gameReducer,
  createInitialState,
  currentStage,
  currentEvent,
  netWorth,
  canAdjustNow,
  STAGES,
} from './gameState.js'
import { BALANCE } from './balance.js'
import { getEvent } from './data/events.js'

const BALANCED = { bond: 1, esg: 1, fund: 1, stock: 1, derivatives: 1, crypto: 1 }

// เล่นจบ 1 รอบ: จัดพอร์ตตามสัดส่วนที่กำหนด แล้วกดผ่านทุกสเตจของทุกบท
function playFullRun(weights = BALANCED, { styleId = 'medium', seed = 12345, behavior = 'hold' } = {}) {
  let s = createInitialState(seed)
  s = gameReducer(s, { type: 'START' })
  s = gameReducer(s, { type: 'SELECT_STYLE', styleId })

  let guard = 0
  while (s.phase !== 'report') {
    if (guard++ > 200) throw new Error('เกมวนไม่จบ — state machine ค้าง')

    if (s.phase === 'allocation') {
      s = gameReducer(s, { type: 'SET_ALLOCATION', weights })
      s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
      continue
    }
    const stage = currentStage(s)
    if (stage.key === 'reveal' && s.scam && s.scam.accepted === null) {
      s = gameReducer(s, { type: 'ANSWER_SCAM', accept: false })
    }
    if (stage.key === 'behavior' && !s.behavior) {
      s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: behavior })
    }
    s = gameReducer(s, { type: 'NEXT_STAGE' })
  }
  return s
}

describe('การเดินเรื่องของเกม', () => {
  test('เล่นจบครบ 4 บทแล้วไปหน้ารายงาน', () => {
    const s = playFullRun()
    assert.equal(s.phase, 'report')
    assert.equal(s.history.length, 4)
    assert.ok(s.report)
  })

  test('เจอเหตุการณ์ครบทั้ง 4 ประเภทความเสี่ยง ไม่ซ้ำ tag', () => {
    // ถ้าปล่อยสุ่มอิสระ อาจเจอ tag เดิม 4 รอบแล้วบทเรียนการกระจายความเสี่ยงหายไปเลย
    for (const seed of [1, 2, 999, 54321]) {
      const s = playFullRun(BALANCED, { seed })
      const primaryTags = s.history.map((h) => {
        const e = getEvent(h.eventId)
        return Object.entries(e.tagWeights).sort((a, b) => b[1] - a[1])[0][0]
      })
      assert.equal(new Set(primaryTags).size, 4, `seed ${seed}: เจอ tag ซ้ำ`)
    }
  })

  test('บทที่ 3 เป็นวิกฤตใหญ่สุดเสมอ (ดีไซน์ข้อ 3)', () => {
    for (const seed of [1, 7, 42, 100, 12345]) {
      const s = playFullRun(BALANCED, { seed })
      const severities = s.history.map((h) => getEvent(h.eventId).severity)
      const maxSeverity = Math.max(...severities)
      assert.equal(severities[2], maxSeverity, `seed ${seed}: บท 3 ไม่ใช่วิกฤตใหญ่สุด`)
    }
  })

  test('ทุกบทได้ผลตอบแทนของทศวรรษตัวเอง รวมถึงบทสุดท้าย', () => {
    // บั๊กที่เคยเกิด: finishChapter ของบทสุดท้าย return ไปหน้ารายงานก่อนคิดผลตอบแทน
    // ทศวรรษสุดท้าย (อายุ 50-59) จึงไม่โตเลย = การทบต้น 1 ใน 4 ของเกมหายไปเงียบๆ
    // และเกมแพ้เกณฑ์อ้างอิงของตัวเองอย่างเป็นระบบ เพราะ sim คิดผลตอบแทนครบ 4 บท
    const { report } = playFullRun({ bond: 1 }, { seed: 55, behavior: 'hold' })
    const last = report.chapters[3]
    assert.ok(
      last.valueEnd > last.valueAfter * 1.05,
      `บทสุดท้ายต้องมีผลตอบแทนของทศวรรษตัวเอง (หลังกระแทก ${last.valueAfter.toFixed(0)} → ปลายบท ${last.valueEnd.toFixed(0)})`,
    )
    assert.ok(Math.abs(report.finalValue - last.valueEnd) < 1e-6, 'ยอดสุดท้ายต้องตรงกับปลายบทที่ 4')
  })

  test('การตัดสินใจที่สเตจ 4 ของบทสุดท้ายยังมีผลจริง ไม่ใช่ปุ่มตาย', () => {
    const hold = playFullRun(BALANCED, { seed: 99, behavior: 'hold' })
    const cut = playFullRun(BALANCED, { seed: 99, behavior: 'cut' })
    assert.notEqual(hold.report.chapters[3].valueEnd, cut.report.chapters[3].valueEnd)
  })

  test('เกษียณแล้วไม่มีเงินเดือนเข้าอีก — ยอดสุดท้ายมาจากพอร์ตล้วน', () => {
    const { report } = playFullRun(BALANCED, { seed: 8 })
    assert.equal(report.contributed, BALANCE.chapters.reduce((s, c) => s + c.income, 0))
  })

  test('reducer เป็น pure — เล่น seed เดิมได้ผลเดิมเป๊ะ', () => {
    // ถ้าข้อนี้ตก แปลว่ามีการสุ่มหลุดออกไปนอก state (React Strict Mode จะทำเกมเพี้ยนทันที)
    const a = playFullRun(BALANCED, { seed: 777 })
    const b = playFullRun(BALANCED, { seed: 777 })
    assert.equal(a.report.finalValue, b.report.finalValue)
    assert.deepEqual(a.history, b.history)
  })

  test('seed ต่างกันได้ผลต่างกัน (ตัวสุ่มเดินหน้าจริง ไม่ค้างที่เดิม)', () => {
    const a = playFullRun(BALANCED, { seed: 1 })
    const b = playFullRun(BALANCED, { seed: 2 })
    assert.notEqual(a.report.finalValue, b.report.finalValue)
  })
})

describe('การจัดพอร์ต', () => {
  test('เงินทุนเริ่มต้นตรงตาม balance และลงพอร์ตได้ครบ', () => {
    let s = createInitialState(1)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    assert.equal(s.cash, BALANCE.chapters[0].income)

    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { fund: 1 } })
    assert.equal(s.cash, 0)
    assert.ok(Math.abs(netWorth(s) - BALANCE.chapters[0].income) < 1e-9, 'เงินหายระหว่างจัดพอร์ต')
  })

  test('ถือเงินสดไว้บางส่วนได้ และมูลค่ารวมไม่เปลี่ยน', () => {
    let s = createInitialState(1)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { fund: 0.5, cash: 0.5 } })
    assert.ok(Math.abs(s.cash - 50) < 1e-9)
    assert.ok(Math.abs(netWorth(s) - 100) < 1e-9)
  })

  test('เทรดเดอร์เสียค่าธรรมเนียมตอนปรับพอร์ต ระยะยาวไม่เสีย', () => {
    const setup = (styleId) => {
      let s = createInitialState(1)
      s = gameReducer(s, { type: 'START' })
      s = gameReducer(s, { type: 'SELECT_STYLE', styleId })
      return gameReducer(s, { type: 'SET_ALLOCATION', weights: { fund: 1 } })
    }
    assert.ok(setup('trader').lastFee > 0)
    assert.equal(setup('longterm').lastFee, 0)
  })

  test('สไตล์ระยะยาวปรับพอร์ตกลางบทไม่ได้ เทรดเดอร์ปรับได้', () => {
    const atStage = (styleId, stageKey) => {
      let s = createInitialState(1)
      s = gameReducer(s, { type: 'START' })
      s = gameReducer(s, { type: 'SELECT_STYLE', styleId })
      s = gameReducer(s, { type: 'SET_ALLOCATION', weights: BALANCED })
      s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
      while (currentStage(s).key !== stageKey) s = gameReducer(s, { type: 'NEXT_STAGE' })
      return canAdjustNow(s)
    }
    assert.equal(atStage('longterm', 'signal'), false, 'ระยะยาวต้องปรับกลางบทไม่ได้')
    assert.equal(atStage('trader', 'signal'), true, 'เทรดเดอร์ต้องปรับได้ทุกจังหวะ')
    assert.equal(atStage('medium', 'signal'), false)
    assert.equal(atStage('medium', 'reveal'), true, 'ระยะกลางปรับได้ที่สเตจ 2')
  })
})

describe('จุดตัดสินใจพฤติกรรม (สเตจ 4)', () => {
  const toBehavior = (choice, styleId = 'medium') => {
    let s = createInitialState(31337)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId })
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { stock: 0.7, cash: 0.3 } })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
    while (currentStage(s).key !== 'behavior') s = gameReducer(s, { type: 'NEXT_STAGE' })
    if (s.scam?.accepted === null) s = gameReducer(s, { type: 'ANSWER_SCAM', accept: false })
    return gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice })
  }

  test('ตัดขาดทุน = ย้ายไปตราสารหนี้ทั้งหมด และกันคลื่นตามได้', () => {
    const s = toBehavior('cut')
    assert.deepEqual(Object.keys(s.positions), ['bond'])
    assert.equal(s.immuneToAftershock, true)
    assert.equal(s.reboundOwed, 0)
  })

  test('ซื้อเพิ่ม = เทเงินสดลงพอร์ตจนหมด และได้ฟื้นตัวมากกว่าถือต่อ', () => {
    const buy = toBehavior('buy')
    const hold = toBehavior('hold')
    assert.equal(buy.cash, 0)
    assert.ok(buy.reboundOwed > hold.reboundOwed, 'ซื้อเพิ่มต้องฟื้นแรงกว่าถือเฉยๆ')
  })

  test('VI ได้โบนัสซื้อเพิ่มมากกว่าสไตล์อื่นจริง', () => {
    assert.ok(toBehavior('buy', 'vi').reboundOwed > toBehavior('buy', 'medium').reboundOwed)
  })

  test('เลือกซ้ำไม่ได้ (กันกดรัวจนได้โบนัสหลายเด้ง)', () => {
    const once = toBehavior('hold')
    const twice = gameReducer(once, { type: 'CHOOSE_BEHAVIOR', choice: 'buy' })
    assert.equal(twice.behavior, 'hold')
    assert.equal(twice.reboundOwed, once.reboundOwed)
  })
})

describe('Scammer', () => {
  // เดินไปถึงบทที่มิจฉาชีพทัก (อีเวนต์เสริม สุ่มบทเดียวต่อรอบ)
  const reachScam = (seed = 1) => {
    let s = createInitialState(seed)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    while (s.chapterIndex !== s.scamChapter) {
      if (s.phase === 'allocation') {
        s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { crypto: 0.6, bond: 0.4 } })
        s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
        continue
      }
      if (currentStage(s).key === 'behavior' && !s.behavior) {
        s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      }
      s = gameReducer(s, { type: 'NEXT_STAGE' })
    }
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { crypto: 0.6, bond: 0.4 } })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
    while (currentStage(s).key !== 'reveal') s = gameReducer(s, { type: 'NEXT_STAGE' })
    return s
  }

  test('เป็นอีเวนต์เสริม ไม่กินสล็อตเหตุการณ์ประจำบท', () => {
    for (let seed = 1; seed < 200; seed++) {
      let s = createInitialState(seed)
      s = gameReducer(s, { type: 'START' })
      s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
      assert.ok(!s.eventOrder.includes('scammer'), `seed ${seed}: scammer ไม่ควรถูกสุ่มเป็นเหตุการณ์ประจำบท`)
      assert.ok(s.scamChapter >= 0 && s.scamChapter < BALANCE.chapters.length, `seed ${seed}: scamChapter ต้องอยู่ในช่วงบทที่มีจริง`)
    }
  })

  test('ข้อเสนอโผล่ที่สเตจ 2 ของบทที่มิจฉาชีพทัก และซ้อนบนเหตุการณ์ประจำบท', () => {
    const s = reachScam()
    assert.ok(s.scam, 'ต้องมีข้อเสนอ')
    assert.equal(s.scam.accepted, null)
    assert.ok(s.scam.offerAmount > 0)
    assert.ok(currentEvent(s), 'บทนั้นต้องยังมีเหตุการณ์ประจำบทของตัวเอง')
    assert.notEqual(currentEvent(s).id, 'scammer')
  })

  test('ทักครั้งเดียวต่อรอบ ไม่โผล่ซ้ำบทอื่น', () => {
    let s = reachScam()
    s = gameReducer(s, { type: 'ANSWER_SCAM', accept: false })
    const scamChapter = s.chapterIndex
    let offersSeen = 1

    while (s.phase !== 'report') {
      if (s.phase === 'allocation') {
        s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { bond: 1 } })
        s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
        continue
      }
      if (currentStage(s).key === 'behavior' && !s.behavior) {
        s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      }
      s = gameReducer(s, { type: 'NEXT_STAGE' })
      if (s.phase === 'stage' && s.chapterIndex !== scamChapter && s.scam) offersSeen++
    }

    assert.equal(offersSeen, 1, 'มิจฉาชีพต้องทักครั้งเดียวต่อรอบ')
  })

  test('ยิ่งถือคริปโต/อนุพันธ์เยอะ มิจฉาชีพยิ่งล่อหนัก', () => {
    const s = reachScam()
    assert.ok(s.scam.greedShare > 0.5, 'พอร์ตคริปโต 60% ควรถูกเล็งเป็นเหยื่อ')
    const greedy = s.scam.offerAmount
    // เทียบกับพอร์ตที่ไม่มีคริปโตเลย
    const safe = gameReducer(s, { type: 'SET_ALLOCATION', weights: { bond: 1 } })
    assert.ok(greedy / (netWorth(s) || 1) > BALANCE.scam.baseOfferPct)
    assert.ok(safe.scam.offerAmount === greedy, 'ข้อเสนอที่ยื่นแล้วไม่ควรเปลี่ยนตามการปรับพอร์ตทีหลัง')
  })

  test('ปฏิเสธ = ไม่เสียอะไรเลยสักบาท · รับ = เสียเงินก้อนนั้นจริง', () => {
    const base = reachScam()
    const decline = gameReducer(base, { type: 'ANSWER_SCAM', accept: false })
    const accept = gameReducer(base, { type: 'ANSWER_SCAM', accept: true })

    const afterDecline = gameReducer(decline, { type: 'NEXT_STAGE' })
    const afterAccept = gameReducer(accept, { type: 'NEXT_STAGE' })

    assert.equal(afterDecline.scam.lost, 0)
    // valueBeforeShock วัดหลังมิจฉาชีพเชิดเงินแต่ก่อนแรงกระแทกลง — ปฏิเสธแล้วต้องเท่าเดิมเป๊ะ
    // นี่คือหัวใจของอีเวนต์เสริม: ไม่รับข้อเสนอ = พอร์ตไม่ถูกแตะเลย
    assert.equal(afterDecline.valueBeforeShock, netWorth(base), 'ปฏิเสธแล้วพอร์ตต้องไม่ถูกแตะเลย')
    assert.ok(afterAccept.scam.lost > 0, 'รับข้อเสนอต้องเสียเงินจริง')
    assert.ok(netWorth(afterAccept) < netWorth(afterDecline), 'เหยื่อต้องจนกว่าคนที่ปฏิเสธ')
  })
})

describe('รายงานเกษียณ', () => {
  test('รายงานมีข้อมูลครบ 4 บท พร้อมบทที่ดีสุด/แย่สุด', () => {
    const { report } = playFullRun()
    assert.equal(report.chapters.length, 4)
    assert.ok(report.best && report.worst)
    assert.ok(report.benchmark > 0)
    assert.ok(report.band.label)
  })

  test('ทุกบทต้องอธิบายได้ว่า "เตรียมดีแค่ไหน" และ "ดวงเป็นยังไง" แยกกัน', () => {
    // นี่คือหัวใจของระบบแฟร์เนส — ผู้เล่นต้องเห็นว่าตัดสินใจถูกแต่จับสลากไม่ดีได้
    const { report } = playFullRun()
    for (const c of report.chapters) {
      assert.ok(c.prep.text, 'ขาดคำอธิบายคุณภาพการเตรียมพอร์ต')
      assert.ok(c.luck.text, 'ขาดคำอธิบายเรื่องดวง')
      assert.ok(c.percentile >= 0 && c.percentile <= 1)
    }
  })

  test('ทุ่มคริปโตทำให้เสียเงินเก็บทั้งชีวิตได้จริง แต่กระจายไม่มีทาง', () => {
    // อย่าเช็คด้วย "ล้มละลายอย่างน้อย 1 ครั้งใน N รอบ" — อัตราจริงราว 1% (เงินเดือนก้อนใหม่ช่วยสร้างตัวใหม่ได้)
    // เทสต์แบบนั้นจะแดงสุ่มๆ ตามดวง ต้องวัดที่ "ผลแย่สุดที่เป็นไปได้" ซึ่งเสถียรกว่ามาก
    const worstOf = (weights) => {
      let worst = Infinity
      for (let seed = 1; seed <= 40; seed++) {
        const { report } = playFullRun(weights, { seed })
        assert.ok(Number.isFinite(report.finalValue))
        worst = Math.min(worst, report.finalValue)
      }
      return worst
    }
    const contributed = BALANCE.chapters.reduce((s, c) => s + c.income, 0)
    assert.ok(worstOf({ crypto: 1 }) < contributed * 0.5, 'ทุ่มคริปโตต้องมีกรณีที่เสียเงินเก็บเกินครึ่งชีวิต')
    assert.ok(worstOf(BALANCED) > contributed, 'พอร์ตกระจายไม่ควรมีกรณีที่ขาดทุนจากเงินที่ใส่ไปเลย')

    for (let seed = 1; seed <= 40; seed++) {
      assert.equal(playFullRun(BALANCED, { seed }).report.isRuined, false, `seed ${seed}: พอร์ตกระจายล้มละลาย`)
    }
  })

  test('ไม่ลงทุนเลย (ถือเงินสดล้วน) แพ้เงินเฟ้อ — เงินไม่หายแต่มูลค่าหด', () => {
    const { report } = playFullRun({ cash: 1 })
    assert.ok(report.finalValue < report.contributed, 'ถือเงินสดล้วนต้องได้น้อยกว่าเงินที่ใส่ไปทั้งหมด')
    assert.ok(report.finalValue > 0)
  })
})

describe('ความคงทนของ state', () => {
  test('มูลค่าไม่มีวันเป็น NaN ไม่ว่าจะเล่นยังไง', () => {
    for (const weights of [BALANCED, { cash: 1 }, { crypto: 1 }, { bond: 0.5, cash: 0.5 }]) {
      for (const styleId of ['medium', 'longterm', 'trader', 'vi']) {
        for (const behavior of ['hold', 'cut', 'buy']) {
          const s = playFullRun(weights, { styleId, behavior, seed: 4242 })
          assert.ok(Number.isFinite(s.report.finalValue), `NaN: ${styleId}/${behavior}`)
          assert.ok(s.report.finalValue >= 0)
        }
      }
    }
  })

  test('action ที่ไม่ถูกจังหวะไม่ทำให้ state เพี้ยน', () => {
    const s = createInitialState(1)
    assert.equal(gameReducer(s, { type: 'NEXT_STAGE' }), s)
    assert.equal(gameReducer(s, { type: 'CONFIRM_ALLOCATION' }), s)
    assert.equal(gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' }), s)
    assert.equal(gameReducer(s, { type: 'ไม่รู้จัก' }), s)
  })

  test('จำนวนสเตจใน balance ตรงกับที่ state machine เดินจริง', () => {
    assert.equal(STAGES.length, BALANCE.stages.length)
    let s = createInitialState(1)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: BALANCED })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION' })
    let count = 1
    while (s.phase === 'stage' && s.chapterIndex === 0) {
      if (currentStage(s).key === 'behavior' && !s.behavior) {
        s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      }
      const before = s.stageIndex
      s = gameReducer(s, { type: 'NEXT_STAGE' })
      if (s.chapterIndex === 0 && s.phase === 'stage') {
        assert.equal(s.stageIndex, before + 1)
        count++
      }
    }
    assert.equal(count, STAGES.length)
    assert.ok(currentEvent(s) !== null)
  })
})
