import cardsData from '../data/cards.json'
import enemiesData from '../data/enemies.json'
import classesData from '../data/classes.json'

// ---------- ค่าคงที่ของเกม ----------
export const START_PORTFOLIO = 100
export const MAX_ENERGY = 3
export const HAND_SIZE = 5

// แผนที่แนวนอนเส้นทางเดียว: ผู้เล่นเดินจากซ้ายไปขวาผ่านโหนดตามลำดับตายตัวนี้
// มอนสเตอร์ x2 -> Event -> มอนสเตอร์ x2 -> Event -> มอนสเตอร์ x2 -> พัก -> บอส
const MAP_NODE_SEQUENCE = ['monster', 'monster', 'card', 'monster', 'monster', 'card', 'monster', 'monster', 'rest', 'boss']
const MAP_MONSTER_COUNT = MAP_NODE_SEQUENCE.filter((t) => t === 'monster').length // = 6 (ใช้พูลมอนสเตอร์ไม่ซ้ำครบเส้นทาง)

// ผลลัพธ์ที่สุ่มได้เมื่อเข้าโหนด Event (node.type === 'card'): เจอมอนสเตอร์ / ได้การ์ดใหม่ / ฟื้นพอร์ต / อุบัติเหตุพอร์ตลด
const EVENT_OUTCOME_WEIGHTS = [['monster', 30], ['card', 30], ['heal', 20], ['accident', 20]]

// ค่า passive เริ่มต้น (คลาสจะ override เฉพาะที่กำหนด)
const DEFAULT_PASSIVE = {
  attackBonus: 0, // บวกดาเมจโจมตีทุกครั้ง
  incomingFlat: 0, // บวกดาเมจที่ได้รับ (คลาสเปราะบาง)
  incomingReductionPct: 0, // ลดดาเมจที่ได้รับเป็น % ตลอดเวลา
  blockPerTurn: 0, // ได้ Block ต้นเทิร์น
  healPerTurn: 0, // ฟื้น Portfolio ต้นเทิร์น
}

// ค้นหา definition จาก id
export const getCard = (id) => cardsData.find((c) => c.id === id)
export const getClass = (id) => classesData.find((c) => c.id === id)
export const getClasses = () => classesData
const getEnemyDef = (id) => enemiesData.find((e) => e.id === id)

// กองการ์ดรางวัล = การ์ดกลางที่ติดธง reward (ไม่ใช่การ์ดสกิลเฉพาะคลาส)
const REWARD_POOL = cardsData.filter((c) => c.reward).map((c) => c.id)

// ---------- helper ----------
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedPick(weights) {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [val, w] of weights) {
    if (r < w) return val
    r -= w
  }
  return weights[weights.length - 1][0]
}

// จั่วการ์ด n ใบ (reshuffle discard เข้า draw เมื่อ draw หมด)
// การ์ดที่เล่นไปแล้วอยู่ใน discardPile จึงวนกลับมาจั่วซ้ำได้ในเทิร์นถัดๆ ไป
function drawCards(state, n) {
  let drawPile = [...state.drawPile]
  let discardPile = [...state.discardPile]
  const hand = [...state.hand]

  for (let i = 0; i < n; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break // ไม่มีการ์ดให้จั่วแล้ว
      drawPile = shuffle(discardPile)
      discardPile = []
    }
    hand.push(drawPile.shift())
  }
  return { ...state, drawPile, discardPile, hand }
}

// ---------- แผนที่ (แนวนอนเส้นทางเดียว) ----------

