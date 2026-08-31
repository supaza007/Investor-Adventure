// State machine ของเกม "เส้นทางชีวิตนักลงทุน" — แทน reducer.js เดิมทั้งหมด
//
// โครง: 4 บท × (จัดพอร์ต → 5 สเตจ) → รายงานเกษียณ
// คำกริยาหลักเปลี่ยนจาก "โจมตี" เป็น "จัดสรร" — ไม่มี HP ไม่มีเทิร์น ไม่มีการ์ดใช้แล้วทิ้ง
//
// state ทั้งก้อนเป็น JSON ล้วน + seed ของตัวสุ่ม → reducer เป็น pure function จริง replay ได้

import { BALANCE } from './balance.js'
import { getStyle } from './data/styles.js'
import { getEvent, getEventsByPrimaryTag } from './data/events.js'
import { TAGS, getTool } from './data/tools.js'
import { rngFrom, shuffle } from './rng.js'
import { totalValue, rebalance, applyGrowthWithDetails, concentration } from './portfolio.js'
import { applyEventReturns } from './encounter.js'
import { makeScamOffer, applyScamLoss } from './scam.js'
import { buildReport } from './report.js'

export const STAGES = BALANCE.stages
const LAST_CHAPTER = BALANCE.chapters.length - 1
export const RULES_VERSION = '2026-09-risk-balance-v5'
export const RNG_VERSION = 'mulberry32-v1'

function createChapterAbility(styleId = null) {
  const style = styleId ? getStyle(styleId) : null
  return {
    abilityId: style?.abilityId ?? null,
    triggered: false,
    bonus: 0,
    cost: 0,
    recoveryBonus: 0,
    growthBonus: 0,
    adjustmentCount: 0,
    promptChoices: {},
  }
}

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
    incomeSchedule: [], // เงินที่ได้รับจริงในแต่ละบท สุ่มครั้งเดียวจาก seed แล้ว replay ได้
    scamChapter: null, // บทที่มิจฉาชีพจะทัก — อีเวนต์เสริม สุ่มบทเดียวต่อรอบ
    shock: null, // { portfolioReturn, shockPct, assetReturns, impacts }
    valueBeforeShock: 0,
    scam: null, // { offerAmount, accepted }
    behavior: null, // 'hold' | 'cut' | 'buy'
    behaviorEffect: null, // breakdown ที่ UI ใช้อธิบายผล โดยไม่คำนวณย้อนจากพอร์ตปัจจุบัน
    reboundOwed: 0,
    immuneToAftershock: false,
    lastAftershock: null,
    lastFee: 0,
    chapterAbility: createChapterAbility(),
    history: [],
    report: null,
    validationError: null,
    versions: { rulesVersion: RULES_VERSION, rngVersion: RNG_VERSION, contentVersion: 'content-v2-event-explanations' },
    timing: { runStartedAt: null, runEndedAt: null, runDurationSeconds: null, chapters: {}, stages: {} },
    research: { consent: null, consentVersion: 'research-consent-v1', anonymousPlayerId: null, runId: null },
    assessment: { pre: null, post: null, knowledgeGain: null },
  }
}

function withTiming(state, action) {
  if (!action?.at) return state
  const timing = { ...state.timing }
  if (action.scope === 'run' && action.phase === 'start') timing.runStartedAt = action.at
  if (action.scope === 'run' && action.phase === 'end') {
    timing.runEndedAt = action.at
    if (timing.runStartedAt) timing.runDurationSeconds = Math.max(0, (Date.parse(action.at) - Date.parse(timing.runStartedAt)) / 1000)
  }
  if (action.scope === 'chapter' && Number.isInteger(action.chapter)) {
    timing.chapters = { ...timing.chapters, [action.chapter]: { ...(timing.chapters[action.chapter] ?? {}), [`${action.phase}At`]: action.at } }
  }
  if (action.scope === 'stage' && Number.isInteger(action.chapter) && Number.isInteger(action.stage)) {
    const key = `${action.chapter}:${action.stage}`
    timing.stages = { ...timing.stages, [key]: { ...(timing.stages[key] ?? {}), [`${action.phase}At`]: action.at } }
  }
  return { ...state, timing }
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
  if (!style.canAdjustAt.includes(currentStage(s).n)) return false
  if (Number.isFinite(style.maxMidStageAdjustmentsPerChapter)
      && s.chapterAbility.adjustmentCount >= style.maxMidStageAdjustmentsPerChapter) return false
  return true
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
    if (chosen[i].crisisRank > chosen[worst].crisisRank) worst = i
  }
  ;[chosen[crisisIndex], chosen[worst]] = [chosen[worst], chosen[crisisIndex]]
  return chosen.map((e) => e.id)
}

