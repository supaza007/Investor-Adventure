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

// การ์ดเล็กในแถบเทียบ 4 สไตล์ด้านบน — ตัดเหลือแค่ภาพ+ชื่อ (FreqDots/กำไร% ย้ายลงไปในการ์ดหลัก
// + modal แล้ว ไม่ต้องซ้ำที่นี่) ภาพต้องนิ่ง ไม่มี animation แย่งโฟกัสตอนเทียบตัวเลข
// (medium.gif เป็นไฟล์ GIF เคลื่อนไหวในตัวเอง เล่นเองโดยเบราว์เซอร์ ไม่ผูกกับ CSS ใดๆ ที่นี่)
function CompareCard({ style, selected, onClick }) {
  const art = characterArtOf(style.id)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`pixel-frame flex flex-col items-center gap-1 border bg-gradient-to-b p-1.5 text-center transition-opacity sm:p-2 ${STYLE_GRAD[style.id]} ${
        selected ? 'outline outline-2 outline-offset-2 outline-yellow-400 sm:outline-[3px]' : 'opacity-60 hover:opacity-90'
      }`}
    >
      {art ? (
        <Portrait src={art} alt={style.name} size="md" fit="cover" objectPosition={PORTRAIT_POSITION[style.id]} className="pointer-events-none" />
      ) : (
        <PortraitPlaceholder label={style.name} emoji={style.emoji} size="md" />
      )}
      <div className="truncate text-[9px] font-bold leading-tight sm:text-[11px]">{style.name}</div>
    </button>
  )
}

// กล่องสถิติหลัก — ใหญ่ เด่น ใช้ในการ์ดหลัก (FreqDots) และใน modal (กำไรเฉลี่ย/ป้องกันความเสี่ยง)
// caption = ประโยคแปลตัวเลขเทียบกับสายกลาง อยู่ใต้ตัวเลขตัวเล็กจาง — ใช้เฉพาะกล่องที่มีค่าตัวเลข
// chart = เนื้อหาเสริมต่อท้าย caption (เช่น mini bar chart เทียบ 4 สไตล์ใน modal) — ไม่ใส่ก็ได้
function StatBox({ label, value, tone, caption, chart, children }) {
  const toneCls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-white'
  return (
    <div className="pixel-chip flex flex-1 flex-col items-center justify-center gap-1 bg-black/30 px-1.5 py-1.5 text-center sm:py-2">
      <div className="text-[8px] uppercase tracking-wide text-white/50 sm:text-[10px]">{label}</div>
      {value !== undefined ? <div className={`text-base font-black sm:text-2xl ${toneCls}`}>{value}</div> : children}
      {caption && <div className="text-[8px] leading-snug text-white/50 sm:text-[10px]">{caption}</div>}
      {chart}
    </div>
  )
}

// แท่งเทียบ 4 สไตล์ในกล่องเดียว — เส้นฐานกลาง (=0), แท่งขึ้นบนถ้าค่าบวก ลงล่างถ้าค่าลบ
// ความสูงแท่ง = สัดส่วนต่อ max(|ค่า|) ทั้ง 4 สไตล์ ไม่ใช่ scale ตายตัว
// ต้องมี emoji กำกับใต้แท่งเสมอ (ทดสอบกับผู้ใช้แล้วว่าไม่มี label จะดูไม่ออกว่าแท่งไหนคือสไตล์ไหน — ห้ามตัดออก)
// แท่ง/label ของสไตล์ที่กำลังดูอยู่เป็นสีทองเด่น ไม่ว่าค่าจะบวกหรือลบ ส่วนอีก 3 สไตล์จางลง
function StyleCompareBars({ values, selectedIndex }) {
  const styles = getStyles()
  const max = Math.max(1, ...values.map((v) => Math.abs(v)))
  return (
    <div className="mt-1 flex h-12 w-full items-stretch gap-1.5 sm:h-14">
      {values.map((v, i) => {
        const isSelected = i === selectedIndex
        const heightPct = (Math.abs(v) / max) * 50 // สูงสุด = ครึ่งกล่อง (อีกครึ่งเผื่อทิศตรงข้าม)
        return (
          <div key={styles[i].id} className="flex flex-1 flex-col items-center">
            <div className="relative h-full w-full">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/25" />
              <div
                className={`absolute left-1/2 w-2/3 -translate-x-1/2 ${isSelected ? 'bg-amber-400' : 'bg-white/25'}`}
                style={v >= 0 ? { bottom: '50%', height: `${heightPct}%` } : { top: '50%', height: `${heightPct}%` }}
              />
            </div>
            <div className={isSelected ? 'mt-0.5 text-sm' : 'mt-0.5 text-xs opacity-30'}>{styles[i].emoji}</div>
          </div>
        )
      })}
    </div>
  )
}