// สร้างแผนที่ใหม่สำหรับรอบนี้: เส้นทางเดียวแนวนอน 10 โหนด ตามลำดับ MAP_NODE_SEQUENCE
// มอนสเตอร์ 6 ตัวไม่ซ้ำจากพูล + บอส 1 ตัว ผู้เล่นต้องเดินตามลำดับซ้ายไปขวาจนถึงบอสท้ายทาง
function buildMap() {
  const monsterPool = shuffle(enemiesData.filter((e) => e.tier === 'monster')).slice(0, MAP_MONSTER_COUNT)
  const bosses = enemiesData.filter((e) => e.tier === 'boss')
  const boss = bosses.length ? shuffle(bosses)[0] : null
  let cursor = 0
  const nextMonsterId = () => monsterPool[cursor++ % monsterPool.length].id

  const nodes = MAP_NODE_SEQUENCE.map((type, i) => {
    const node = { id: `n${i}`, col: i, type, cleared: false, enemyId: null }
    if (type === 'monster') node.enemyId = nextMonsterId()
    else if (type === 'boss') node.enemyId = boss?.id ?? null
    return node
  })

  // แถวเดียวเรียงเป็นเส้นตรง — คงโครง rows[].nodes ไว้เพื่อให้ตัวเรนเดอร์แผนที่ทำงานเหมือนเดิม
  const rows = [{ row: 0, nodes }]
  const edges = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id })
  }

  return { rows, edges, currentNodeId: null, visitedNodeIds: [] }
}

function getMapNode(map, nodeId) {
  for (const row of map.rows) {
    const n = row.nodes.find((x) => x.id === nodeId)
    if (n) return n
  }
  return null
}

// โหนดที่เดินไปได้จากตำแหน่งปัจจุบัน (เส้นทางเดียว: เริ่มที่โหนดแรก แล้วเดินไปโหนดถัดไปทีละก้าว)
export function getReachableNodeIds(map) {
  if (!map) return []
  if (map.currentNodeId === null) {
    const first = map.rows[0]?.nodes[0]
    return first ? [first.id] : []
  }
  return map.edges.filter((e) => e.from === map.currentNodeId).map((e) => e.to)
}

function markNodeCleared(map, nodeId) {
  return {
    ...map,
    currentNodeId: nodeId,
    visitedNodeIds: map.visitedNodeIds.includes(nodeId) ? map.visitedNodeIds : [...map.visitedNodeIds, nodeId],
    rows: map.rows.map((row) => ({
      ...row,
      nodes: row.nodes.map((n) => (n.id === nodeId ? { ...n, cleared: true } : n)),
    })),
  }
}

// ผูกศัตรูที่สุ่มได้ (จาก Event) เข้ากับโหนดนั้นๆ ก่อนเข้าสู้ — โหนดยังเป็น type 'card' เดิม
function setNodeEnemy(map, nodeId, enemyId) {
  return {
    ...map,
    rows: map.rows.map((row) => ({
      ...row,
      nodes: row.nodes.map((n) => (n.id === nodeId ? { ...n, enemyId } : n)),
    })),
  }
}

// เลือก move ของศัตรูและสร้าง intent ที่แสดงล่วงหน้า (ใช้ minValue/maxValue ร่วมกันทุก type)
function rollEnemyIntent(enemy) {
  const move = enemy.moves[Math.floor(Math.random() * enemy.moves.length)]
  const value = move.minValue != null ? randInt(move.minValue, move.maxValue) : 0
  return { moveId: move.id, type: move.type, label: move.label, value }
}

// passive ที่ทำงานต้นเทิร์น (Block / ฟื้น Portfolio) — mutate player ของ state ก้อนใหม่
function applyTurnStartPassives(state) {
  const p = state.passive || DEFAULT_PASSIVE
  if (p.blockPerTurn) {
    state.player.block += p.blockPerTurn
  }
  if (p.healPerTurn) {
    state.player.portfolio = Math.min(
      state.player.maxPortfolio,
      state.player.portfolio + p.healPerTurn,
    )
  }
  return state
}