function startRun(state, styleId, startedAt = null) {
  const style = getStyle(styleId)
  if (!style) return state
  const rng = rngFrom(state.seed)
  const eventOrder = pickEvents(rng)
  // มิจฉาชีพทักครั้งเดียวต่อรอบ สุ่มว่าบทไหน — ผู้เล่นได้เจอบทเรียนนี้เสมอ แต่เดาล่วงหน้าไม่ได้
  const scamChapter = Math.floor(rng() * BALANCE.chapters.length)
  const incomeSchedule = BALANCE.chapters.map(({ incomeOptions }) => incomeOptions[Math.floor(rng() * incomeOptions.length)])
  const next = createInitialState(rng.getSeed())

  return {
    ...next,
    phase: 'allocation',
    styleId,
    eventOrder,
    incomeSchedule,
    scamChapter,
    chapterAbility: createChapterAbility(styleId),
    cash: incomeSchedule[0], // ทุนตั้งต้นของบท 1
    timing: startedAt ? { ...next.timing, runStartedAt: startedAt } : next.timing,
  }
}

// ---------- จัดพอร์ต ----------
// weights = { [toolId]: 0..1, cash: 0..1 } — สัดส่วนเป้าหมายของ "ทรัพย์สินทั้งหมด" (พอร์ต + เงินสด)
// เอนจินจัดการย้ายเงินให้ตรงเป้าเอง ผู้เล่นแค่บอกว่าอยากได้สัดส่วนไหน
const CASH_BUCKET = '__cash' // ถังเงินสดปลอม ใช้เฉพาะตอนคำนวณ ไม่ใช่เครื่องมือ จึงไม่มี exposure

function effectiveTradeFeePct(state) {
  const style = currentStyle(state)
  const base = style?.tradeFeePct ?? 0
  const isFirstChapterTrade = state.phase === 'stage' && state.chapterAbility.adjustmentCount === 0
  return isFirstChapterTrade ? base * (style?.firstTradeFeeMult ?? 1) : base
}

export function applyAllocation(state, weights) {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
    return { ...state, validationError: 'จัดพอร์ตไม่สำเร็จ: กรุณาเลือกสัดส่วนสินทรัพย์ใหม่อีกครั้ง' }
  }

  const entries = Object.entries(weights)
  const hasInvalidValue = entries.some(([, value]) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)
  const hasUnknownAsset = entries.some(([id]) => id !== 'cash' && !getTool(id))
  if (hasInvalidValue || hasUnknownAsset) {
    return { ...state, validationError: 'จัดพอร์ตไม่สำเร็จ: สัดส่วนสินทรัพย์ไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่' }
  }

  const total = netWorth(state)
  if (!Number.isFinite(total) || total <= 0) {
    return { ...state, validationError: 'จัดพอร์ตไม่ได้ เพราะไม่มีเงินทุนที่ใช้งานได้' }
  }
  const weightSum = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!Number.isFinite(weightSum) || weightSum <= 0) {
    return { ...state, validationError: 'กรุณาจัดสรรเงินอย่างน้อยหนึ่งรายการก่อนยืนยัน' }
  }

  // ยัดเงินสดเข้าไปใน rebalance ด้วย เพื่อให้การย้ายเงินสด↔เครื่องมือถูกคิดค่าธรรมเนียมเหมือนการซื้อขายจริง
  const current = { ...state.positions, [CASH_BUCKET]: state.cash }
  const target = {}
  for (const [id, w] of Object.entries(weights)) {
    if (w > 0) target[id === 'cash' ? CASH_BUCKET : id] = w
  }

  const { positions, fee } = rebalance(current, target, effectiveTradeFeePct(state))
  const cash = positions[CASH_BUCKET] ?? 0
  delete positions[CASH_BUCKET]
  return { ...state, positions, cash, lastFee: fee, validationError: null }
}

