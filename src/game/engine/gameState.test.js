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

const BALANCED = { bond: 1, fund: 1, stock: 1, crypto: 1 }

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
      s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: behavior, ...(behavior === 'buy' ? { toolId: 'fund' } : {}) })
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
      const primaryTags = s.history.map((h) => getEvent(h.eventId).primaryTag)
      assert.equal(new Set(primaryTags).size, 4, `seed ${seed}: เจอ tag ซ้ำ`)
    }
  })

  test('บทที่ 3 เป็นวิกฤตใหญ่สุดเสมอ (ดีไซน์ข้อ 3)', () => {
    for (const seed of [1, 7, 42, 100, 12345]) {
      const s = playFullRun(BALANCED, { seed })
      const crisisRanks = s.history.map((h) => getEvent(h.eventId).crisisRank)
      const maxRank = Math.max(...crisisRanks)
      assert.equal(crisisRanks[2], maxRank, `seed ${seed}: บท 3 ไม่ใช่วิกฤตใหญ่สุด`)
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
    const { report, incomeSchedule } = playFullRun(BALANCED, { seed: 8 })
    assert.equal(report.contributed, incomeSchedule.reduce((sum, amount) => sum + amount, 0))
    assert.ok(report.contributed >= 24000 && report.contributed <= 40000)
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
    assert.equal(s.cash, 10000)

    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { fund: 1 } })
    assert.equal(s.cash, 0)
    assert.ok(Math.abs(netWorth(s) - 10000) < 1e-9, 'เงินหายระหว่างจัดพอร์ต')
  })

  test('ถือเงินสดไว้บางส่วนได้ และมูลค่ารวมไม่เปลี่ยน', () => {
    let s = createInitialState(1)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { fund: 0.5, cash: 0.5 } })
    assert.ok(Math.abs(s.cash - 5000) < 1e-9)
    assert.ok(Math.abs(netWorth(s) - 10000) < 1e-9)
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
    assert.equal(atStage('trader', 'signal'), true, 'เทรดเดอร์ต้องปรับได้เมื่อเห็นสัญญาณ')
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
    return gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice, ...(choice === 'buy' ? { toolId: 'stock' } : {}) })
  }

  test('ตัดขาดทุน = ขาย 70% ของสินทรัพย์ที่เสียหายไปตราสารหนี้ โดยไม่ขายทั้งพอร์ต', () => {
    const before = {
      ...createInitialState(7),
      phase: 'stage',
      styleId: 'medium',
      stageIndex: BALANCE.stages.findIndex((stage) => stage.key === 'behavior'),
      positions: { fund: 400, stock: 600 },
      cash: 0,
      valueBeforeShock: 1200,
      shock: { impacts: [
        { toolId: 'fund', before: 400, after: 400, change: 0 },
        { toolId: 'stock', before: 800, after: 600, change: -200 },
      ] },
      chapterAbility: { abilityId: 'medium', triggered: false, bonus: 0, cost: 0, recoveryBonus: 0, growthBonus: 0, adjustmentCount: 0, promptChoices: {} },
    }
    const s = gameReducer(before, { type: 'CHOOSE_BEHAVIOR', choice: 'cut' })
    assert.equal(s.positions.fund, 400)
    assert.ok(Math.abs(s.positions.stock - 180) < 1e-9)
    assert.ok(Math.abs(s.positions.bond - 420) < 1e-9)
    assert.equal(s.immuneToAftershock, false)
    assert.equal(s.reboundOwed, 0)
  })

  test('ซื้อเพิ่ม = เทเงินสดลงสินทรัพย์ที่เลือกจนหมดและบันทึก breakdown', () => {
    const buy = toBehavior('buy')
    assert.equal(buy.cash, 0)
    assert.equal(buy.behaviorEffect.toolId, 'stock')
    assert.equal(buy.behaviorEffect.cashInvested, 3000)
    assert.equal(buy.positions.stock - buy.behaviorEffect.cashInvested, buy.shock.impacts.find((impact) => impact.toolId === 'stock').after)
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

  test('ทุกบทต้องอธิบายได้ว่าพอร์ตแพ้หรือชนะ Matrix อย่างไร', () => {
    const { report } = playFullRun()
    for (const c of report.chapters) {
      assert.ok(c.prep.text, 'ขาดคำอธิบายผลของ Matrix')
      assert.ok(c.prep.score >= 0 && c.prep.score <= 1)
      assert.equal(c.luck, undefined)
    }
  })

  test('ตารางเงินรายบทสุ่มจากตัวเลือกที่อนุมัติและ seed เดิมได้ค่าเดิม', () => {
    const start = (seed) => {
      let s = gameReducer(createInitialState(seed), { type: 'START' })
      return gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    }
    const a = start(456)
    const b = start(456)
    assert.deepEqual(a.incomeSchedule, b.incomeSchedule)
    assert.equal(a.incomeSchedule[0], 10000)
    a.incomeSchedule.forEach((amount, index) => assert.ok(BALANCE.chapters[index].incomeOptions.includes(amount)))
  })

  test('รายงานทุกกลยุทธ์ใช้ทุนจริงของรอบนั้นเป็นฐาน', () => {
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
    assert.ok(Number.isFinite(worstOf({ crypto: 1 })))
    assert.ok(Number.isFinite(worstOf(BALANCED)))

    for (let seed = 1; seed <= 40; seed++) {
      const { report, incomeSchedule } = playFullRun(BALANCED, { seed })
      assert.equal(report.contributed, incomeSchedule.reduce((sum, amount) => sum + amount, 0))
      assert.ok(Math.abs(report.multiple - report.finalValue / report.contributed) < 1e-12)
    }
  })

  test('ไม่ลงทุนเลย (ถือเงินสดล้วน) แพ้เงินเฟ้อ — เงินไม่หายแต่มูลค่าหด', () => {
    const { report } = playFullRun({ cash: 1 })
    assert.ok(report.finalValue < report.contributed, 'ถือเงินสดล้วนต้องได้น้อยกว่าเงินที่ใส่ไปทั้งหมด')
    assert.ok(report.finalValue > 0)
    assert.equal(report.cashOnlyChapters, 4)
    assert.ok(report.chapters.every((chapter) => chapter.cashOnly))
    assert.ok(report.chapters.every((chapter) => chapter.prep.score === null))
    assert.ok(report.chapters.every((chapter) => chapter.prep.text.includes('ยังไม่มีการกระจายการลงทุน')))
  })
})

