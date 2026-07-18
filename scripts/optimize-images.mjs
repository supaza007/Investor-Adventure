// รัน: npm run optimize-images
//
// แปลงรูปในเกมให้เล็กลงสำหรับการเอาขึ้นเว็บ โดยที่คนเล่นไม่เห็นความต่าง
//   - GIF เคลื่อนไหว → WebP เคลื่อนไหว (เล่นใน <img> ได้เหมือนเดิม ไม่ต้องแก้โค้ด)
//   - JPG/PNG → WebP · WebP ที่ใหญ่เกินจำเป็น → บีบซ้ำ
//
// ทำไมต้องมี: รูปทุกใบถูกฝังเป็น base64 ในไฟล์ HTML เดียว ทำให้ build บวมเป็น 3.6 MB
// ผู้เล่นบนเว็บต้องรอโหลดครบก่อนถึงจะเห็นอะไรเลย — บนเน็ตมือถือคือจอขาวหลายวินาที
//
// ปลอดภัยกับไฟล์เดิม: จะไม่ทับไฟล์ .webp ที่มีอยู่แล้วซึ่งมาจากต้นฉบับคนละไฟล์
// (เช่น longterm.gif กับ longterm.webp อยู่ด้วยกัน — ตัว .webp คือตัวที่เกมใช้จริง ห้ามทับ)

import sharp from 'sharp'
import { readdir, unlink, writeFile, access, readFile } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// รวม src/assets ตัวบนสุดด้วย เพราะโลโก้/พื้นหลังหน้าปกคือรูปที่โหลดทันทีตอนเปิดเว็บ
// (title-logo.png เคยหนัก 308K = ของหนักที่สุดในการโหลดครั้งแรก)
const DIRS = ['src/assets', 'src/assets/characters', 'src/assets/events']

const QUALITY = 72 // จุดที่ตาคนแทบแยกไม่ออกแต่ไฟล์เล็กลงมาก
// กรอบภาพใหญ่สุดในเกมคือ 160px (Portrait size="lg") — เก็บ 400px เผื่อจอ retina 2x ก็เกินพอแล้ว
const MAX_WIDTH = 400

// ยกเว้นภาพหน้าปกที่แสดงใหญ่กว่ากรอบตัวละครมาก ถ้าย่อเหลือ 400px จะเบลอชัดเจน
//   title-bg   = พื้นหลังเต็มจอ (background-size: cover)
//   title-logo = โลโก้กว้างสุด 620px ตาม w-[min(80vw,620px)]
const WIDTH_OVERRIDE = {
  'title-bg': 1600,
  'title-logo': 900,
}

const kb = (b) => `${Math.round(b / 1024)}K`
const exists = (p) => access(p).then(() => true, () => false)

