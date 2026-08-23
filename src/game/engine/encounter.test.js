import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { getEvent, getMainEvents } from './data/events.js'
import { getTools, TAGS } from './data/tools.js'
import { getStyles } from './data/styles.js'
import { concentration, hhi, weights, totalValue, rebalance, applyGrowth } from './portfolio.js'
import { returnsForEvent, applyEventReturns, applyAgeModifiers } from './encounter.js'

const EVEN_SPLIT = { bond: 100, fund: 100, stock: 100, crypto: 100 }
const TOOL_IDS = ['bond', 'fund', 'stock', 'crypto']

describe('ความสมบูรณ์ของข้อมูล', () => {
  test('เหตุการณ์ประจำบทครบ 9 ตัวและมี Matrix ครบสินทรัพย์ 4 ชนิด', () => {
    const events = getMainEvents()
    assert.equal(events.length, 9)
    for (const event of events) {
      assert.ok(TAGS.includes(event.primaryTag), `${event.id} มี primaryTag ที่ไม่รู้จัก`)
      assert.deepEqual(Object.keys(event.returns).sort(), [...TOOL_IDS].sort())
      assert.deepEqual(Object.keys(event.impactReasons).sort(), [...TOOL_IDS].sort())
      assert.ok(event.hint.length > 20)
      assert.ok(event.description.length > 30)
      assert.ok(event.summary.length > 20)
      for (const value of Object.values(event.returns)) {
        assert.ok(Number.isFinite(value) && value >= -1 && value <= 1, `${event.id} มีผลตอบแทนไม่ถูกต้อง`)
      }
    }
  })

  test('เครื่องมือครบ 4 ชนิดและมีข้อมูลผลตอบแทนระยะยาว', () => {
    const tools = getTools()
    assert.deepEqual(tools.map((tool) => tool.id), TOOL_IDS)
    for (const tool of tools) assert.ok(tool.growthMult > 1)
  })

  test('มีสไตล์เริ่มต้นเพียงหนึ่งเดียวและไม่มีสไตล์ใดแก้ Matrix', () => {
    const styles = getStyles()
    assert.equal(styles.filter((style) => style.isDefault).length, 1)
    for (const style of styles) assert.equal(style.shockMult, undefined)
  })
})

describe('คณิตศาสตร์พอร์ต', () => {
  test('พอร์ตว่างไม่ทำให้เกิด NaN', () => {
    assert.equal(totalValue({}), 0)
    assert.deepEqual(weights({}), {})
    assert.equal(concentration({}), 0)
  })

  test('HHI: ทุ่มตัวเดียว = 1 · กระจายครบ 4 = 1/4', () => {
    assert.equal(hhi({ bond: 600 }), 1)
    assert.ok(Math.abs(hhi(EVEN_SPLIT) - 1 / 4) < 1e-9)
  })

  test('concentration ปรับสเกลเป็น 0..1', () => {
    assert.equal(concentration({ bond: 600 }), 1)
    assert.ok(Math.abs(concentration(EVEN_SPLIT)) < 1e-9)
    assert.ok(concentration({ bond: 300, stock: 300 }) > 0)
  })

  test('rebalance หักค่าธรรมเนียมจากมูลค่าที่ย้ายจริง', () => {
    const { positions, traded, fee } = rebalance({ bond: 200 }, { bond: 0.5, stock: 0.5 }, 0.02)
    assert.equal(traded, 100)
    assert.equal(fee, 2)
    assert.ok(Math.abs(totalValue(positions) - 198) < 1e-9)
  })

  test('ไม่ปรับพอร์ตเลย = ไม่เสียค่าธรรมเนียม', () => {
    const { traded, fee } = rebalance({ bond: 100, stock: 100 }, { bond: 0.5, stock: 0.5 }, 0.02)
    assert.equal(traded, 0)
    assert.equal(fee, 0)
  })

  test('สไตล์คูณเฉพาะส่วนที่เป็นผลตอบแทน ไม่ใช่คูณเงินต้น', () => {
    const grown = applyGrowth({ bond: 100 }, 1.15)
    assert.ok(Math.abs(grown.bond - 123) < 1e-9)
  })
})

describe('Fixed Event Return Matrix', () => {
  test('เงินเฟ้อใช้ตัวเลขที่อนุมัติแบบตรงตัว', () => {
    assert.deepEqual(returnsForEvent(getEvent('inflation')), { bond: -0.1, fund: 0.05, stock: 0.1, crypto: 0.15 })
  })

  test('พอร์ต 25% เท่ากันเจอเงินเฟ้อได้ผลรวม +5%', () => {
    const result = applyEventReturns({ bond: 25, fund: 25, stock: 25, crypto: 25 }, getEvent('inflation'))
    const expected = { bond: 22.5, fund: 26.25, stock: 27.5, crypto: 28.75 }
    for (const id of TOOL_IDS) assert.ok(Math.abs(result.positions[id] - expected[id]) < 1e-12)
    assert.ok(Math.abs(result.portfolioReturn - 0.05) < 1e-12)
  })

  test('ทุก Matrix มีทั้งสินทรัพย์ที่แพ้ทางและชนะทาง', () => {
    for (const event of getMainEvents()) {
      const values = Object.values(returnsForEvent(event))
      assert.ok(values.some((value) => value < 0), `${event.id} ไม่มีสินทรัพย์แพ้ทาง`)
      assert.ok(values.some((value) => value > 0), `${event.id} ไม่มีสินทรัพย์ชนะทาง`)
    }
  })

  test('บท 1 ลดด้านลบ 5 จุดเปอร์เซ็นต์โดยไม่เปลี่ยนขาดทุนเป็นกำไร', () => {
    const result = applyAgeModifiers({ bond: -0.1, fund: -0.02, stock: 0.1 }, 0, [{ negativeRelief: 0.05 }])
    assert.deepEqual(result.finalReturns, { bond: -0.05, fund: 0, stock: 0.1 })
  })

  test('บท 3 และ 4 ลงโทษหุ้น/คริปโตขาลง และเพิ่มผลบวกตราสารหนี้', () => {
    const rules = [{}, {}, { riskyLossPenalty: 0.05, bondPositiveBonus: 0.05 }, { riskyLossPenalty: 0.1, bondPositiveBonus: 0.05 }]
    const base = { bond: 0.05, fund: -0.05, stock: -0.1, crypto: -0.2 }
    assert.deepEqual(applyAgeModifiers(base, 2, rules).finalReturns, { bond: 0.1, fund: -0.05, stock: -0.15, crypto: -0.25 })
    assert.deepEqual(applyAgeModifiers(base, 3, rules).finalReturns, { bond: 0.1, fund: -0.05, stock: -0.2, crypto: -0.3 })
  })

  test('คลื่นตามย้ำเฉพาะขาดทุนครึ่งหนึ่งและไม่แจกกำไรซ้ำ', () => {
    const result = applyEventReturns(EVEN_SPLIT, getEvent('inflation'), { scale: 0.5, negativeOnly: true })
    assert.deepEqual(result.positions, { bond: 95, fund: 100, stock: 100, crypto: 100 })
  })

  test('ผลตอบแทนไม่ทำให้มูลค่าติดลบ', () => {
    for (const event of getMainEvents()) {
      for (const value of Object.values(applyEventReturns(EVEN_SPLIT, event).positions)) assert.ok(value >= 0)
    }
  })
})