describe('ความคงทนของ state', () => {
  test('ปฏิเสธ allocation ที่ไม่ปลอดภัยและไม่หักเงินหรือเปลี่ยน phase', () => {
    let s = createInitialState(11)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    const before = netWorth(s)

    for (const weights of [
      null,
      { stock: -1 },
      { stock: Number.NaN },
      { stock: Infinity },
      { stock: Number.MAX_VALUE, bond: Number.MAX_VALUE },
      { unknown: 1 },
      {},
    ]) {
      const rejected = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights })
      assert.equal(rejected.phase, 'allocation')
      assert.equal(netWorth(rejected), before)
      assert.match(rejected.validationError, /กรุณา|ไม่สำเร็จ/)
    }
  })

  test('ยืนยัน allocation แบบ atomic แล้วเงินรวมไม่เพิ่มและไม่ถูกหักซ้ำ', () => {
    let s = createInitialState(12)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    const before = netWorth(s)
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    assert.equal(s.phase, 'stage')
    assert.ok(Math.abs(netWorth(s) - before) < 1e-9)
    assert.equal(s.validationError, null)

    const duplicate = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: { crypto: 1 } })
    assert.equal(duplicate, s)
  })

  test('expectedStageIndex ป้องกันปุ่มซ้ำไม่ให้ข้ามสเตจ', () => {
    let s = createInitialState(13)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })

    const first = gameReducer(s, { type: 'NEXT_STAGE', expectedStageIndex: 0 })
    const duplicate = gameReducer(first, { type: 'NEXT_STAGE', expectedStageIndex: 0 })
    assert.equal(first.stageIndex, 1)
    assert.equal(duplicate, first)
  })

  test('ข้ามคำตอบ scam หรือ behavior ไม่ได้ และไม่รับค่าที่อยู่นอก contract', () => {
    let s = createInitialState(14)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })

    while (s.chapterIndex !== s.scamChapter) {
      if (s.phase === 'allocation') s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
      if (currentStage(s)?.key === 'behavior' && !s.behavior) s = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
      s = gameReducer(s, { type: 'NEXT_STAGE' })
    }
    if (s.phase === 'allocation') s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    if (currentStage(s).key === 'signal') s = gameReducer(s, { type: 'NEXT_STAGE' })
    assert.equal(currentStage(s).key, 'reveal')
    assert.equal(s.scam.accepted, null)

    const skippedScam = gameReducer(s, { type: 'NEXT_STAGE' })
    assert.equal(skippedScam.stageIndex, s.stageIndex)
    assert.match(skippedScam.validationError, /ข้อเสนอ/)
    const invalidAnswer = gameReducer(s, { type: 'ANSWER_SCAM', accept: 'yes' })
    assert.equal(invalidAnswer.scam.accepted, null)

    s = gameReducer(s, { type: 'ANSWER_SCAM', accept: false })
    while (currentStage(s).key !== 'behavior') s = gameReducer(s, { type: 'NEXT_STAGE' })
    const invalidBehavior = gameReducer(s, { type: 'CHOOSE_BEHAVIOR', choice: 'panic' })
    assert.equal(invalidBehavior.behavior, null)
    const skippedBehavior = gameReducer(invalidBehavior, { type: 'NEXT_STAGE' })
    assert.equal(skippedBehavior.stageIndex, invalidBehavior.stageIndex)
  })

  test('มูลค่าไม่มีวันเป็น NaN ไม่ว่าจะเล่นยังไง', () => {
    for (const weights of [BALANCED, { cash: 1 }, { crypto: 1 }, { bond: 0.5, cash: 0.5 }]) {
      for (const styleId of ['medium', 'longterm', 'trader', 'vi']) {
        for (const behavior of ['hold', 'cut']) {
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

describe('ความสามารถตัวละคร', () => {
  const behaviorState = (styleId) => ({
    ...createInitialState(91),
    phase: 'stage',
    styleId,
    stageIndex: BALANCE.stages.findIndex((stage) => stage.key === 'behavior'),
    positions: { stock: 600 },
    cash: 200,
    valueBeforeShock: 1000,
    chapterAbility: {
      abilityId: styleId,
      triggered: false,
      bonus: 0,
      cost: 0,
      recoveryBonus: 0,
      growthBonus: 0,
      adjustmentCount: 0,
      promptChoices: {},
    },
  })

  test('นักลงทุนระยะยาวใช้การฟื้น 20% เท่ากันและเก็บโบนัสไว้ที่การทบต้น', () => {
    const medium = gameReducer(behaviorState('medium'), { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
    const longterm = gameReducer(behaviorState('longterm'), { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
    assert.equal(longterm.reboundOwed, medium.reboundOwed)
    assert.equal(longterm.chapterAbility.recoveryBonus, 0)
  })

  test('สูตรฟื้นตัวใหม่: ถือ 20% · ซื้อ 50% · VI ซื้อ 100% ของที่เสีย', () => {
    const hold = gameReducer(behaviorState('medium'), { type: 'CHOOSE_BEHAVIOR', choice: 'hold' })
    const buy = gameReducer(behaviorState('medium'), { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    const viBuy = gameReducer(behaviorState('vi'), { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    assert.equal(hold.reboundOwed, 40)
    assert.equal(buy.reboundOwed, 100)
    assert.equal(viBuy.reboundOwed, 200)
  })

  test('VI ได้โบนัสฟื้นตัวจากการซื้อช่วงราคาลดลงเพิ่ม 50% และต้องมีเงินสด', () => {
    const medium = gameReducer(behaviorState('medium'), { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    const vi = gameReducer(behaviorState('vi'), { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    assert.ok(Math.abs(vi.reboundOwed - medium.reboundOwed * 2) < 1e-9)
    assert.ok(vi.chapterAbility.recoveryBonus > 0)

    const noCash = { ...behaviorState('vi'), cash: 0, positions: { stock: 800 } }
    const rejected = gameReducer(noCash, { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    assert.equal(rejected.behavior, null)
    assert.match(rejected.validationError, /เงินสด/)

    const lowCash = { ...behaviorState('vi'), cash: 80, positions: { stock: 720 } }
    const withoutBonus = gameReducer(lowCash, { type: 'CHOOSE_BEHAVIOR', choice: 'buy', toolId: 'stock' })
    assert.equal(withoutBonus.reboundOwed, 100)
    assert.equal(withoutBonus.behaviorEffect.qualifiesForStyleBonus, false)
  })

  test('นักลงทุนระยะกลางปรับหลังรู้เหตุการณ์ได้ฟรีเพียงหนึ่งครั้งต่อบท', () => {
    let s = createInitialState(92)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'medium' })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    s = gameReducer(s, { type: 'NEXT_STAGE' })
    assert.equal(currentStage(s).key, 'reveal')
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { bond: 1 } })
    assert.equal(s.chapterAbility.adjustmentCount, 1)
    assert.equal(s.chapterAbility.cost, 0)
    assert.equal(canAdjustNow(s), false)
    assert.equal(gameReducer(s, { type: 'SET_ALLOCATION', weights: { stock: 1 } }), s)
  })

  test('Trader ไม่มีโทษผลตอบแทนซ่อนอยู่และบันทึกค่าธรรมเนียมจากเงินที่ย้าย', () => {
    let s = createInitialState(93)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'trader' })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: { fund: 1 } })
    const initialCost = s.chapterAbility.cost
    assert.ok(initialCost > 0)
    assert.equal(s.chapterAbility.triggered, true)
    s = gameReducer(s, { type: 'SET_ALLOCATION', weights: { stock: 1 } })
    assert.ok(s.chapterAbility.cost > initialCost)
    assert.equal(s.chapterAbility.adjustmentCount, 1)
  })

  test('popup บันทึกคำตอบครั้งเดียวต่อสเตจและประวัติเก็บโบนัสทบต้น', () => {
    let s = createInitialState(94)
    s = gameReducer(s, { type: 'START' })
    s = gameReducer(s, { type: 'SELECT_STYLE', styleId: 'trader' })
    s = gameReducer(s, { type: 'CONFIRM_ALLOCATION', weights: BALANCED })
    s = gameReducer(s, { type: 'RECORD_ADJUSTMENT_PROMPT', choice: 'skip' })
    assert.equal(s.chapterAbility.promptChoices.signal, 'skip')
    assert.equal(gameReducer(s, { type: 'RECORD_ADJUSTMENT_PROMPT', choice: 'adjust' }), s)

    const completed = playFullRun(BALANCED, { styleId: 'longterm', seed: 95, behavior: 'hold' })
    assert.ok(completed.history.every((chapter) => chapter.abilityGrowthBonus > 0))
    assert.ok(completed.history.every((chapter) => chapter.abilityNetEffect > 0))
  })
})
