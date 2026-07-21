// State machine ของเกม "เส้นทางชีวิตนักลงทุน" — แทน reducer.js เดิมทั้งหมด
//
// โครง: 4 บท × (จัดพอร์ต → 5 สเตจ) → รายงานเกษียณ
// คำกริยาหลักเปลี่ยนจาก "โจมตี" เป็น "จัดสรร" — ไม่มี HP ไม่มีเทิร์น ไม่มีการ์ดใช้แล้วทิ้ง
//
// state ทั้งก้อนเป็น JSON ล้วน + seed ของตัวสุ่ม → reducer เป็น pure function จริง replay ได้

import { BALANCE } from './balance.js'
import { getStyle } from './data/styles.js'
import { getEvent, getEventsByPrimaryTag } from './data/events.js'
import { TAGS } from './data/tools.js'
import { rngFrom, shuffle } from './rng.js'
import { totalValue, rebalance, applyGrowth } from './portfolio.js'
import { outcomeBand, rollShock, applyShock, isBlackSwan } from './encounter.js'
import { makeScamOffer, applyScamLoss } from './scam.js'
import { buildReport } from './report.js'

export const STAGES = BALANCE.stages
const LAST_CHAPTER = BALANCE.chapters.length - 1

export function createInitialState(seed = Date.now()) {
  return {
    phase: 'cover', // cover → style → allocation → stage → report
    seed: seed >>> 0,
    styleId: null,
    chapterIndex: 0,
    stageIndex: 0,
    positions: {}, // { [toolId]: มูลค่า }
    positionsBeforeShock: {}, // สำเนา positions ก่อนแรงกระแทกลง — สเตจ 5 ใช้บอกผลกระทบรายตัว
    cash: 0,
    eventOrder: [], // เหตุการณ์ของทั้ง 4 บท เลือกตอนเริ่มรอบ
    isBlackSwan: false,
    band: null,
    shock: null, // { shockPct, percentile }
    valueBeforeShock: 0,
    scam: null, // { offerAmount, accepted }
    behavior: null, // 'hold' | 'cut' | 'buy'
    reboundOwed: 0,
    immuneToAftershock: false,
    lastAftershock: null,
    lastFee: 0,
    history: [],
    report: null,
  }
}

// ---------- ตัวช่วยอ่าน state (ใช้ทั้งใน UI และในเอนจิน) ----------
export const currentChapter = (s) => BALANCE.chapters[s.chapterIndex]
export const currentStage = (s) => STAGES[s.stageIndex]
export const currentEvent = (s) => (s.eventOrder.length ? getEvent(s.eventOrder[s.chapterIndex]) : null)
export const currentStyle = (s) => (s.styleId ? getStyle(s.styleId) : null)
export const netWorth = (s) => totalValue(s.positions) + s.cash

// ปรับพอร์ตได้ตรงจุดนี้ไหม — 'allocation' หรือเลขสเตจ
export function canAdjustNow(s) {
  const style = currentStyle(s)
  if (!style) return false
  if (s.phase === 'allocation') return true
  if (s.phase !== 'stage') return false
  return style.canAdjustAt.includes(currentStage(s).n)
}

// ---------- เริ่มรอบ ----------
// เลือกเหตุการณ์ 4 ตัวจาก 4 tag ต่างกัน → ผู้เล่นเจอครบทุกประเภทความเสี่ยงเสมอ
// ไม่ว่าจะสุ่มยังไง (ถ้าปล่อยสุ่มอิสระ อาจเจอ tag เดิม 4 รอบแล้วบทเรียนหาย)
function pickEvents(rng) {
  const chosen = shuffle(TAGS, rng).map((tag) => {
    const pool = getEventsByPrimaryTag(tag)
    return pool[Math.floor(rng() * pool.length)]
  })
  // บท 3 ต้องเป็นวิกฤตใหญ่สุด (ดีไซน์ข้อ 3) → สลับตัวที่รุนแรงสุดมาไว้ตรงนั้น
  const crisisIndex = BALANCE.chapters.findIndex((c) => c.bigCrisis)
  let worst = 0
  for (let i = 1; i < chosen.length; i++) {
    if (chosen[i].severity > chosen[worst].severity) worst = i
  }
  ;[chosen[crisisIndex], chosen[worst]] = [chosen[worst], chosen[crisisIndex]]
  return chosen.map((e) => e.id)
}