function recordAllocationEffect(state, allocated, { countAdjustment = false } = {}) {
  const style = currentStyle(state)
  const fee = allocated.lastFee ?? 0
  const chapterAbility = {
    ...state.chapterAbility,
    triggered: state.chapterAbility.triggered || countAdjustment || (style?.id === 'trader' && fee > 0),
    cost: state.chapterAbility.cost + (style?.id === 'trader' ? fee : 0),
    adjustmentCount: state.chapterAbility.adjustmentCount + (countAdjustment ? 1 : 0),
  }
  return { ...allocated, chapterAbility }
}

function confirmAllocation(state) {
  return { ...state, phase: 'stage', stageIndex: 0 }
}

// ---------- สเตจ ----------
function enterStage(state, index) {
  const stage = STAGES[index]
  let next = { ...state, stageIndex: index }

  // อีเวนต์เสริม: มิจฉาชีพทักซ้อนมาบนเหตุการณ์ประจำบท ไม่แทนที่มัน
  if (stage.key === 'reveal' && next.chapterIndex === next.scamChapter && !next.scam) {
    next.scam = makeScamOffer(next.positions, next.cash)
  }

  if (stage.key === 'shock') next = resolveShock(next)
  return next
}

// สเตจ 3 — แรงกระแทกจริงลงพอร์ต
function resolveShock(state) {
  const rng = rngFrom(state.seed)
  const event = currentEvent(state)

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
  // เก็บสำเนาไว้ก่อนลงผลตอบแทน — สเตจ 5 ใช้เทียบผลรายสินทรัพย์
  // จุดนี้คือ "หลังมิจฉาชีพเชิดเงินแล้ว" โดยตั้งใจ — ตารางสเตจ 5 รายงานผลของเหตุการณ์อย่างเดียว
  // ส่วนเงินที่โดนโกงมีบรรทัดของตัวเองอยู่แล้วในสเตจ 3
  const positionsBeforeShock = { ...positions }
  const result = applyEventReturns(positions, event, {
    chapterIndex: state.chapterIndex,
    ageModifiers: BALANCE.ageModifiers,
  })
  positions = result.positions
  const valueAfterShock = totalValue(positions) + cash
  const portfolioReturn = valueBeforeShock > 0
    ? (valueAfterShock - valueBeforeShock) / valueBeforeShock
    : 0
  const shock = {
    portfolioReturn,
    shockPct: portfolioReturn,
    baseReturns: result.baseReturns,
    ageModifiers: result.ageModifiers,
    assetReturns: result.assetReturns,
    impacts: result.impacts,
    cashBefore: cash,
  }

  return {
    ...state,
    seed: rng.getSeed(),
    positions,
    positionsBeforeShock,
    cash,
    scam,
    shock,
    valueBeforeShock,
    behavior: null,
    behaviorEffect: null,
  }
}

