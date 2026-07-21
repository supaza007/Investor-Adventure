// รัน: npm test
//
// เทสต์ชุดนี้ไม่ได้เช็คแค่ว่าโค้ดไม่พัง แต่เช็คว่า "เกมสอนสิ่งที่ตั้งใจจะสอนจริงไหม"
// เกมเดิมพังเพราะไม่มีใครรู้ว่า decision space ยุบเป็น 0 จนกระทั่ง playtest กับคนจริง

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { getEvent, getMainEvents } from './data/events.js'
import { getTools, getTool, TAGS } from './data/tools.js'
import { getStyles } from './data/styles.js'
import { concentration, hhi, weights, totalValue, rebalance, applyGrowth } from './portfolio.js'
import { portfolioExposure, outcomeBand, rollShock, applyShock, toolExposure } from './encounter.js'

const EVEN_SPLIT = { bond: 100, esg: 100, fund: 100, stock: 100, derivatives: 100, crypto: 100 }
const ALL_BOND = { bond: 600 }
const ALL_CRYPTO = { crypto: 600 }

describe('ความสมบูรณ์ของข้อมูล', () => {
  // 11 ตัว = เหตุการณ์ประจำบทที่กระแทกพอร์ตผ่าน tag — ไม่นับ Scammer ที่เป็นอีเวนต์เสริมคนละกลไก
  test('เหตุการณ์ประจำบทครบ 11 ตัวและ tagWeights รวมได้ 1.0 เสมอ', () => {
    const events = getMainEvents()
    assert.equal(events.length, 11)
    for (const e of events) {
      const sum = Object.values(e.tagWeights).reduce((s, x) => s + x, 0)
      assert.ok(Math.abs(sum - 1) < 1e-9, `${e.id} tagWeights รวมได้ ${sum} ไม่ใช่ 1.0`)
      for (const tag of Object.keys(e.tagWeights)) {
        assert.ok(TAGS.includes(tag), `${e.id} มี tag ที่ไม่รู้จัก: ${tag}`)
      }
    }
  })

  test('เครื่องมือครบ 6 ชนิด มี exposure ครบทุก tag ในช่วง 0..1', () => {
    const tools = getTools()
    assert.equal(tools.length, 6)
    for (const t of tools) {
      for (const tag of TAGS) {
        const v = t.exposure[tag]
        assert.ok(typeof v === 'number', `${t.id} ขาด exposure.${tag}`)
        assert.ok(v >= 0 && v <= 1, `${t.id}.${tag} = ${v} หลุดช่วง 0..1`)
      }
      assert.ok(t.growthMult > 1, `${t.id} growthMult ต้อง > 1`)
    }
  })

  test('มีสไตล์เริ่มต้นเพียงหนึ่งเดียว', () => {
    assert.equal(getStyles().filter((s) => s.isDefault).length, 1)
  })
})

describe('คณิตศาสตร์พอร์ต', () => {
  test('พอร์ตว่างไม่ทำให้เกิด NaN', () => {
    assert.equal(totalValue({}), 0)
    assert.deepEqual(weights({}), {})
    assert.equal(concentration({}), 0)
  })

  test('HHI: ทุ่มตัวเดียว = 1 · กระจายครบ 6 = 1/6', () => {
    assert.equal(hhi(ALL_BOND), 1)
    assert.ok(Math.abs(hhi(EVEN_SPLIT) - 1 / 6) < 1e-9)
  })

  test('concentration ปรับสเกลเป็น 0..1 ตามที่สูตร band ต้องการ', () => {
    assert.equal(concentration(ALL_BOND), 1)
    assert.ok(Math.abs(concentration(EVEN_SPLIT)) < 1e-9)
    // ครึ่งๆ สองชนิด อยู่ระหว่างกลาง
    const half = concentration({ bond: 300, stock: 300 })
    assert.ok(half > 0 && half < 1)
  })

  test('rebalance หักค่าธรรมเนียมจากมูลค่าที่ย้ายจริง ไม่ใช่จากทั้งพอร์ต', () => {
    // ย้ายครึ่งพอร์ต (100 จาก 200) ค่าธรรมเนียม 2% → เสีย 2 ไม่ใช่ 4
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
    // ตราสารหนี้ growthMult 1.2 → ผลตอบแทน 20% · ระยะยาว 1.15 → 23% ไม่ใช่ 38%
    const grown = applyGrowth({ bond: 100 }, 1.15)
    assert.ok(Math.abs(grown.bond - 123) < 1e-9)
  })
})