function startRun(state, styleId) {
  const style = getStyle(styleId)
  if (!style) return state
  const rng = rngFrom(state.seed)
  const eventOrder = pickEvents(rng)

  return {
    ...createInitialState(rng.getSeed()),
    phase: 'allocation',
    styleId,
    eventOrder,
    cash: BALANCE.chapters[0].income, // ทุนตั้งต้นของบท 1
  }
}

// ---------- จัดพอร์ต ----------
// weights = { [toolId]: 0..1, cash: 0..1 } — สัดส่วนเป้าหมายของ "ทรัพย์สินทั้งหมด" (พอร์ต + เงินสด)
// เอนจินจัดการย้ายเงินให้ตรงเป้าเอง ผู้เล่นแค่บอกว่าอยากได้สัดส่วนไหน
const CASH_BUCKET = '__cash' // ถังเงินสดปลอม ใช้เฉพาะตอนคำนวณ ไม่ใช่เครื่องมือ จึงไม่มี exposure

export function applyAllocation(state, weights) {
  const total = netWorth(state)
  if (total <= 0) return state
  if (Object.values(weights).reduce((a, b) => a + b, 0) <= 0) return state

  // ยัดเงินสดเข้าไปใน rebalance ด้วย เพื่อให้การย้ายเงินสด↔เครื่องมือถูกคิดค่าธรรมเนียมเหมือนการซื้อขายจริง
  const current = { ...state.positions, [CASH_BUCKET]: state.cash }
  const target = {}
  for (const [id, w] of Object.entries(weights)) {
    if (w > 0) target[id === 'cash' ? CASH_BUCKET : id] = w
  }

  const { positions, fee } = rebalance(current, target, currentStyle(state)?.tradeFeePct ?? 0)
  const cash = positions[CASH_BUCKET] ?? 0
  delete positions[CASH_BUCKET]
  return { ...state, positions, cash, lastFee: fee }
}

function confirmAllocation(state) {
  return { ...state, phase: 'stage', stageIndex: 0 }
}

// ---------- สเตจ ----------
function enterStage(state, index) {
  const stage = STAGES[index]
  let next = { ...state, stageIndex: index }

  if (stage.key === 'reveal') {
    const event = currentEvent(next)
    if (event?.special === 'scam_offer' && !next.scam) {
      next.scam = makeScamOffer(next.positions, next.cash)
    }
  }

  if (stage.key === 'shock') next = resolveShock(next)
  return next
}

// สเตจ 3 — แรงกระแทกจริงลงพอร์ต
function resolveShock(state) {
  const rng = rngFrom(state.seed)
  const event = currentEvent(state)
  const style = currentStyle(state)

  let positions = state.positions
  let cash = state.cash
  let scam = state.scam

  // มิจฉาชีพเชิดเงินไปก่อนเป็นอันดับแรก — ไม่เกี่ยวกับ tag ของเหตุการณ์เลย
  if (scam?.accepted) {
    const result = applyScamLoss(positions, cash, scam)
    positions = result.positions
    cash = result.cash
    scam = { ...scam, lost: result.lost }
  }

  const valueBeforeShock = totalValue(positions) + cash
  const bs = isBlackSwan(rng)
  const band = outcomeBand(positions, event, { styleShockMult: style.shockMult, isBlackSwan: bs })
  const shock = rollShock(band, rng)

  // เก็บสำเนาไว้ก่อน applyShock เขียนทับ — สเตจ 5 ต้องเทียบก่อน/หลังรายสินทรัพย์
  // ย้อนคำนวณเอาทีหลังไม่ได้ทุกเคส: ตัวที่โดน margin call เหลือ 0 (หารกลับไม่ได้)
  // และตัวที่ชนพื้น 10% ก็ไม่ได้สะท้อน shock จริงที่โดน
  //
  // จุดนี้คือ "หลังมิจฉาชีพเชิดเงินแล้ว" โดยตั้งใจ — ตารางสเตจ 5 รายงานผลของเหตุการณ์อย่างเดียว
  // ส่วนเงินที่โดนโกงมีบรรทัดของตัวเองอยู่แล้วในสเตจ 3
  const positionsBeforeShock = { ...positions }
  positions = applyShock(positions, event, shock.shockPct, { isBlackSwan: bs })

  return {
    ...state,
    seed: rng.getSeed(),
    positions,
    positionsBeforeShock,
    cash,
    scam,
    isBlackSwan: bs,
    band,
    shock,
    valueBeforeShock,
    behavior: null,
  }
}