// เริ่มการต่อสู้ที่โหนด nodeId บนแผนที่: รีเซ็ตสำรับจาก masterDeck, energy, block, buff ต่อการต่อสู้
// (คงไว้: portfolio, meta.cardGrowth ที่เป็นค่าถาวร, masterDeck, map, hero, passive)
function startBattle(state, nodeId) {
  const node = getMapNode(state.map, nodeId)
  const enemyDef = getEnemyDef(node.enemyId)
  const enemy = {
    ...enemyDef,
    hp: enemyDef.maxHp,
    block: 0,
    intent: rollEnemyIntent(enemyDef),
  }

  let next = {
    ...state,
    phase: 'playing',
    turn: 1,
    enemy,
    player: {
      ...state.player,
      energy: state.player.maxEnergy, // ใช้ค่า energy ตามคลาส
      block: 0,
      vulnerable: { pct: 0, remaining: 0 }, // สถานะเปราะบางรีเซ็ตสดทุกไฟต์ใหม่
    },
    // สำรับของรอบนี้ = การ์ดทั้งหมดที่ครอบครอง (การ์ดที่เคยใช้กลับมาแล้ว)
    drawPile: shuffle(state.masterDeck),
    hand: [],
    discardPile: [],
    buffs: { compound: 0, damageReduction: 0 }, // buff ต่อการต่อสู้ รีเซ็ตทุกด่าน
    map: { ...state.map, currentNodeId: nodeId },
    rewardChoices: null,
    rewardReason: null,
    eventResult: null,
    log: [],
  }

  next = drawCards(next, HAND_SIZE)
  next = applyTurnStartPassives(next) // passive ต้นเทิร์นแรกของด่าน
  return next
}

// ---------- สร้าง state เริ่มต้น (หน้าปกเกม) ----------
export function createInitialState() {
  return {
    phase: 'cover', // เริ่มที่หน้าปกเกม -> กด Play -> เลือกตัวละคร
    map: null, // สร้างตอนเริ่มรอบ (startRun)
    turn: 1,
    hero: null,
    passive: DEFAULT_PASSIVE,
    player: {
      portfolio: START_PORTFOLIO,
      maxPortfolio: START_PORTFOLIO,
      energy: MAX_ENERGY,
      maxEnergy: MAX_ENERGY,
      block: 0,
      vulnerable: { pct: 0, remaining: 0 },
    },
    masterDeck: [],
    enemy: null,
    drawPile: [],
    hand: [],
    discardPile: [],
    buffs: { compound: 0, damageReduction: 0 },
    meta: { cardGrowth: {} },
    rewardChoices: null,
    rewardReason: null,
    eventResult: null,
    deathCause: null, // 'accident' เมื่อแพ้จากอุบัติเหตุใน Event (ไม่ใช่การต่อสู้)
    debug: {
      lastDamageDealt: 0,
      lastDamageTaken: 0,
      lastBlockGained: 0,
    },
    log: [],
  }
}

// ---------- เลือกคลาสแล้วเริ่มการผจญภัย (สร้างแผนที่ใหม่ ไปหน้าแผนที่) ----------
function startRun(state, classId) {
  const cls = getClass(classId)
  if (!cls) return state

  return {
    ...state,
    phase: 'map',
    hero: {
      id: cls.id,
      name: cls.name,
      archetype: cls.archetype,
      role: cls.role,
      emoji: cls.emoji,
      passiveText: cls.passiveText,
    },
    passive: { ...DEFAULT_PASSIVE, ...cls.passive },
    masterDeck: [...cls.deck],
    player: {
      portfolio: cls.startPortfolio,
      maxPortfolio: cls.startPortfolio,
      energy: cls.maxEnergy,
      maxEnergy: cls.maxEnergy,
      block: 0,
      vulnerable: { pct: 0, remaining: 0 },
    },
    meta: { cardGrowth: {} },
    map: buildMap(),
    enemy: null,
  }
}