// สเตจ 4 — จุดตัดสินใจพฤติกรรม (ถือต่อ / ตัดขาดทุน / ซื้อเพิ่ม)
function chooseBehavior(state, choice, toolId = null) {
  const style = currentStyle(state)
  const lost = Math.max(0, state.valueBeforeShock - netWorth(state))
  let next = { ...state, behavior: choice, validationError: null }

  if (choice === 'hold') {
    const baseRecovery = lost * BALANCE.reboundPct
    const actualRecovery = baseRecovery * (style.holdRecoveryMult ?? 1)
    const recoveryBonus = actualRecovery - baseRecovery
    next.reboundOwed = actualRecovery
    next.immuneToAftershock = false
    next.behaviorEffect = {
      choice,
      toolId: null,
      cashInvested: 0,
      amountRebalanced: 0,
      baseRecovery,
      abilityRecoveryBonus: recoveryBonus,
      totalRecovery: actualRecovery,
      fee: 0,
      avoidsAftershock: false,
    }
    if (recoveryBonus > 0) next.chapterAbility = {
      ...state.chapterAbility,
      triggered: true,
      bonus: state.chapterAbility.bonus + recoveryBonus,
      recoveryBonus: state.chapterAbility.recoveryBonus + recoveryBonus,
    }
  }

  if (choice === 'cut') {
    // ขายเฉพาะสินทรัพย์เสี่ยงที่เสียหาย 70% ส่วนที่เหลือยังอยู่ในตลาด
    // จึงลดความเสี่ยงโดยไม่เปลี่ยนทั้งพอร์ตเป็นตราสารหนี้ทันที
    const losingIds = new Set((state.shock?.impacts ?? [])
      .filter((impact) => impact.change < 0 && impact.toolId !== 'bond')
      .map((impact) => impact.toolId))
    const positions = { ...state.positions }
    let traded = 0
    for (const id of losingIds) {
      const sold = (positions[id] ?? 0) * BALANCE.cutLossSellPct
      if (sold <= 0) continue
      positions[id] -= sold
      traded += sold
    }
    const fee = traded * effectiveTradeFeePct(state)
    if (traded > 0) positions.bond = (positions.bond ?? 0) + traded - fee
    next.positions = positions
    next.lastFee = fee
    if (style.id === 'trader' && fee > 0) next.chapterAbility = {
      ...state.chapterAbility,
      triggered: true,
      cost: state.chapterAbility.cost + fee,
    }
    next.reboundOwed = 0
    next.immuneToAftershock = false
    next.behaviorEffect = {
      choice,
      toolId: 'bond',
      cashInvested: 0,
      amountRebalanced: traded,
      baseRecovery: 0,
      abilityRecoveryBonus: 0,
      totalRecovery: 0,
      fee,
      avoidsAftershock: false,
    }
  }

  if (choice === 'buy') {
    if (state.cash <= 0.5) {
      return { ...state, validationError: 'ต้องมีเงินสดเหลือจึงจะซื้อเพิ่มได้' }
    }
    if (!getTool(toolId)) {
      return { ...state, validationError: 'กรุณาเลือกสินทรัพย์ที่จะซื้อเพิ่ม' }
    }
    // ซื้อเพิ่มตอนราคาถูก: ผู้เล่นเลือกปลายทางเอง และเทเงินสดทั้งหมดเข้าสินทรัพย์นั้น
    const invested = state.cash
    const positions = { ...state.positions }
    positions[toolId] = (positions[toolId] ?? 0) + invested
    next.positions = positions
    next.cash = 0
    const baseRecovery = lost * BALANCE.reboundPct * BALANCE.buyDipReboundMult
    const cashShare = invested / Math.max(1, invested + totalValue(state.positions))
    const qualifiesForStyleBonus = cashShare >= (style.minBuyDipCashShare ?? 0)
    const actualRecovery = baseRecovery * (qualifiesForStyleBonus ? (style.buyDipMult ?? 1) : 1)
    const recoveryBonus = actualRecovery - baseRecovery
    next.reboundOwed = actualRecovery
    next.immuneToAftershock = false
    next.investedOnDip = invested
    next.behaviorEffect = {
      choice,
      toolId,
      cashInvested: invested,
      cashShare,
      qualifiesForStyleBonus,
      amountRebalanced: 0,
      baseRecovery,
      abilityRecoveryBonus: recoveryBonus,
      totalRecovery: actualRecovery,
      fee: 0,
      avoidsAftershock: false,
    }
    if (recoveryBonus > 0) next.chapterAbility = {
      ...state.chapterAbility,
      triggered: true,
      bonus: state.chapterAbility.bonus + recoveryBonus,
      recoveryBonus: state.chapterAbility.recoveryBonus + recoveryBonus,
    }
  }
  return next
}