// สเตจ 4 — จุดตัดสินใจพฤติกรรม (ถือต่อ / ตัดขาดทุน / ซื้อเพิ่ม)
function chooseBehavior(state, choice) {
  const style = currentStyle(state)
  const lost = Math.max(0, state.valueBeforeShock - netWorth(state))
  let next = { ...state, behavior: choice }

  if (choice === 'hold') {
    next.reboundOwed = lost * BALANCE.reboundPct
    next.immuneToAftershock = false
  }

  if (choice === 'cut') {
    // ล็อกขาดทุน: ย้ายทุกอย่างไปตราสารหนี้ที่มูลค่าปัจจุบัน — ไม่ฟื้น แต่กันคลื่นตามได้
    const { positions, fee } = rebalance(state.positions, { bond: 1 }, style.tradeFeePct ?? 0)
    next.positions = positions
    next.lastFee = fee
    next.reboundOwed = 0
    next.immuneToAftershock = true
  }

  if (choice === 'buy') {
    // ซื้อเพิ่มตอนราคาถูก: เทเงินสดที่เหลือลงพอร์ตตามสัดส่วนเดิม
    const invested = state.cash
    const total = totalValue(state.positions)
    const positions = { ...state.positions }
    if (total > 0) {
      for (const id of Object.keys(positions)) {
        positions[id] += invested * (positions[id] / total)
      }
    } else {
      positions[BALANCE.benchmarkToolId] = invested
    }
    next.positions = positions
    next.cash = 0
    next.reboundOwed = lost * BALANCE.reboundPct * BALANCE.buyDipReboundMult * (style.buyDipMult ?? 1)
    next.immuneToAftershock = false
    next.investedOnDip = invested
  }
  return next
}