// ---------- เข้าโหนดบนแผนที่ ----------
function enterNode(state, nodeId) {
  const reachable = getReachableNodeIds(state.map)
  if (!reachable.includes(nodeId)) return state
  const node = getMapNode(state.map, nodeId)
  if (!node || node.cleared) return state

  if (node.type === 'monster' || node.type === 'boss') return startBattle(state, nodeId)

  let next = cloneState(state)
  next.map = { ...next.map, currentNodeId: nodeId }
  if (node.type === 'rest') {
    next.phase = 'rest'
    return next
  }
  if (node.type === 'card') {
    return triggerEvent(next, nodeId)
  }
  return next
}

// โหนด Event (type 'card'): สุ่มผลลัพธ์ 1 ใน 4 — เจอมอนสเตอร์ / ได้การ์ดใหม่ / ฟื้นพอร์ต / อุบัติเหตุพอร์ตลด
function triggerEvent(state, nodeId) {
  const outcome = weightedPick(EVENT_OUTCOME_WEIGHTS)

  if (outcome === 'monster') {
    const monsters = enemiesData.filter((e) => e.tier === 'monster')
    const enemyId = shuffle(monsters)[0]?.id
    state.map = setNodeEnemy(state.map, nodeId, enemyId)
    return startBattle(state, nodeId)
  }

  if (outcome === 'card') {
    state.phase = 'reward'
    state.rewardReason = 'event'
    state.rewardChoices = pickRewardChoices()
    return state
  }

  if (outcome === 'heal') {
    const amount = Math.max(8, Math.round(state.player.maxPortfolio * 0.2))
    const before = state.player.portfolio
    state.player.portfolio = Math.min(state.player.maxPortfolio, state.player.portfolio + amount)
    const gained = state.player.portfolio - before
    state.phase = 'event'
    state.eventResult = { kind: 'heal', amount: gained, before, after: state.player.portfolio }
    state.log = [`พบโอกาสลงทุนดี Portfolio +${gained}`, ...state.log].slice(0, 30)
    return state
  }

  // อุบัติเหตุ: พอร์ตลด
  const amount = Math.max(6, Math.round(state.player.maxPortfolio * 0.15))
  const before = state.player.portfolio
  state.player.portfolio = Math.max(0, state.player.portfolio - amount)
  const lost = before - state.player.portfolio
  const isDead = state.player.portfolio <= 0
  state.phase = isDead ? 'lost' : 'event'
  if (isDead) state.deathCause = 'accident'
  state.eventResult = { kind: 'accident', amount: lost, before, after: state.player.portfolio }
  state.log = [`อุบัติเหตุทางการเงิน! Portfolio -${lost}`, ...state.log].slice(0, 30)
  return state
}

// กดไปต่อจากหน้าผลลัพธ์ Event (heal/accident) -> mark cleared กลับแผนที่
function continueEvent(state) {
  if (state.phase !== 'event') return state
  let next = cloneState(state)
  next.map = markNodeCleared(next.map, next.map.currentNodeId)
  next.phase = 'map'
  next.eventResult = null
  return next
}

// พักผ่อนที่จุดพัก: ฟื้น 30% ของ Portfolio สูงสุด (ขั้นต่ำ 10) แล้วกลับแผนที่
function takeRest(state) {
  let next = cloneState(state)
  const healAmount = Math.max(10, Math.round(next.player.maxPortfolio * 0.3))
  next.player.portfolio = Math.min(next.player.maxPortfolio, next.player.portfolio + healAmount)
  next.map = markNodeCleared(next.map, next.map.currentNodeId)
  next.phase = 'map'
  return next
}

