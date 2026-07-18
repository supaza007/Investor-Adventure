// ตัวสุ่มที่กำหนด seed ได้ (mulberry32)
//
// ทำไมไม่ใช้ Math.random ตรงๆ: reducer ของ React ต้องเป็น pure function
// ถ้าสุ่มข้างในโดยตรง เกมจะ replay ไม่ได้ เทสต์ไม่ได้ และ React Strict Mode ที่เรียก reducer ซ้ำ
// จะได้ผลคนละอย่างทุกครั้ง — seed จึงถูกเก็บใน state และเดินหน้าไปพร้อมกับเกม

export function rngFrom(seed) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // เก็บ seed ปัจจุบันกลับเข้า state หลังใช้เสร็จ เพื่อให้ครั้งหน้าสุ่มต่อจากเดิม ไม่ใช่ซ้ำเดิม
  next.getSeed = () => s >>> 0
  return next
}

export function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
