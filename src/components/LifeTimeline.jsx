import { useState } from 'react'
import { BALANCE } from '../game/engine/balance.js'
import { luckLabel, prepLabel } from '../game/engine/report.js'
import { pct } from './ToolTheme'

const TONE_TEXT = {
  good: 'text-emerald-300',
  neutral: 'text-white/70',
  bad: 'text-rose-300',
}

// "ดูเหตุการณ์ย้อนหลัง" = คลิกจุดที่ผ่านมาแล้วบนไทม์ไลน์นี้เอง ไม่มีปุ่มแยกต่างหาก
// จุดอนาคต (รวมจุดเกษียณ) ต้องกดไม่ได้และไม่มี title ใบ้เนื้อหาเด็ดขาด — ขัดกับดีไซน์หลัก
// "ตัดสินใจก่อนรู้ผล" (docs/plans/2026-07-17-investment-life-path-design.md ข้อ 2)
export default function LifeTimeline({ chapters, currentChapterN, history }) {
  const [openN, setOpenN] = useState(null)

  const points = [
    ...chapters.map((c) => ({ n: c.n, kind: 'chapter' })),
    { n: chapters.length + 1, kind: 'retire' },
  ]

  const openEntry = openN != null ? history.find((h) => h.chapter === openN) : null

  return (
    <div className="mb-1.5 shrink-0">
      <div className="flex items-center">
        {points.map((p, i) => {
          const isPast = p.kind === 'chapter' && p.n < currentChapterN
          const isCurrent = p.kind === 'chapter' && p.n === currentChapterN

          return (
            <div key={p.n} className="flex flex-1 items-center last:flex-none">
              {/* จุดวงกลมเล็กแค่ 20px แต่จุดที่ "ผ่านมาแล้ว" กดดูย้อนหลังได้จริง — เล็กเกินกว่าจะแตะแม่น
                  ขยายพื้นที่แตะด้วย ::after ที่ absolute ออกไปรอบๆ (relative + -inset-3 = ~44px)
                  ไม่ใช้ padding เพราะจะไปดันเส้นเชื่อมระหว่างจุดให้เลย์เอาต์เบี้ยวทั้งแถบ
                  จุดห่างกัน ~75px บนจอ 375px พื้นที่แตะจึงไม่ทับกัน */}
              <button
                type="button"
                disabled={!isPast}
                onClick={() => setOpenN((cur) => (cur === p.n ? null : p.n))}
                aria-label={p.kind === 'retire' ? 'เกษียณ' : `บทที่ ${p.n}${isPast ? ' — ดูสรุปย้อนหลัง' : ''}`}
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[9px] font-bold sm:h-6 sm:w-6 sm:text-[11px] ${
                  isCurrent
                    ? 'border-yellow-400 bg-yellow-500 text-yellow-950'
                    : isPast
                      ? `cursor-pointer border-emerald-400 bg-emerald-600 text-emerald-950 after:absolute after:-inset-3 after:content-[''] ${openN === p.n ? 'ring-2 ring-white' : ''}`
                      : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                }`}
              >
                {isCurrent ? '●' : isPast ? '✓' : '🔒'}
              </button>
              {i < points.length - 1 && <div className={`h-0.5 flex-1 ${p.n < currentChapterN ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </div>
          )
        })}
      </div>

      {openEntry &&
        (() => {
          const luck = luckLabel(openEntry.percentile)
          const prep = prepLabel(openEntry.exposure, openEntry.concentration)
          const changePct = openEntry.valueBefore > 0 ? (openEntry.valueEnd - openEntry.valueBefore) / openEntry.valueBefore : 0
          return (
            <div className="pixel-chip mt-1.5 bg-black/40 p-2 text-[10px] leading-relaxed sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white/85">
                  บทที่ {openEntry.chapter} — {openEntry.eventName}
                </span>
                <span className={changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{pct(changePct)}</span>
              </div>
              <div className={`mt-0.5 ${TONE_TEXT[prep.tone]}`}>{prep.text}</div>
              <div className={TONE_TEXT[luck.tone]}>{luck.text}</div>
            </div>
          )
        })()}
    </div>
  )
}