describe('Encounter Engine — บทเรียนที่สูตรต้องสอนให้ได้', () => {
  const inflationEvent = getEvent('inflation')

  test('ตราสารหนี้ต้องอ่อนแอต่อเงินเฟ้อจริง (ถ้าเทสต์นี้ตก เกมจะมีเฉลยตายตัวและน่าเบื่อ)', () => {
    const bond = getTool('bond')
    const worstTag = TAGS.reduce((a, b) => (bond.exposure[a] > bond.exposure[b] ? a : b))
    assert.equal(worstTag, 'inflation', 'จุดอ่อนที่สุดของตราสารหนี้ต้องเป็นเงินเฟ้อ')
    assert.ok(bond.exposure.inflation > 0.5)
  })

  test('พอร์ตกระจายเจ็บน้อยกว่าพอร์ตกระจุกที่โดนตรงจุดอ่อน', () => {
    const spread = outcomeBand(EVEN_SPLIT, inflationEvent)
    const concentrated = outcomeBand(ALL_BOND, inflationEvent)
    assert.ok(
      concentrated.center < spread.center,
      'พอร์ต 100% ตราสารหนี้ต้องเจ็บกว่าพอร์ตกระจาย เมื่อเจอเงินเฟ้อ',
    )
  })

  test('พอร์ตกระจาย = ช่วงผลลัพธ์แคบ (คาดเดาได้) · พอร์ตกระจุก = ช่วงกว้าง (ดวงล้วน)', () => {
    const spread = outcomeBand(EVEN_SPLIT, inflationEvent)
    const concentrated = outcomeBand(ALL_CRYPTO, inflationEvent)
    const widthOf = (b) => b.max - b.min
    assert.ok(widthOf(concentrated) > widthOf(spread) * 2)
  })

  test('ไม่มีเครื่องมือไหนปลอดภัยทุกเหตุการณ์ — ทุกชิ้นต้องมีเหตุการณ์ที่เป็นจุดตายของมัน', () => {
    // นี่คือเสาหลักข้อ 3 "ไม่มีเฉลยสมบูรณ์แบบ" ในรูปเทสต์
    for (const tool of getTools()) {
      const worst = Math.max(...getMainEvents().map((e) => toolExposure(tool.id, e)))
      assert.ok(worst > 0.3, `${tool.name} ไม่มีจุดตายเลย (แย่สุดแค่ ${worst.toFixed(2)}) → กลายเป็นเฉลยตายตัว`)
    }
  })

  test('Black Swan เลี่ยงไม่ได้จริง — กระจายดีแค่ไหนก็ช่วยไม่ได้', () => {
    const spread = outcomeBand(EVEN_SPLIT, inflationEvent, { isBlackSwan: true })
    const concentrated = outcomeBand(ALL_BOND, inflationEvent, { isBlackSwan: true })
    assert.equal(spread.center, concentrated.center)
  })

  test('สไตล์ระยะยาวหน่วงแรงกระแทกได้จริง', () => {
    const normal = outcomeBand(EVEN_SPLIT, inflationEvent, { styleShockMult: 1 })
    const longterm = outcomeBand(EVEN_SPLIT, inflationEvent, { styleShockMult: 0.8 })
    assert.ok(longterm.center > normal.center)
  })

  test('ผลที่สุ่มได้ต้องอยู่ในช่วง band เสมอ และ percentile ตรงกับตำแหน่งในช่วง', () => {
    const band = outcomeBand({ bond: 50, stock: 50 }, inflationEvent)
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { shockPct, percentile } = rollShock(band, () => roll)
      assert.ok(shockPct >= band.min - 1e-9 && shockPct <= band.max + 1e-9)
      assert.equal(percentile, roll)
    }
  })
})

