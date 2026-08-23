// Authoritative command boundary for UI/adapters.
// The reducer remains a pure state transition function; this module adds a stable
// { ok, state, error } contract and guarantees atomic rejection.

import { gameReducer, currentStage, canAdjustNow } from './gameState.js'
import { getStyle } from './data/styles.js'
import { getTool } from './data/tools.js'
import { BALANCE } from './balance.js'

export const COMMAND_ERROR = Object.freeze({
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
  UNKNOWN_COMMAND: 'UNKNOWN_COMMAND',
  WRONG_PHASE: 'WRONG_PHASE',
  INVALID_STYLE: 'INVALID_STYLE',
  INVALID_ALLOCATION: 'INVALID_ALLOCATION',
  INVALID_DECISION: 'INVALID_DECISION',
  DECISION_REQUIRED: 'DECISION_REQUIRED',
  STALE_COMMAND: 'STALE_COMMAND',
  INVALID_STATE: 'INVALID_STATE',
})

const CORE_COMMANDS = new Set([
  'START',
  'SELECT_STYLE',
  'SET_ALLOCATION',
  'CONFIRM_ALLOCATION',
  'RECORD_ADJUSTMENT_PROMPT',
  'ANSWER_SCAM',
  'CHOOSE_BEHAVIOR',
  'NEXT_STAGE',
  'RESTART',
])

const error = (code, message, field) => ({ code, message, ...(field ? { field } : {}) })

function validateWeights(weights) {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
    return error(COMMAND_ERROR.INVALID_ALLOCATION, 'กรุณาส่งสัดส่วนพอร์ตในรูปแบบที่ถูกต้อง', 'weights')
  }
  const entries = Object.entries(weights)
  if (entries.length === 0) {
    return error(COMMAND_ERROR.INVALID_ALLOCATION, 'กรุณาจัดสรรเงินอย่างน้อยหนึ่งรายการ', 'weights')
  }
  for (const [assetId, weight] of entries) {
    if (assetId !== 'cash' && !getTool(assetId)) {
      return error(COMMAND_ERROR.INVALID_ALLOCATION, `ไม่พบสินทรัพย์ ${assetId}`, `weights.${assetId}`)
    }
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
      return error(COMMAND_ERROR.INVALID_ALLOCATION, 'สัดส่วนต้องเป็นตัวเลขจำกัดที่ไม่ติดลบ', `weights.${assetId}`)
    }
  }
  const weightSum = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (!Number.isFinite(weightSum) || weightSum <= 0) {
    return error(COMMAND_ERROR.INVALID_ALLOCATION, 'กรุณาจัดสรรเงินอย่างน้อยหนึ่งรายการ', 'weights')
  }
  return null
}

export function validateGameState(state) {
  if (!state || typeof state !== 'object') return error(COMMAND_ERROR.INVALID_STATE, 'ไม่พบสถานะเกมที่ใช้งานได้')
  if (!['cover', 'style', 'allocation', 'stage', 'report'].includes(state.phase)) {
    return error(COMMAND_ERROR.INVALID_STATE, 'สถานะหน้าจอเกมไม่ถูกต้อง', 'phase')
  }
  if (!Number.isInteger(state.chapterIndex) || state.chapterIndex < 0 || state.chapterIndex >= BALANCE.chapters.length) {
    return error(COMMAND_ERROR.INVALID_STATE, 'ลำดับบทของเกมไม่ถูกต้อง', 'chapterIndex')
  }
  if (!Number.isInteger(state.stageIndex) || state.stageIndex < 0 || state.stageIndex >= BALANCE.stages.length) {
    return error(COMMAND_ERROR.INVALID_STATE, 'ลำดับสเตจของเกมไม่ถูกต้อง', 'stageIndex')
  }
  if (typeof state.cash !== 'number' || !Number.isFinite(state.cash) || state.cash < 0) {
    return error(COMMAND_ERROR.INVALID_STATE, 'ยอดเงินสดในสถานะเกมไม่ถูกต้อง', 'cash')
  }
  if (!state.positions || typeof state.positions !== 'object' || Array.isArray(state.positions)) {
    return error(COMMAND_ERROR.INVALID_STATE, 'ข้อมูลพอร์ตในสถานะเกมไม่ถูกต้อง', 'positions')
  }
  for (const [assetId, amount] of Object.entries(state.positions)) {
    if (!getTool(assetId) || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      return error(COMMAND_ERROR.INVALID_STATE, 'พบสินทรัพย์หรือมูลค่าที่ไม่ถูกต้องในพอร์ต', `positions.${assetId}`)
    }
  }
  const netWorth = state.cash + Object.values(state.positions).reduce((sum, amount) => sum + amount, 0)
  if (!Number.isFinite(netWorth)) {
    return error(COMMAND_ERROR.INVALID_STATE, 'มูลค่ารวมของพอร์ตเกินช่วงตัวเลขที่รองรับ', 'positions')
  }
  if (!Array.isArray(state.history)) return error(COMMAND_ERROR.INVALID_STATE, 'ประวัติการเล่นไม่ถูกต้อง', 'history')
  return null
}