async function optimize(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (!['.gif', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null

  const outPath = join(dirname(filePath), `${basename(filePath, ext)}.webp`)

  // อ่านเข้าหน่วยความจำก่อนเสมอ — ถ้าให้ sharp เปิดไฟล์เอง มันจะจับ handle ค้างไว้
  // แล้วการเขียนทับไฟล์เดิมบน Windows จะล้มด้วย EPERM/UNKNOWN
  const input = await readFile(filePath)
  const before = input.length

  // กันทับ: ถ้าจะแปลง x.gif → x.webp แต่ x.webp มีอยู่แล้ว แปลว่าไฟล์ .webp นั้นคือตัวที่เกมใช้
  if (ext !== '.webp' && (await exists(outPath))) {
    return { file: filePath, before, after: 0, collision: true }
  }

  // ⚠️ ต้องเปิด animated เสมอ ห้ามเดาจากนามสกุล
  // เคยเขียนว่า `animated: (ext === '.gif')` ผลคือพอรันซ้ำกับ .webp เคลื่อนไหวที่แปลงไปแล้ว
  // sharp จะอ่านแค่เฟรมแรกแล้วเขียนทับเป็นภาพนิ่ง — แอนิเมชันหายถาวรโดยดูเหมือน "บีบได้ −99%"
  // ภาพนิ่งใส่ animated: true ก็ไม่มีผลอะไร (มันมีหน้าเดียวอยู่แล้ว) จึงปลอดภัยกว่า
  const image = sharp(input, { animated: true })
  const meta = await image.metadata()
  const isAnimated = (meta.pages ?? 1) > 1

  // ภาพเคลื่อนไหวเก็บทุกเฟรมต่อกันในแนวตั้ง — ย่อตามความกว้างเท่านั้น
  const maxWidth = WIDTH_OVERRIDE[basename(filePath, ext)] ?? MAX_WIDTH
  const pipeline = meta.width > maxWidth ? image.resize({ width: maxWidth }) : image
  const buffer = await pipeline.webp({ quality: QUALITY, effort: 6 }).toBuffer()

  // บีบแล้วไม่เล็กลงก็ไม่ต้องเปลี่ยน (ไฟล์ที่บีบมาดีอยู่แล้ว)
  if (buffer.length >= before) return { file: filePath, before, after: before, skipped: true }

  // กันแอนิเมชันพัง: วัดที่ "ความยาวรวม" ไม่ใช่ "จำนวนเฟรม"
  // เพราะ libwebp รวมเฟรมที่ซ้ำกันแล้วยืดเวลาชดเชย (208 เฟรม → 186 เฟรม แต่ยาว 6.24 วิ เท่าเดิม)
  // ซึ่งภาพที่เห็นเหมือนเดิมทุกประการ ถ้าเช็คจำนวนเฟรมจะปฏิเสธการบีบที่ดีทิ้งไปเปล่าๆ
  // แต่ถ้า "ความยาว" เปลี่ยน แปลว่าเฟรมหายจริงและแอนิเมชันจะเล่นเร็วผิดปกติ — อันนั้นต้องกัน
  const totalDelay = (d) => (d ?? []).reduce((a, b) => a + b, 0)
  const outMeta = await sharp(buffer, { animated: true }).metadata()
  const driftMs = Math.abs(totalDelay(meta.delay) - totalDelay(outMeta.delay))
  if (driftMs > 100) {
    return { file: filePath, before, after: before, framesLost: true, driftMs }
  }

  await writeFile(outPath, buffer)
  if (ext !== '.webp') await unlink(filePath) // ต้นฉบับนามสกุลเดิมไม่ต้องเก็บ ไม่งั้น repo บวม

  return { file: filePath, before, after: buffer.length, animated: isAnimated, pages: meta.pages ?? 1 }
}

const results = []
for (const dir of DIRS) {
  const full = join(ROOT, dir)
  let files = []
  try {
    files = await readdir(full)
  } catch {
    continue
  }
  for (const f of files.sort()) {
    const r = await optimize(join(full, f))
    if (r) results.push(r)
  }
}

results.sort((a, b) => b.before - a.before)

let totalBefore = 0
let totalAfter = 0
console.log('\nไฟล์'.padEnd(38) + 'ก่อน'.padStart(8) + 'หลัง'.padStart(8) + 'ผล'.padStart(24))
console.log('─'.repeat(78))
for (const r of results) {
  totalBefore += r.before
  totalAfter += r.after
  const note = r.collision
    ? '⚠️ ข้าม (มี .webp อยู่แล้ว)'
    : r.framesLost
      ? `⚠️ ข้าม (ยาวเพี้ยน ${r.driftMs}ms)`
      : r.skipped
        ? 'ข้าม (เล็กพออยู่แล้ว)'
        : `−${Math.round((1 - r.after / r.before) * 100)}%${r.animated ? ` (${r.pages} เฟรม)` : ''}`
  console.log(basename(r.file).padEnd(38) + kb(r.before).padStart(8) + kb(r.after).padStart(8) + note.padStart(24))
}
console.log('─'.repeat(78))
console.log('รวมที่แปลงได้'.padEnd(38) + kb(totalBefore).padStart(8) + kb(totalAfter).padStart(8))

const collisions = results.filter((r) => r.collision)
if (collisions.length) {
  console.log(`\n⚠️  ข้าม ${collisions.length} ไฟล์เพราะมี .webp ชื่อเดียวกันอยู่แล้ว:`)
  for (const c of collisions) console.log(`   ${basename(c.file)} (${kb(c.before)}) — ถ้าไม่ได้ใช้ ลบทิ้งได้เลย`)
}
console.log('\nถ้ามีนามสกุลไฟล์เปลี่ยน ต้องอัปเดต import ใน src/components/art.js ให้ตรง\n')
