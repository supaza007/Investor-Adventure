const SIZES = {
  xs: 'h-5 w-5 sm:h-6 sm:w-6',
  sm: 'h-12 w-12 sm:h-14 sm:w-14',
  md: 'h-20 w-20 sm:h-28 sm:w-28',
  lg: 'h-28 w-28 sm:h-40 sm:w-40',
  fill: 'h-full w-full', // เต็มกล่องที่ parent กำหนด — ใช้ตอนวางเลย์เอาต์เอง (เช่น StyleSelect คอลัมน์ซ้าย)
}

const LABEL_TEXT = {
  xs: 'text-[9px] sm:text-[10px]',
  sm: 'text-lg sm:text-xl',
  md: 'text-3xl sm:text-4xl',
  lg: 'text-4xl sm:text-5xl',
  fill: 'text-4xl sm:text-6xl',
}

// กรอบภาพพิกเซลมาตรฐาน — ใช้แสดงภาพตัวละคร/เหตุการณ์ที่ผู้ใช้อัปโหลด
// พื้นหลังของแต่ละภาพต้นฉบับไม่เท่ากัน (ขาว/ดำ/เทา/สี) จึงปล่อยให้เป็น "ฉากหลังในกรอบ" แทนที่จะพยายามลบทิ้ง
// เหมือนช่องรูปมอนสเตอร์ในเกม JRPG — กรอบพิกเซลหนาทำให้ดูตั้งใจแม้พื้นหลังภาพต่างกัน
// fit: 'contain' (ค่าเริ่มต้น, เห็นภาพเต็มไม่ครอป) หรือ 'cover' (เต็มกรอบ ไม่มีขอบเหลือ แต่ครอปได้)
// objectPosition: จุดยึดตอนครอป — ใช้ตอน fit='cover' กับภาพที่ครอปกลางแล้วเสียองค์ประกอบ (เช่น หัวโดนตัด)
export default function Portrait({ src, alt, size = 'md', className = '', fit = 'contain', objectPosition = 'center' }) {
  if (!src) return null
  return (
    <div className={`pixel-frame shrink-0 overflow-hidden bg-black/30 ${SIZES[size]} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
        style={{ imageRendering: 'pixelated', objectPosition }}
      />
    </div>
  )
}

// ใช้แทน Portrait ตอนไม่มีไฟล์ภาพ (เช่นเวอร์ชันที่ deploy ขึ้นเว็บ ซึ่งไม่ได้แนบรูปมาด้วย)
//
// แสดง emoji ประจำตัวก่อนเสมอ เพราะทุกเหตุการณ์/เครื่องมือมี emoji อยู่ในไฟล์ data อยู่แล้ว
// และ emoji ถูกวาดโดยเครื่องของคนดูเอง เราไม่ได้แจกจ่ายไฟล์ภาพ จึงไม่มีปัญหาลิขสิทธิ์
// ถ้าไม่ส่ง emoji มาด้วยค่อยถอยไปใช้ตัวอักษรแรกของชื่อ
export function PortraitPlaceholder({ label, emoji, size = 'md', className = '' }) {
  return (
    <div className={`pixel-frame flex shrink-0 items-center justify-center bg-slate-800 font-black text-white/60 ${SIZES[size]} ${LABEL_TEXT[size]} ${className}`}>
      {emoji ?? label?.trim()?.[0] ?? '·'}
    </div>
  )
}