// ---------- ปิดบท → บทถัดไป ----------
// ปิดบท = ปล่อยให้ทศวรรษนั้นเดินจนจบ: ฟื้นตัว → คลื่นตาม → ทบต้น
// ทำเหมือนกันทุกบทรวมถึงบทสุดท้าย (บทที่ 4 ก็คืออายุ 50-59 ซึ่งเป็นทศวรรษเต็มๆ เหมือนบทอื่น)
// มีแค่ "รายได้ก้อนใหม่" เท่านั้นที่ไม่เข้าหลังบทสุดท้าย เพราะเกษียณแล้วไม่มีเงินเดือน
function finishChapter(state, endedAt = null) {
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
      // คลื่นตามย้ำเฉพาะด้านลบของ Matrix ด้วยความแรงครึ่งหนึ่ง
      // จึงไม่แจกกำไรซ้ำให้สินทรัพย์ที่ชนะเหตุการณ์
      const result = applyEventReturns(positions, event, {
        scale: BALANCE.aftershockSeverityMult,
        negativeOnly: true,
        chapterIndex: state.chapterIndex,
        ageModifiers: BALANCE.ageModifiers,
      })
      positions = result.positions
      lastAftershock = { hit: true, avoided: false, pct: result.portfolioReturn }
    }
  }

  // 3) ทบต้นเงียบๆ ตลอดทศวรรษ — รางวัลของการถือ (ดีไซน์ข้อ 3)
  const growth = applyGrowthWithDetails(positions, style.returnMult, rng)
  positions = growth.positions
  const growthBonus = Math.max(0, growth.abilityBonus)
  const finalizedAbility = {
    ...state.chapterAbility,
    triggered: state.chapterAbility.triggered || growthBonus > 0,
    bonus: state.chapterAbility.bonus + growthBonus,
    growthBonus: state.chapterAbility.growthBonus + growthBonus,
  }

  const entry = {
    chapter: chapter.n,
    ageFrom: chapter.ageFrom,
    ageTo: chapter.ageTo,
    eventId: event.id,
    eventName: event.name,
    characterAbilityId: finalizedAbility.abilityId,
    abilityTriggered: finalizedAbility.triggered,
    abilityBonus: finalizedAbility.bonus,
    abilityCost: finalizedAbility.cost,
    abilityNetEffect: finalizedAbility.bonus - finalizedAbility.cost,
    abilityRecoveryBonus: finalizedAbility.recoveryBonus,
    abilityGrowthBonus: finalizedAbility.growthBonus,
    adjustmentCount: finalizedAbility.adjustmentCount,
    adjustmentPromptChoices: finalizedAbility.promptChoices,
    incomeAdded: state.incomeSchedule[state.chapterIndex] ?? 0,
    allocationBeforeEvent: {
      ...state.positionsBeforeShock,
      cash: state.shock?.cashBefore ?? state.cash,
    },
    shockPct: state.shock?.portfolioReturn ?? 0,
    baseReturns: state.shock?.baseReturns ?? {},
    ageModifiers: state.shock?.ageModifiers ?? {},
    assetReturns: state.shock?.assetReturns ?? {},
    assetImpacts: state.shock?.impacts ?? [],
    concentration: concentration(state.positionsBeforeShock),
    cashOnly: totalValue(state.positions) <= 0 && state.cash > 0,
    behavior: state.behavior,
    behaviorEffect: state.behaviorEffect,
    scamAccepted: state.scam?.accepted ?? false,
    scamLost: state.scam?.lost ?? 0,
    valueBefore: state.valueBeforeShock,
    valueAfter: valueAfterShock, // ทันทีหลังแรงกระแทก — ใช้วัดว่าเหตุการณ์ทำอะไรกับพอร์ต
    valueEnd: totalValue(positions) + cash, // ปลายทศวรรษ หลังฟื้นตัวและทบต้นแล้ว
  }
  const history = [...state.history, entry]

  if (isLast) {
    const finished = { ...state, seed: rng.getSeed(), positions, cash, history, phase: 'report' }
    const timed = endedAt ? withTiming(finished, { scope: 'run', phase: 'end', at: endedAt }) : finished
    return { ...timed, report: buildReport(timed) }
  }

  // 4) เงินสดถูกเงินเฟ้อกิน แล้วรายได้ก้อนใหม่เข้ามา
  cash = cash * BALANCE.cashDecayPerChapter + (state.incomeSchedule[state.chapterIndex + 1] ?? 0)

  return {
    ...state,
    seed: rng.getSeed(),
    history,
    positions,
    cash,
    chapterIndex: state.chapterIndex + 1,
    stageIndex: 0,
    phase: 'allocation',
    shock: null,
    positionsBeforeShock: {}, // ล้างพร้อม shock — ข้อมูลของบทที่จบไปแล้วต้องไม่ค้างมาบทใหม่
    scam: null,
    behavior: null,
    behaviorEffect: null,
    reboundOwed: 0,
    immuneToAftershock: false,
    lastAftershock,
    chapterAbility: createChapterAbility(state.styleId),
    investedOnDip: 0,
  }
}