function validateCommand(state, command) {
  if (!command || typeof command !== 'object' || Array.isArray(command) || typeof command.type !== 'string') {
    return error(COMMAND_ERROR.INVALID_ENVELOPE, 'คำสั่งเกมไม่สมบูรณ์')
  }
  if (!CORE_COMMANDS.has(command.type)) return error(COMMAND_ERROR.UNKNOWN_COMMAND, 'เกมไม่รู้จักคำสั่งนี้', 'type')

  switch (command.type) {
    case 'START':
      return state.phase === 'cover' ? null : error(COMMAND_ERROR.WRONG_PHASE, 'เริ่มเกมใหม่จากหน้าปัจจุบันไม่ได้')
    case 'SELECT_STYLE':
      if (state.phase !== 'style') return error(COMMAND_ERROR.WRONG_PHASE, 'ยังเลือกสไตล์ในขั้นตอนนี้ไม่ได้')
      return getStyle(command.styleId) ? null : error(COMMAND_ERROR.INVALID_STYLE, 'กรุณาเลือกสไตล์นักลงทุนที่มีอยู่', 'styleId')
    case 'CONFIRM_ALLOCATION':
      if (state.phase !== 'allocation') return error(COMMAND_ERROR.WRONG_PHASE, 'ยืนยันพอร์ตได้เฉพาะหน้าจัดพอร์ต')
      return validateWeights(command.weights)
    case 'SET_ALLOCATION':
      if (!canAdjustNow(state)) return error(COMMAND_ERROR.WRONG_PHASE, 'สไตล์นี้ยังปรับพอร์ตในขั้นตอนปัจจุบันไม่ได้')
      return validateWeights(command.weights)
    case 'RECORD_ADJUSTMENT_PROMPT': {
      if (state.phase !== 'stage' || !['adjust', 'skip'].includes(command.choice)) {
        return error(COMMAND_ERROR.INVALID_DECISION, 'กรุณาเลือกว่าจะปรับพอร์ตหรือใช้พอร์ตเดิม', 'choice')
      }
      const style = getStyle(state.styleId)
      const stage = currentStage(state)
      if (!style?.adjustmentPromptStages?.includes(stage.n) || state.chapterAbility.promptChoices[stage.key]) {
        return error(COMMAND_ERROR.WRONG_PHASE, 'ขณะนี้ไม่มีคำถามปรับพอร์ตที่รอคำตอบ')
      }
      return null
    }
    case 'ANSWER_SCAM':
      if (state.phase !== 'stage' || !state.scam || state.scam.accepted !== null) {
        return error(COMMAND_ERROR.WRONG_PHASE, 'ขณะนี้ไม่มีข้อเสนอที่รอคำตอบ')
      }
      return typeof command.accept === 'boolean'
        ? null
        : error(COMMAND_ERROR.INVALID_DECISION, 'กรุณาเลือกว่าจะรับหรือปฏิเสธข้อเสนอ', 'accept')
    case 'CHOOSE_BEHAVIOR':
      if (state.phase !== 'stage' || currentStage(state)?.key !== 'behavior' || state.behavior) {
        return error(COMMAND_ERROR.WRONG_PHASE, 'ยังเลือกวิธีรับมือในขั้นตอนนี้ไม่ได้')
      }
      if (!['hold', 'cut', 'buy'].includes(command.choice)) {
        return error(COMMAND_ERROR.INVALID_DECISION, 'กรุณาเลือกวิธีรับมือที่แสดงอยู่', 'choice')
      }
      if (command.choice === 'buy' && state.cash <= 0.5) {
        return error(COMMAND_ERROR.INVALID_DECISION, 'ต้องมีเงินสดเหลือจึงจะซื้อเพิ่มได้', 'choice')
      }
      return null
    case 'NEXT_STAGE':
      if (state.phase !== 'stage') return error(COMMAND_ERROR.WRONG_PHASE, 'ยังดำเนินเรื่องต่อจากหน้าปัจจุบันไม่ได้')
      if (!Number.isInteger(command.expectedStageIndex) || command.expectedStageIndex !== state.stageIndex) {
        return error(COMMAND_ERROR.STALE_COMMAND, 'สถานะเกมเปลี่ยนไปแล้ว กรุณาลองอีกครั้ง', 'expectedStageIndex')
      }
      if (state.scam?.accepted === null || (currentStage(state)?.key === 'behavior' && !state.behavior)) {
        return error(COMMAND_ERROR.DECISION_REQUIRED, 'กรุณาตอบตัวเลือกที่แสดงอยู่ก่อนดำเนินเรื่องต่อ')
      }
      return null
    case 'RESTART':
      return null
    default:
      return error(COMMAND_ERROR.UNKNOWN_COMMAND, 'เกมไม่รู้จักคำสั่งนี้', 'type')
  }
}

export function executeCommand(state, command) {
  const stateError = validateGameState(state)
  if (stateError) return { ok: false, state, error: stateError }

  const commandError = validateCommand(state, command)
  if (commandError) return { ok: false, state, error: commandError }

  const nextState = gameReducer(state, command)
  const nextStateError = validateGameState(nextState)
  if (nextStateError) return { ok: false, state, error: nextStateError }

  return { ok: true, state: nextState, error: null }
}