// ---------- ลงมือเล่นการ์ด 1 ใบ ----------
function playCard(state, handIndex) {
  const cardId = state.hand[handIndex]
  const card = getCard(cardId)
  if (!card) return state
  if (state.player.energy < card.cost) return state // energy ไม่พอ

  let next = cloneState(state)
  const eff = card.effects || {}
  const passive = next.passive || DEFAULT_PASSIVE
  const log = []

  // จ่าย energy
  next.player.energy -= card.cost

  // --- โจมตี (+ passive attackBonus) — ดูดซับด้วย block ศัตรูก่อนเข้า HP จริง ---
  let damageDealt = 0
  if (eff.attack != null) {
    const growth = next.meta.cardGrowth[cardId] || 0
    damageDealt = eff.attack + growth + (passive.attackBonus || 0)
    const absorbedByBlock = Math.min(next.enemy.block, damageDealt)
    next.enemy.block -= absorbedByBlock
    const hpDamage = damageDealt - absorbedByBlock
    next.enemy.hp = Math.max(0, next.enemy.hp - hpDamage)
    next.debug.lastDamageDealt = hpDamage
    log.push(`เล่น "${card.name}" โจมตี ${damageDealt}${absorbedByBlock > 0 ? ` (ศัตรูกันได้ ${absorbedByBlock})` : ''}`)
  }

  // --- การ์ดที่โตขึ้นถาวรทุกครั้งที่ใช้ (DCA) ---
  if (eff.growEachUse) {
    next.meta.cardGrowth[cardId] = (next.meta.cardGrowth[cardId] || 0) + eff.growEachUse
    log.push(`"${card.name}" แข็งแกร่งขึ้นถาวร +${eff.growEachUse} (พลังครั้งหน้า ${(eff.attack || 0) + next.meta.cardGrowth[cardId]})`)
  }

  // --- Block ---
  if (eff.block != null) {
    next.player.block += eff.block
    next.debug.lastBlockGained = eff.block
    log.push(`ได้รับ Block ${eff.block}`)
  }

  // --- ลดดาเมจที่ได้รับเทิร์นนี้ ---
  if (eff.damageReduction != null) {
    next.buffs.damageReduction = Math.max(next.buffs.damageReduction, eff.damageReduction)
    log.push(`ลดดาเมจที่จะได้รับ ${Math.round(eff.damageReduction * 100)}% เทิร์นนี้`)
  }

  // --- Power: ดอกเบี้ยทบต้น (stack) ---
  if (eff.compound != null) {
    next.buffs.compound += eff.compound
    log.push(`ดอกเบี้ยทบต้น +${eff.compound}/เทิร์น (รวม ${next.buffs.compound})`)
  }

  // --- ฟื้น Portfolio ---
  if (eff.heal != null) {
    const before = next.player.portfolio
    next.player.portfolio = Math.min(next.player.maxPortfolio, next.player.portfolio + eff.heal)
    log.push(`เพิ่ม Portfolio +${next.player.portfolio - before}`)
  }

  // --- ดาเมจตัวเอง (Panic Sell / เลเวอเรจ) ---
  if (eff.selfDamage != null) {
    next.player.portfolio = Math.max(0, next.player.portfolio - eff.selfDamage)
    log.push(`เสีย Portfolio ตัวเอง ${eff.selfDamage}`)
  }

  // ย้ายการ์ดจากมือ -> discardPile (ใช้แล้ววนกลับมาจั่วใหม่ได้ในเทิร์นถัดไป)
  next.hand = next.hand.filter((_, i) => i !== handIndex)
  next.discardPile = [...next.discardPile, cardId]

  // --- จั่วการ์ดเพิ่ม (เงินปันผล) --- ทำหลังย้ายการ์ดออกจากมือแล้ว
  if (eff.draw) {
    next = drawCards(next, eff.draw)
    log.push(`จั่วการ์ด +${eff.draw} ใบ`)
  }

  next.log = [...log, ...next.log].slice(0, 30)

  // ตรวจแพ้ก่อน (เผื่อ selfDamage ทำให้ตาย)
  if (next.player.portfolio <= 0) {
    next.player.portfolio = 0
    next.phase = 'lost'
    return next
  }

  // ตรวจชนะศัตรูตัวนี้
  if (next.enemy.hp <= 0) {
    return handleEnemyDefeated(next)
  }

  return next
}

