import { useState } from 'react'
import { getStyles } from '../game/engine/data/styles.js'
import { BALANCE } from '../game/engine/balance.js'
import Portrait, { PortraitPlaceholder } from './Portrait'
import { characterArtOf } from './art'

const STYLE_GRAD = {
  medium: 'from-sky-900/60 to-sky-950 border-sky-500/50',
  longterm: 'from-emerald-900/60 to-emerald-950 border-emerald-500/50',
  trader: 'from-rose-900/60 to-rose-950 border-rose-500/50',
  vi: 'from-amber-900/60 to-amber-950 border-amber-500/50',
}

// ตำแหน่งครอปตอน object-fit: cover — วัดจาก bounding box จริงของแต่ละภาพแล้วพบว่า
// กรอบซ้าย (แคบ+สูง) ครอปแนวตั้งเป็นหลักกับภาพทั้ง 4 ใบ จึงเอียงไปทาง "top" เพื่อรักษาหน้า/หัว
// ไว้ก่อน ยอมเสียเท้า/ขาส่วนล่างแทน — vi.webp โดนครอปหนักสุด (เข้าเนื้อตัวละครถึง ~146px
// ถ้า center) ส่วน trader.webp ตัวละครไม่อยู่กึ่งกลาง canvas เลยเบี่ยงแนวนอนด้วย
const PORTRAIT_POSITION = {
  medium: 'center top',
  longterm: 'center top',
  trader: '38% top',
  vi: 'center top',
}

const adjustLabel = (style) => {
  const points = style.canAdjustAt.filter((p) => p !== 'allocation')
  if (points.length === 0) return 'ตั้งพอร์ตต้นบทได้ครั้งเดียว แล้วห้ามแตะจนจบบท'
  const names = points.map((n) => BALANCE.stages.find((s) => s.n === n)?.label).filter(Boolean)
  return `ปรับกลางบทได้ที่: ${names.join(' · ')}`
}

// เลขบวก = ดีเสมอ (กฎขั้วเดียวกันทั้ง "กำไรเฉลี่ย" และ "ป้องกันความเสี่ยง")
// ไม่บังคับให้เป็นบวก — สไตล์ที่ค่าติดลบจริง (เช่น เทรดเดอร์ overtrading) ต้องเห็นค่าติดลบสีแดง
const signedPct = (n) => `${n >= 0 ? '+' : ''}${n}%`

// คำอธิบายใต้ตัวเลข "กำไรเฉลี่ย" — เทียบกับนักลงทุนระยะกลางซึ่งเป็นค่ามาตรฐาน (returnMult 1.0)
// ห้ามปัดเป็นคำกลางๆ ให้เทรดเดอร์: สไตล์นี้ถูกออกแบบให้เป็นกับดักที่ตั้งใจให้แพ้ค่ามาตรฐานจริงๆ
// (returnMult 0.85 + ค่าธรรมเนียมสะสม) ต้องบอกตรงๆ ว่า "จนกว่า" ไม่ใช่ปัดเป็น "จุดอ่อน" ลอยๆ
const gainCaption = (style, gainPct) => {
  if (style.id === 'medium') return 'ค่ามาตรฐานที่สไตล์อื่นเทียบด้วย'
  const n = Math.abs(gainPct)
  if (gainPct > 0) return `รวยกว่าสายกลาง ${n}% ตอนจบเกม`
  if (gainPct < 0) return `จนกว่าสายกลาง ${n}% ตอนจบเกม${style.tradeFeePct ? ' (ยังไม่รวมค่าธรรมเนียมที่กัดเพิ่ม)' : ''}`
  return 'เท่ากับสายกลาง'
}

// คำอธิบายใต้ตัวเลข "ป้องกันความเสี่ยง" — เทียบกับฐาน shockMult 1.0 (รับแรงกระแทกเต็มๆ)
const defenseCaption = (style, defensePct) => {
  if (style.id === 'medium') return 'ค่ามาตรฐานที่สไตล์อื่นเทียบด้วย'
  if (defensePct > 0) return `เสียหายน้อยกว่าปกติ ${defensePct}% เวลาเจอวิกฤต`
  if (defensePct < 0) return `รับแรงกระแทกหนักกว่าปกติ ${Math.abs(defensePct)}% เวลาเจอวิกฤต`
  return 'รับแรงกระแทกเท่าคนทั่วไป ไม่มีการป้องกันพิเศษ'
}

