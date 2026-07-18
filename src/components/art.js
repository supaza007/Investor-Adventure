// ภาพประกอบสไตล์นักลงทุน + เหตุการณ์
//
// ⚠️ ไม่ import ไฟล์ตรงๆ โดยตั้งใจ — ใช้ import.meta.glob สแกนว่ามีไฟล์อะไรอยู่บ้างตอน build
// เหตุผล: รูปในโฟลเดอร์นี้ไม่ถูก commit ขึ้น git (ดู .gitignore) เพราะเป็นรูปที่ยังไม่มีสิทธิ์เผยแพร่
//
//   - เครื่องที่มีไฟล์รูป (เครื่องคุณ / ตอน build .exe) → เกมใช้รูปจริง
//   - เครื่องที่ไม่มี (GitHub Actions ตอน deploy ขึ้นเว็บ) → เกม fallback ไปใช้ emoji อัตโนมัติ
//
// ถ้า import ตรงๆ แบบเดิม build บน GitHub จะพังทันทีเพราะหาไฟล์ไม่เจอ
// วิธีนี้ทำให้โค้ดชุดเดียวใช้ได้ทั้งสองที่ โดยไม่ต้องแยกสาขาหรือแก้ไฟล์ก่อน deploy ทุกครั้ง
//
// เวลาเพิ่มรูปใหม่: วางไฟล์ชื่อ <id>.webp ลงในโฟลเดอร์ให้ตรงกับ id ใน data/ แล้วรัน
// `npm run optimize-images` — ไม่ต้องแก้ไฟล์นี้เลย

const CHARACTER_FILES = import.meta.glob('../assets/characters/*.{webp,gif,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const EVENT_FILES = import.meta.glob('../assets/events/*.{webp,gif,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

// '../assets/events/inflation.webp' → 'inflation'
const idOf = (path) => path.split('/').pop().replace(/\.[^.]+$/, '')

const byId = (files) => Object.fromEntries(Object.entries(files).map(([path, url]) => [idOf(path), url]))

export const CHARACTER_ART = byId(CHARACTER_FILES)
export const EVENT_ART = byId(EVENT_FILES)

export const characterArtOf = (id) => CHARACTER_ART[id] ?? null
export const eventArtOf = (id) => EVENT_ART[id] ?? null

// มีรูปครบไหม — ใช้ตอน debug ว่าทำไมบางจอขึ้น emoji แทนรูป
export const hasArt = () => Object.keys(EVENT_ART).length > 0