// ศัตรูตัวปัจจุบันตาย -> บอสจบเกม, มอนสเตอร์ธรรมดา -> รับการ์ดรางวัล 1 ใน 2 ก่อนกลับแผนที่
function handleEnemyDefeated(state) {
  const next = { ...state }
  const node = getMapNode(next.map, next.map.currentNodeId)
  if (node.type === 'boss') {
    next.phase = 'won'
    return next
  }
  next.phase = 'reward'
  next.rewardReason = 'battle'
  next.rewardChoices = pickRewardChoices()
  return next
}

// สุ่มการ์ดรางวัล 2 ใบไม่ซ้ำกันจากกองรางวัล
function pickRewardChoices() {
  const pool = shuffle(REWARD_POOL)
  return pool.slice(0, 2)
}

// ---------- จบเทิร์นผู้เล่น -> ศัตรูโจมตี/ป้องกัน/ดีบัฟ -> เริ่มเทิร์นใหม่ ----------
function endTurn(state) {
  if (state.phase !== 'playing') return state
  let next = cloneState(state)
  const passive = next.passive || DEFAULT_PASSIVE
  const log = []

  // ทิ้งการ์ดที่เหลือในมือ (ยังไม่ถูกเล่น จึงกลับไป discard เพื่อจั่วใหม่ได้)
  next.discardPile = [...next.discardPile, ...next.hand]
  next.hand = []

  // ---- ศัตรูลงมือตาม intent ----
  const intent = next.enemy.intent
  next.enemy.block = 0 // reset ก่อนเสมอทุกรอบ ไม่มีเงื่อนไข (บล็อกเก่าหมดอายุพอดีตอนที่ศัตรูลงมือรอบใหม่)

  if (intent.type === 'attack') {
    let incoming = intent.value
    // ลดดาเมจถาวรตามคลาส (กองทุนรวม)
    if (passive.incomingReductionPct > 0) {
      incoming = incoming * (1 - passive.incomingReductionPct)
    }
    // ลดดาเมจจากการ์ด (กระจายความเสี่ยง)
    if (next.buffs.damageReduction > 0) {
      incoming = incoming * (1 - next.buffs.damageReduction)
    }
    // เปราะบางจากดีบัฟศัตรู (เพิ่มดาเมจ ใช้แล้วหมดฤทธิ์)
    if (next.player.vulnerable.remaining > 0) {
      incoming = incoming * (1 + next.player.vulnerable.pct)
    }
    incoming = Math.ceil(incoming)
    // คลาสเปราะบางรับดาเมจเพิ่ม (หุ้น/อนุพันธ์)
    if (passive.incomingFlat > 0) {
      incoming += passive.incomingFlat
    }
    // Block ดูดซับ
    const absorbed = Math.min(next.player.block, incoming)
    const actual = incoming - absorbed
    next.player.block -= absorbed
    next.player.portfolio = Math.max(0, next.player.portfolio - actual)
    next.player.vulnerable = { pct: 0, remaining: 0 } // ใช้แล้วหมดฤทธิ์
    next.debug.lastDamageTaken = actual
    log.push(`${next.enemy.name} ใช้ท่า "${intent.label}" (${intent.value}) กันได้ ${absorbed} เสีย Portfolio ${actual}`)
  } else if (intent.type === 'defend') {
    next.enemy.block += intent.value
    log.push(`${next.enemy.name} ตั้งการ์ดด้วยท่า "${intent.label}" (Block +${intent.value})`)
  } else if (intent.type === 'debuff') {
    next.player.vulnerable = { pct: intent.value / 100, remaining: 1 }
    log.push(`${next.enemy.name} ใช้ท่า "${intent.label}" (เสี่ยงเพิ่มดาเมจ ${intent.value}% ครั้งถัดไป)`)
  }

  // ตรวจแพ้
  if (next.player.portfolio <= 0) {
    next.player.portfolio = 0
    next.phase = 'lost'
    next.log = [...log, ...next.log].slice(0, 30)
    return next
  }

  // ---- เริ่มเทิร์นผู้เล่นใหม่ ----
  next.turn += 1
  next.player.energy = next.player.maxEnergy
  next.player.block = 0 // block รีเซ็ตต้นเทิร์น
  next.buffs.damageReduction = 0 // การลดดาเมจหมดอายุ

  // passive ต้นเทิร์น (Block / ฟื้น Portfolio ตามคลาส)
  next = applyTurnStartPassives(next)

  // ดอกเบี้ยทบต้นเพิ่ม Portfolio ต้นเทิร์น
  if (next.buffs.compound > 0) {
    const before = next.player.portfolio
    next.player.portfolio = Math.min(next.player.maxPortfolio, next.player.portfolio + next.buffs.compound)
    const gained = next.player.portfolio - before
    if (gained > 0) log.push(`ดอกเบี้ยทบต้น +${gained} Portfolio`)
  }

  // ศัตรูสุ่ม intent ใหม่
  next.enemy.intent = rollEnemyIntent(next.enemy)

  // จั่วการ์ดใหม่
  next.log = [...log, ...next.log].slice(0, 30)
  next = drawCards(next, HAND_SIZE)

  return next
}