describe('การลงแรงกระแทกกับพอร์ตจริง', () => {
  const inflationEvent = getEvent('inflation')

  test('ในพอร์ตเดียวกัน ชิ้นที่อ่อนไหวกว่าต้องเจ็บกว่า', () => {
    const before = { bond: 100, crypto: 100 }
    const after = applyShock(before, inflationEvent, -0.2)
    const bondLoss = 1 - after.bond / before.bond
    const cryptoLoss = 1 - after.crypto / before.crypto
    assert.ok(bondLoss > cryptoLoss, 'เจอเงินเฟ้อ ตราสารหนี้ต้องเจ็บกว่าคริปโต')
  })

  test('เฉพาะเลเวอเรจ/คริปโตเท่านั้นที่ตกถึง 0 ได้ (ล้มละลายจริง)', () => {
    const wiped = applyShock({ crypto: 100, derivatives: 100, stock: 100 }, inflationEvent, -5)
    assert.equal(wiped.crypto, 0)
    assert.equal(wiped.derivatives, 0)
    assert.ok(wiped.stock > 0, 'หุ้นดัชนีไม่ควรเป็นศูนย์ ต่อให้เจอวิกฤตหนักแค่ไหน')
  })

  // เดินผ่านท่อจริง (band → roll → shock) ไม่ยัด shockPct มือเปล่า
  // เพราะแรงกระแทกที่พอร์ตหนึ่งจะเจอ ถูกกำหนดโดยพอร์ตนั้นเอง — ยัดเลขมั่วจะได้ผลที่เป็นไปไม่ได้ในเกมจริง
  const worstCase = (positions, event) => {
    const band = outcomeBand(positions, event)
    const { shockPct } = rollShock(band, () => 0) // roll = 0 → แย่สุดเท่าที่ band อนุญาต
    return applyShock(positions, event, shockPct)
  }

  test('margin call ฆ่าเฉพาะก้อนที่ใช้เลเวอเรจ พอร์ตที่เหลือรอด — นี่คือรางวัลของการกระจาย', () => {
    const before = { bond: 90, crypto: 10 }
    const after = worstCase(before, getEvent('fear'))
    assert.equal(after.crypto, 0, 'ก้อนคริปโตควรโดนบังคับขายหมดเมื่อเจอความกลัว')
    assert.ok(after.bond > 80, 'ตราสารหนี้แทบไม่กระทบ เพราะความกลัวไม่ใช่จุดอ่อนของมัน')
    // ถือสินทรัพย์ที่ตายสนิทอยู่ในพอร์ต แต่เสียรวมไม่ถึง 20% — เทียบกับทุ่มคริปโตล้วนที่หมดตัว
    assert.ok(totalValue(after) > 0.8 * totalValue(before))
  })

  test('ทุ่มเลเวอเรจสุดตัวแล้วเจอวิกฤตแรง = หมดตัวจริง', () => {
    // ความโลภ (สภาพคล่อง 0.6 + จิตวิทยา 0.4, severity 0.30) คือจุดตายของคริปโต
    const after = worstCase({ crypto: 100 }, getEvent('greed'))
    assert.equal(totalValue(after), 0, 'ทุ่มคริปโตล้วนเจอฟองสบู่ความโลภในกรณีแย่สุด ต้องหมดตัวได้จริง')
  })

  test('พอร์ตกระจายไม่มีวันหมดตัว ต่อให้เจอกรณีแย่สุดของทุกเหตุการณ์', () => {
    for (const e of getMainEvents()) {
      const after = worstCase(EVEN_SPLIT, e)
      assert.ok(totalValue(after) > 0.5 * totalValue(EVEN_SPLIT), `${e.name} ทำพอร์ตกระจายเสียหายเกินครึ่ง`)
    }
  })

  test('แรงกระแทกไม่ทำให้เกิดมูลค่าติดลบ', () => {
    for (const e of getMainEvents()) {
      const after = applyShock(EVEN_SPLIT, e, -1)
      for (const [id, v] of Object.entries(after)) {
        assert.ok(v >= 0, `${id} ติดลบหลังเจอ ${e.id}`)
      }
    }
  })
})