function nextStage(state, endedAt = null) {
  if (state.stageIndex >= STAGES.length - 1) return finishChapter(state, endedAt)
  return enterStage(state, state.stageIndex + 1)
}

// ---------- reducer ----------
export function gameReducer(state, action) {
  if (action.type === 'SET_RESEARCH_CONSENT') {
    if (typeof action.consent !== 'boolean') return state
    return { ...state, research: { ...state.research, consent: action.consent, anonymousPlayerId: action.anonymousPlayerId ?? state.research.anonymousPlayerId, runId: action.runId ?? state.research.runId } }
  }
  if (action.type === 'SET_PRE_ASSESSMENT') return { ...state, assessment: { ...state.assessment, pre: action.assessment ?? null } }
  if (action.type === 'SET_POST_ASSESSMENT') return { ...state, assessment: { ...state.assessment, post: action.assessment ?? null, knowledgeGain: null } }
  if (action.type === 'RECORD_TIMING') return withTiming(state, action)
  switch (action.type) {
    case 'START':
      return state.phase === 'cover' ? { ...state, phase: 'style' } : state

    case 'SELECT_STYLE':
      return state.phase === 'style' ? startRun(state, action.styleId, action.at) : state

    case 'SET_ALLOCATION':
      if (!canAdjustNow(state)) return state
      return recordAllocationEffect(state, applyAllocation(state, action.weights), { countAdjustment: state.phase === 'stage' })

    case 'CONFIRM_ALLOCATION':
      if (state.phase !== 'allocation') return state
      if (Object.hasOwn(action, 'weights')) {
        const allocated = applyAllocation(state, action.weights)
        if (allocated.validationError) return allocated
        return confirmAllocation(recordAllocationEffect(state, allocated))
      }
      return state.validationError ? state : confirmAllocation(state)

    case 'RECORD_ADJUSTMENT_PROMPT': {
      if (state.phase !== 'stage' || !['adjust', 'skip'].includes(action.choice)) return state
      const style = currentStyle(state)
      const stage = currentStage(state)
      if (!style.adjustmentPromptStages?.includes(stage.n)) return state
      if (state.chapterAbility.promptChoices[stage.key]) return state
      return {
        ...state,
        chapterAbility: {
          ...state.chapterAbility,
          promptChoices: { ...state.chapterAbility.promptChoices, [stage.key]: action.choice },
        },
      }
    }

    case 'ANSWER_SCAM':
      if (!state.scam || state.scam.accepted !== null) return state
      if (typeof action.accept !== 'boolean') {
        return { ...state, validationError: 'ตอบข้อเสนอไม่สำเร็จ: กรุณาเลือกว่าจะรับหรือปฏิเสธ' }
      }
      return { ...state, scam: { ...state.scam, accepted: action.accept } }

    case 'CHOOSE_BEHAVIOR':
      if (state.phase !== 'stage' || currentStage(state).key !== 'behavior') return state
      if (state.behavior) return state
      if (!['hold', 'cut', 'buy'].includes(action.choice)) {
        return { ...state, validationError: 'เลือกวิธีรับมือไม่สำเร็จ: กรุณาเลือกหนึ่งในตัวเลือกที่แสดง' }
      }
      return chooseBehavior(state, action.choice, action.toolId)

    case 'NEXT_STAGE':
      if (state.phase !== 'stage') return state
      if (action.expectedStageIndex != null && action.expectedStageIndex !== state.stageIndex) return state
      if (state.scam?.accepted === null) {
        return { ...state, validationError: 'กรุณาตอบข้อเสนอที่แสดงอยู่ก่อนดำเนินเรื่องต่อ' }
      }
      if (currentStage(state).key === 'behavior' && !state.behavior) {
        return { ...state, validationError: 'กรุณาเลือกวิธีรับมือก่อนดำเนินเรื่องต่อ' }
      }
      return { ...nextStage(state, action.at), validationError: null }

    case 'RESTART':
      return createInitialState(state.seed)

    default:
      return state
  }
}