// เลือกการ์ดรางวัล (จากการฆ่ามอนสเตอร์ หรือโหนด Event) แล้วกลับแผนที่
function chooseReward(state, cardId) {
  if (state.phase !== 'reward') return state
  let next = cloneState(state)
  next.masterDeck = [...next.masterDeck, cardId]
  next.map = markNodeCleared(next.map, next.map.currentNodeId)
  next.phase = 'map'
  next.rewardChoices = null
  next.rewardReason = null
  return next
}

// clone แบบลึกพอสำหรับ state ของเรา (โครงสร้างเป็น JSON ล้วน)
function cloneState(state) {
  return {
    ...state,
    hero: state.hero ? { ...state.hero } : null,
    passive: { ...(state.passive || DEFAULT_PASSIVE) },
    player: { ...state.player, vulnerable: { ...state.player.vulnerable } },
    enemy: state.enemy
      ? { ...state.enemy, intent: { ...state.enemy.intent } }
      : null,
    masterDeck: [...state.masterDeck],
    map: state.map
      ? {
          ...state.map,
          rows: state.map.rows.map((row) => ({ ...row, nodes: row.nodes.map((n) => ({ ...n })) })),
          edges: [...state.map.edges],
          visitedNodeIds: [...state.map.visitedNodeIds],
        }
      : null,
    drawPile: [...state.drawPile],
    hand: [...state.hand],
    discardPile: [...state.discardPile],
    buffs: { ...state.buffs },
    meta: { ...state.meta, cardGrowth: { ...state.meta.cardGrowth } },
    debug: { ...state.debug },
    log: [...state.log],
  }
}

// ---------- reducer หลัก ----------
export function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'cover') return state
      return { ...state, phase: 'select' }
    case 'SELECT_CLASS':
      if (state.phase !== 'select') return state
      return startRun(state, action.classId)
    case 'ENTER_NODE':
      if (state.phase !== 'map') return state
      return enterNode(state, action.nodeId)
    case 'TAKE_REST':
      if (state.phase !== 'rest') return state
      return takeRest(state)
    case 'PLAY_CARD':
      if (state.phase !== 'playing') return state
      return playCard(state, action.handIndex)
    case 'END_TURN':
      return endTurn(state)
    case 'CHOOSE_REWARD':
      return chooseReward(state, action.cardId)
    case 'CONTINUE_EVENT':
      if (state.phase !== 'event') return state
      return continueEvent(state)
    case 'RESTART':
      return createInitialState()
    default:
      return state
  }
}