// ---------- ปิดบท → บทถัดไป ----------
// ปิดบท = ปล่อยให้ทศวรรษนั้นเดินจนจบ: ฟื้นตัว → คลื่นตาม → ทบต้น
// ทำเหมือนกันทุกบทรวมถึงบทสุดท้าย (บทที่ 4 ก็คืออายุ 50-59 ซึ่งเป็นทศวรรษเต็มๆ เหมือนบทอื่น)
// มีแค่ "รายได้ก้อนใหม่" เท่านั้นที่ไม่เข้าหลังบทสุดท้าย เพราะเกษียณแล้วไม่มีเงินเดือน
function finishChapter(state) {
  const rng = rngFrom(state.seed)
  const style = currentStyle(state)
  const chapter = currentChapter(state)
  const event = currentEvent(state)
  const isLast = state.chapterIndex === LAST_CHAPTER

  const valueAfterShock = netWorth(state)
  let positions = { ...state.positions }
  let cash = state.cash
  let lastAftershock = null

  // 1) ฟื้นตัวจากการตัดสินใจที่สเตจ 4
  // ฟื้นได้เฉพาะสินทรัพย์ที่ยังถืออยู่ — ถ้าโดน margin call จนพอร์ตเป็นศูนย์ ก็ไม่มีอะไรให้ "ถือต่อ"
  // (เคยเขียนให้คืนเป็นเงินสดตอนพอร์ตว่าง ผลคือคนที่หมดตัวจากเลเวอเรจฟื้นคืนชีพได้ ความเสี่ยงเลยไม่จริง)
  const survivingValue = totalValue(positions)
  if (state.reboundOwed > 0 && survivingValue > 0) {
    for (const id of Object.keys(positions)) {
      positions[id] += state.reboundOwed * (positions[id] / survivingValue)
    }
  }

  // 2) คลื่นตาม — ทำให้ "ตัดขาดทุน" ไม่ใช่ตัวเลือกผิดเสมอ (ไม่มีเฉลยตายตัว)
  if (rng() < BALANCE.aftershockChance) {
    if (state.immuneToAftershock) {
      lastAftershock = { hit: false, avoided: true }
    } else {
      const aftershockPct = (state.shock?.shockPct ?? 0) * BALANCE.aftershockSeverityMult
      positions = applyShock(positions, event, aftershockPct, { isBlackSwan: false })
      lastAftershock = { hit: true, avoided: false, pct: aftershockPct }
    }
  }

  // 3) ทบต้นเงียบๆ ตลอดทศวรรษ — รางวัลของการถือ (ดีไซน์ข้อ 3)
  positions = applyGrowth(positions, style.returnMult, rng)

  const entry = {
    chapter: chapter.n,
    ageFrom: chapter.ageFrom,
    ageTo: chapter.ageTo,
    eventId: event.id,
    eventName: event.name,
    isBlackSwan: state.isBlackSwan,
    shockPct: state.shock?.shockPct ?? 0,
    percentile: state.shock?.percentile ?? 0,
    exposure: state.band?.exposure ?? 0,
    concentration: state.band?.concentration ?? 0,
    behavior: state.behavior,
    scamAccepted: state.scam?.accepted ?? false,
    scamLost: state.scam?.lost ?? 0,
    valueBefore: state.valueBeforeShock,
    valueAfter: valueAfterShock, // ทันทีหลังแรงกระแทก — ใช้วัดว่าเหตุการณ์ทำอะไรกับพอร์ต
    valueEnd: totalValue(positions) + cash, // ปลายทศวรรษ หลังฟื้นตัวและทบต้นแล้ว
  }
  const history = [...state.history, entry]

  if (isLast) {
    const finished = { ...state, seed: rng.getSeed(), positions, cash, history, phase: 'report' }
    return { ...finished, report: buildReport(finished) }
  }

  // 4) เงินสดถูกเงินเฟ้อกิน แล้วรายได้ก้อนใหม่เข้ามา
  cash = cash * BALANCE.cashDecayPerChapter + BALANCE.chapters[state.chapterIndex + 1].income

  return {
    ...state,
    seed: rng.getSeed(),
    history,
    positions,
    cash,
    chapterIndex: state.chapterIndex + 1,
    stageIndex: 0,
    phase: 'allocation',
    isBlackSwan: false,
    band: null,
    shock: null,
    positionsBeforeShock: {}, // ล้างพร้อม band/shock — ข้อมูลของบทที่จบไปแล้วต้องไม่ค้างมาบทใหม่
    scam: null,
    behavior: null,
    reboundOwed: 0,
    immuneToAftershock: false,
    lastAftershock,
    investedOnDip: 0,
  }
}

function nextStage(state) {
  if (state.stageIndex >= STAGES.length - 1) return finishChapter(state)
  return enterStage(state, state.stageIndex + 1)
}

// ---------- reducer ----------
export function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      return state.phase === 'cover' ? { ...state, phase: 'style' } : state

    case 'SELECT_STYLE':
      return state.phase === 'style' ? startRun(state, action.styleId) : state

    case 'SET_ALLOCATION':
      if (!canAdjustNow(state)) return state
      return applyAllocation(state, action.weights)

    case 'CONFIRM_ALLOCATION':
      return state.phase === 'allocation' ? confirmAllocation(state) : state

    case 'ANSWER_SCAM':
      if (!state.scam || state.scam.accepted !== null) return state
      return { ...state, scam: { ...state.scam, accepted: action.accept } }

    case 'CHOOSE_BEHAVIOR':
      if (state.phase !== 'stage' || currentStage(state).key !== 'behavior') return state
      if (state.behavior) return state
      return chooseBehavior(state, action.choice)

    case 'NEXT_STAGE':
      return state.phase === 'stage' ? nextStage(state) : state

    case 'RESTART':
      return createInitialState(state.seed)

    default:
      return state
  }
}