// ●●●○○ จากจำนวนจุดที่ปรับพอร์ตได้ (รวมจุดจัดพอร์ตต้นบท) — ยิ่งปรับได้บ่อย ยิ่งเต็มดวง
// จุดติดสีทอง จุดว่างสีเทาจาง จึงต้องแยกสีเป็นสอง span แทนที่จะเป็น string เดียว
function FreqDots({ n }) {
  const filled = Math.max(1, Math.min(5, n))
  return (
    <span className="tracking-widest">
      <span className="text-amber-400">{'●'.repeat(filled)}</span>
      <span className="text-white/20">{'○'.repeat(5 - filled)}</span>
    </span>
  )
}

// การ์ดเล็กในแถบเทียบ 4 สไตล์ด้านบน — ภาพต้องนิ่ง ไม่มี animation แย่งโฟกัสตอนเทียบตัวเลข
// (medium.gif เป็นไฟล์ GIF เคลื่อนไหวในตัวเอง เล่นเองโดยเบราว์เซอร์ ไม่ผูกกับ CSS ใดๆ ที่นี่)
function CompareCard({ style, selected, onClick }) {
  const art = characterArtOf(style.id)
  const gainPct = Math.round((style.returnMult - 1) * 100)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`pixel-frame flex flex-col items-center gap-0.5 border bg-gradient-to-b p-1 text-center transition-opacity sm:p-1.5 ${STYLE_GRAD[style.id]} ${
        selected ? 'outline outline-2 outline-offset-2 outline-yellow-400 sm:outline-[3px]' : 'opacity-60 hover:opacity-90'
      }`}
    >
      {art ? (
        <Portrait src={art} alt={style.name} size="sm" fit="cover" objectPosition={PORTRAIT_POSITION[style.id]} className="pointer-events-none" />
      ) : (
        <PortraitPlaceholder label={style.name} emoji={style.emoji} size="sm" />
      )}
      <div className="mt-0.5 truncate text-[8px] font-bold leading-tight sm:text-[10px]">{style.name}</div>
      <FreqDots n={style.canAdjustAt.length} />
      <div className={`text-[8px] font-bold sm:text-[10px] ${gainPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signedPct(gainPct)}</div>
    </button>
  )
}

// กล่องสถิติหลัก — ใหญ่ เด่น อยู่คู่กับโซนภาพตัวละคร เป็นสิ่งแรกที่ต้องเห็นก่อนตัดสินใจ
// caption = ประโยคแปลตัวเลขเทียบกับสายกลาง อยู่ใต้ตัวเลขตัวเล็กจาง — ใช้เฉพาะกล่องที่มีค่าตัวเลข
function StatBox({ label, value, tone, caption, children }) {
  const toneCls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-white'
  return (
    <div className="pixel-chip flex flex-1 flex-col items-center justify-center gap-1 bg-black/30 px-1.5 py-1.5 text-center sm:py-2">
      <div className="text-[8px] uppercase tracking-wide text-white/50 sm:text-[10px]">{label}</div>
      {value !== undefined ? <div className={`text-base font-black sm:text-2xl ${toneCls}`}>{value}</div> : children}
      {caption && <div className="text-[8px] leading-snug text-white/50 sm:text-[10px]">{caption}</div>}
    </div>
  )
}

// เลือกสไตล์นักลงทุน — แทนหน้าเลือกคลาสเดิม
// ต่างจากเดิมตรงที่สไตล์ไม่ได้ผูกกับสินทรัพย์: ทุกสไตล์ซื้อเครื่องมือไหนก็ได้ ต่างกันแค่ "วิธีเล่น"
export default function StyleSelect({ onSelect }) {
  const styles = getStyles()
  const [index, setIndex] = useState(styles.findIndex((s) => s.isDefault))
  const style = styles[index]

  const prev = () => setIndex((i) => (i - 1 + styles.length) % styles.length)
  const next = () => setIndex((i) => (i + 1) % styles.length)

  const art = characterArtOf(style.id)
  const gainPct = Math.round((style.returnMult - 1) * 100)
  const defensePct = Math.round((1 - style.shockMult) * 100)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-[108rem] flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-4">
        <header className="mb-2 shrink-0 text-center">
          <p className="game-subtitle text-xs sm:text-base">คุณเป็นนักลงทุนแบบไหน?</p>
          <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">
            ทุกแบบซื้อสินทรัพย์ได้เหมือนกันหมด — ต่างกันที่ว่าคุณ "แตะพอร์ตได้บ่อยแค่ไหน"
          </p>
        </header>

        {/* แถบเทียบ 4 สไตล์พร้อมกัน — คลิกใบไหนก็ตั้งเป็นสไตล์ที่เลือกอยู่ */}
        <div className="mb-2 grid shrink-0 grid-cols-4 gap-1 sm:gap-2">
          {styles.map((s, i) => (
            <CompareCard key={s.id} style={s} selected={i === index} onClick={() => setIndex(i)} />
          ))}
        </div>

        <div key={style.id} className="slide-in flex min-h-0 flex-1 flex-col gap-2">
          <div className={`pixel-frame flex min-h-0 flex-1 flex-col overflow-y-auto border bg-gradient-to-b p-2.5 sm:p-4 ${STYLE_GRAD[style.id]}`}>
            {/* 1. ชื่อสไตล์ + badge */}
            <div className="shrink-0 text-base font-bold sm:text-xl">{style.name}</div>
            {style.isDefault && <div className="shrink-0 text-[9px] text-white/50 sm:text-[11px]">แนะนำสำหรับเล่นครั้งแรก</div>}
            <p className="mt-1 shrink-0 text-[11px] leading-relaxed text-white/80 sm:text-xs">{style.tagline}</p>

            {/* 2+3. โซนภาพตัวละคร (ซ้าย) คู่กับแถวสถิติหลัก (ขวา) — สิ่งแรกที่ต้องเห็นก่อนตัดสินใจ */}
            <div className="mt-2.5 flex shrink-0 gap-2 sm:mt-3 sm:gap-3">
              <div className={`pixel-frame sprite-bob h-24 w-24 shrink-0 overflow-hidden border bg-gradient-to-b sm:h-36 sm:w-36 ${STYLE_GRAD[style.id]}`}>
                {art ? (
                  <Portrait src={art} alt={style.name} size="fill" fit="cover" objectPosition={PORTRAIT_POSITION[style.id]} />
                ) : (
                  <PortraitPlaceholder label={style.name} emoji={style.emoji} size="fill" />
                )}
              </div>

              <div className="grid flex-1 grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-1.5">
                <StatBox label="ปรับพอร์ตได้/ครั้ง">
                  <FreqDots n={style.canAdjustAt.length} />
                </StatBox>
                <StatBox
                  label="กำไรเฉลี่ย"
                  value={signedPct(gainPct)}
                  tone={gainPct >= 0 ? 'good' : 'bad'}
                  caption={gainCaption(style, gainPct)}
                />
                <StatBox
                  label="ป้องกันความเสี่ยง"
                  value={signedPct(defensePct)}
                  tone={defensePct >= 0 ? 'good' : 'bad'}
                  caption={defenseCaption(style, defensePct)}
                />
              </div>
            </div>

            {/* 4. เส้นคั่น แล้วตามด้วยเนื้อหารอง — ฟอนต์เล็กลง ไม่แข่งกับสถิติหลักด้านบน */}
            <div className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-snug sm:mt-3 sm:pt-3 sm:text-[11px]">
              <p className="italic text-white/70">{style.persona}</p>

              <div className="pixel-chip mt-2 bg-black/40 p-1.5 text-white/80">{adjustLabel(style)}</div>

              <div className="mt-2 space-y-0.5">
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-emerald-300">✓</span>
                  <span className="text-white/80">{style.pros}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-rose-300">✗</span>
                  <span className="text-white/80">{style.cons}</span>
                </div>
              </div>

              {(style.tradeFeePct || style.buyDipMult) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {style.tradeFeePct && (
                    <span className="pixel-chip bg-black/30 px-1.5 py-0.5">
                      ค่าธรรมเนียม <b className="text-rose-300">{(style.tradeFeePct * 100).toFixed(0)}%</b>/ครั้ง
                    </span>
                  )}
                  {style.buyDipMult && (
                    <span className="pixel-chip bg-black/30 px-1.5 py-0.5">
                      ซื้อตอนร่วง <b className="text-emerald-300">×{style.buyDipMult}</b>
                    </span>
                  )}
                </div>
              )}

              <p className="mt-2 leading-relaxed text-white/45">{style.lesson}</p>
            </div>
          </div>

          {/* แถวปุ่ม: ◀▶ เป็นทางเลือกเสริมคู่กับแถบเทียบด้านบน */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={prev} aria-label="ก่อนหน้า" className="pixel-btn shrink-0 bg-slate-700 px-3 py-2 text-base font-bold sm:px-4 sm:py-2.5 sm:text-xl">
              ◀
            </button>
            <button
              type="button"
              onClick={() => onSelect(style.id)}
              className="pixel-btn flex-1 bg-white py-2 text-xs font-semibold text-slate-900 sm:py-2.5 sm:text-base"
            >
              เลือกตัวละครนี้
            </button>
            <button type="button" onClick={next} aria-label="ถัดไป" className="pixel-btn shrink-0 bg-slate-700 px-3 py-2 text-base font-bold sm:px-4 sm:py-2.5 sm:text-xl">
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