// modal รายละเอียดเพิ่มเติม — เนื้อหาที่ย้ายออกจากการ์ดหลัก (tagline, กลไกปรับพอร์ต, ตัวเลขเทียบ
// 4 สไตล์ + กราฟแท่ง, ค่าธรรมเนียม/โบนัส, บทเรียน) ใช้ pattern เดียวกับ ToolDetailModal ใน AllocationScreen.jsx
function StyleDetailModal({ style, allGainPct, allDefensePct, selectedIndex, onClose }) {
  const gainPct = allGainPct[selectedIndex]
  const defensePct = allDefensePct[selectedIndex]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div
        className={`pixel-frame max-h-[85vh] w-full max-w-lg overflow-y-auto border bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-5 ${STYLE_GRAD[style.id]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-bold sm:text-lg">{style.name}</div>
        <p className="mt-1 text-[11px] text-white/70 sm:text-sm">{style.tagline}</p>

        <div className="mt-3 text-[9px] font-bold uppercase tracking-wide text-white/45 sm:text-[11px]">กลไกปรับพอร์ต</div>
        <div className="pixel-chip mt-1.5 bg-black/40 p-1.5 text-[10px] leading-snug text-white/80 sm:text-[11px]">{adjustLabel(style)}</div>

        <div className="mt-3 text-[9px] font-bold uppercase tracking-wide text-white/45 sm:text-[11px]">ตัวเลขเทียบ 4 สไตล์</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <StatBox
            label="กำไรเฉลี่ย"
            value={signedPct(gainPct)}
            tone={gainPct >= 0 ? 'good' : 'bad'}
            caption={gainCaption(style, gainPct)}
            chart={<StyleCompareBars values={allGainPct} selectedIndex={selectedIndex} />}
          />
          <StatBox
            label="ป้องกันความเสี่ยง"
            value={signedPct(defensePct)}
            tone={defensePct >= 0 ? 'good' : 'bad'}
            caption={defenseCaption(style, defensePct)}
            chart={<StyleCompareBars values={allDefensePct} selectedIndex={selectedIndex} />}
          />
        </div>

        {(style.tradeFeePct || style.buyDipMult) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {style.tradeFeePct && (
              <span className="pixel-chip bg-black/30 px-1.5 py-0.5 text-[10px] sm:text-xs">
                ค่าธรรมเนียม <b className="text-rose-300">{(style.tradeFeePct * 100).toFixed(0)}%</b>/ครั้ง
              </span>
            )}
            {style.buyDipMult && (
              <span className="pixel-chip bg-black/30 px-1.5 py-0.5 text-[10px] sm:text-xs">
                ซื้อตอนร่วง <b className="text-emerald-300">×{style.buyDipMult}</b>
              </span>
            )}
          </div>
        )}

        <div className="pixel-chip mt-3 bg-emerald-950/40 p-2 text-[10px] leading-relaxed text-emerald-100/85 sm:text-xs">{style.lesson}</div>

        <button type="button" onClick={onClose} className="pixel-btn mt-4 w-full bg-white py-2 text-xs font-semibold text-slate-900 sm:text-sm">
          ปิด
        </button>
      </div>
    </div>
  )
}

// เลือกสไตล์นักลงทุน — แทนหน้าเลือกคลาสเดิม
// ต่างจากเดิมตรงที่สไตล์ไม่ได้ผูกกับสินทรัพย์: ทุกสไตล์ซื้อเครื่องมือไหนก็ได้ ต่างกันแค่ "วิธีเล่น"
export default function StyleSelect({ onSelect }) {
  const styles = getStyles()
  const [index, setIndex] = useState(styles.findIndex((s) => s.isDefault))
  const [showDetail, setShowDetail] = useState(false)
  const style = styles[index]

  const prev = () => setIndex((i) => (i - 1 + styles.length) % styles.length)
  const next = () => setIndex((i) => (i + 1) % styles.length)

  const art = characterArtOf(style.id)
  const allGainPct = styles.map((s) => Math.round((s.returnMult - 1) * 100))
  const allDefensePct = styles.map((s) => Math.round((1 - s.shockMult) * 100))

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {showDetail && (
        <StyleDetailModal
          style={style}
          allGainPct={allGainPct}
          allDefensePct={allDefensePct}
          selectedIndex={index}
          onClose={() => setShowDetail(false)}
        />
      )}
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
            {/* 1. หัวการ์ด: portrait + ชื่อ+badge แถวเดียว */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className={`pixel-frame sprite-bob h-16 w-16 shrink-0 overflow-hidden border bg-gradient-to-b sm:h-20 sm:w-20 ${STYLE_GRAD[style.id]}`}>
                {art ? (
                  <Portrait src={art} alt={style.name} size="fill" fit="cover" objectPosition={PORTRAIT_POSITION[style.id]} />
                ) : (
                  <PortraitPlaceholder label={style.name} emoji={style.emoji} size="fill" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold sm:text-xl">{style.name}</div>
                {style.isDefault && <div className="text-[9px] text-white/50 sm:text-[11px]">แนะนำสำหรับเล่นครั้งแรก</div>}
              </div>
            </div>

            {/* 2. persona ซ้าย / จำนวนครั้งปรับพอร์ต+FreqDots ขวา แถวเดียวกัน */}
            <div className="mt-2.5 flex items-start justify-between gap-2 sm:mt-3">
              <p className="text-[11px] italic leading-snug text-white/70 sm:text-xs">{style.persona}</p>
              <div className="shrink-0 text-right">
                <div className="text-[8px] text-white/50 sm:text-[10px]">ปรับพอร์ตได้/ครั้ง</div>
                <FreqDots n={style.canAdjustAt.length} />
              </div>
            </div>

            {/* 3. จุดแข็ง/จุดอ่อน — เนื้อหาหลัก เด่นกว่าเดิม */}
            <div className="mt-2.5 space-y-1.5 sm:mt-3">
              <div className="flex gap-1.5 border-l-[3px] border-emerald-400 bg-emerald-500/10 px-2 py-1.5 text-[11px] sm:text-xs">
                <span className="shrink-0 text-emerald-300">✓</span>
                <span className="text-white/90">{style.pros}</span>
              </div>
              <div className="flex gap-1.5 border-l-[3px] border-rose-400 bg-rose-500/10 px-2 py-1.5 text-[11px] sm:text-xs">
                <span className="shrink-0 text-rose-300">✗</span>
                <span className="text-white/90">{style.cons}</span>
              </div>
            </div>

            {/* 4. ลิงก์เปิด modal รายละเอียดเพิ่มเติม */}
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="mt-2.5 shrink-0 border border-dashed border-white/25 px-2 py-1.5 text-left text-[10px] text-white/50 hover:border-white/40 hover:text-white/70 sm:mt-3 sm:text-[11px]"
            >
              ⓘ ดูรายละเอียดเพิ่มเติม
              <span className="block text-[9px] text-white/35 sm:text-[10px]">
                (tagline · กำไรเฉลี่ย/ป้องกันความเสี่ยงเทียบ 4 สไตล์ · กลไกปรับพอร์ต · บทเรียน)
              </span>
            </button>
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
