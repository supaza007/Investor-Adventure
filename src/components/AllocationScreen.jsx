import { useState, useMemo } from 'react'
import { getTools, TAG_LABELS } from '../game/engine/data/tools.js'
import { netWorth } from '../game/engine/gameState.js'
import { colorOf, money, pct } from './ToolTheme'

const STEP = 5 // ปรับทีละ 5% — ละเอียดพอให้คิด แต่ไม่ละเอียดจนกดนาน

// แปลง exposure 0..1 เป็นดาว 1-5 เม็ด — นักเรียน ม.ปลาย ไม่ต้องอ่านทศนิยม
const riskDots = (v) => '●'.repeat(Math.max(1, Math.round(v * 5))) + '○'.repeat(5 - Math.max(1, Math.round(v * 5)))

function ToolRow({ tool, percent, value, onAdd, onSub, canAdd }) {
  const c = colorOf(tool.id)
  const worstTag = Object.entries(tool.exposure).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className={`pixel-frame border bg-gradient-to-b p-1.5 sm:p-2 ${c.border} ${c.grad}`}>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold sm:text-sm">{tool.name}</div>
          <div className="truncate text-[8px] text-white/50 sm:text-[10px]">{tool.tagline}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold sm:text-lg ${c.text}`}>{percent}%</div>
          <div className="text-[8px] text-white/40 sm:text-[10px]">{money(value)}</div>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-1">
        <button type="button" onClick={onSub} disabled={percent === 0} className={`pixel-btn flex-1 py-0.5 text-xs font-bold sm:text-sm ${percent === 0 ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'bg-slate-600 text-white'}`}>
          −
        </button>
        <button type="button" onClick={onAdd} disabled={!canAdd} className={`pixel-btn flex-1 py-0.5 text-xs font-bold sm:text-sm ${!canAdd ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'bg-slate-500 text-white'}`}>
          +
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[10px]">
        <span className="text-white/45">โต {tool.growthMult.toFixed(2)}× / 10 ปี</span>
        <span className="text-rose-300/80" title={`อ่อนไหวต่อ${TAG_LABELS[worstTag[0]]}`}>
          จุดอ่อน {TAG_LABELS[worstTag[0]]} {riskDots(worstTag[1])}
        </span>
      </div>
    </div>
  )
}

// popup กันหน้าจัดพอร์ต — บังคับให้อ่านว่ากำลังอยู่บทไหนก่อนเริ่มลาก slider
// ถ้ามีบทก่อนหน้า (prevSummary) จะโชว์สรุปสั้นๆ ของบทที่เพิ่งจบด้วย เพื่อสะกิดให้คิดก่อนปรับพอร์ตใหม่
function ChapterIntroModal({ chapter, prevSummary, onContinue }) {
  const prevChangePct = prevSummary && prevSummary.valueBefore > 0 ? (prevSummary.valueEnd - prevSummary.valueBefore) / prevSummary.valueBefore : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="pixel-frame w-full max-w-md border border-slate-600 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-center sm:p-6">
        {prevSummary && (
          <div className="pixel-chip mb-3 bg-black/40 p-2 text-left text-[10px] leading-relaxed sm:text-xs">
            <div className="font-bold text-white/85">จบบทที่ {prevSummary.chapter} แล้ว — {prevSummary.eventName}</div>
            <div className="mt-1 text-white/65">
              พอร์ตปลายบท <b className="text-white">{money(prevSummary.valueEnd)}</b>{' '}
              <span className={prevChangePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>({pct(prevChangePct)})</span>
            </div>
          </div>
        )}

        <div className="text-[10px] uppercase tracking-widest text-white/40 sm:text-xs">
          บทที่ {chapter.n} · อายุ {chapter.ageFrom}-{chapter.ageTo}
        </div>
        <div className="mt-1 text-lg font-black sm:text-2xl">{chapter.theme}</div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/60 sm:text-sm">
          ก่อนจัดพอร์ต ลองคิดดูว่าทศวรรษนี้คุณจะรับความเสี่ยงได้แค่ไหน — ไม่มีคำตอบที่ถูกเสมอ
        </p>

        <button type="button" onClick={onContinue} className="pixel-btn mt-4 w-full bg-emerald-500 py-2.5 text-sm font-bold text-emerald-950 sm:text-base">
          เริ่มจัดพอร์ตบทนี้
        </button>
      </div>
    </div>
  )
}

// หน้าจัดพอร์ต — ผู้เล่นบอกสัดส่วนที่อยากได้ เอนจินย้ายเงินให้เอง
// สำคัญ: ตัดสินใจ "ก่อน" รู้ว่าบทนี้จะเจอเหตุการณ์อะไร (เสาหลักข้อ 2)
// isChapterStart = true เฉพาะตอนเข้าบทใหม่จริงๆ (ไม่ใช่ตอนกดปุ่ม "ปรับพอร์ต" กลางบท) — คุมว่าจะโชว์ popup แนะนำบทไหม
export default function AllocationScreen({ state, chapter, onConfirm, isChapterStart = false }) {
  const total = netWorth(state)
  const tools = getTools()

  // เริ่มจากสัดส่วนพอร์ตปัจจุบัน (บทแรกคือเงินสด 100%) ปัดเป็นช่อง 5% แล้วโยนเศษเข้าเงินสด
  const initial = useMemo(() => {
    const a = {}
    let used = 0
    for (const t of tools) {
      const p = total > 0 ? Math.round(((state.positions[t.id] ?? 0) / total) * 100 / STEP) * STEP : 0
      a[t.id] = p
      used += p
    }
    a.cash = Math.max(0, 100 - used)
    return a
  }, [state.chapterIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const [alloc, setAlloc] = useState(initial)
  const cashLeft = alloc.cash

  // แสดง popup แนะนำบทแค่ครั้งเดียวต่อบท แม้ผู้เล่นจะลาก slider จน component re-render ก็ไม่โผล่ซ้ำ
  const [introSeenFor, setIntroSeenFor] = useState(null)
  const showIntro = isChapterStart && introSeenFor !== chapter.n
  const prevSummary = state.history[state.history.length - 1] ?? null

  const change = (id, delta) => {
    setAlloc((a) => {
      if (delta > 0 && a.cash < delta) return a
      if (delta < 0 && a[id] <= 0) return a
      return { ...a, [id]: a[id] + delta, cash: a.cash - delta }
    })
  }

  const weights = Object.fromEntries(Object.entries(alloc).filter(([, v]) => v > 0).map(([k, v]) => [k, v / 100]))
  const investedPct = 100 - cashLeft

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {showIntro && <ChapterIntroModal chapter={chapter} prevSummary={prevSummary} onContinue={() => setIntroSeenFor(chapter.n)} />}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3">
        <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold sm:text-base">
              บทที่ {chapter.n} · อายุ {chapter.ageFrom}-{chapter.ageTo}
            </div>
            <div className="truncate text-[9px] text-white/55 sm:text-xs">{chapter.theme}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[9px] text-white/50 sm:text-xs">ทรัพย์สินทั้งหมด</div>
            <div className="text-base font-bold text-emerald-300 sm:text-2xl">{money(total)}</div>
          </div>
        </header>

        <div className="pixel-chip mb-1.5 shrink-0 bg-amber-950/60 px-2 py-1 text-[9px] leading-snug text-amber-200/90 sm:text-xs">
          คุณยังไม่รู้ว่า 10 ปีข้างหน้าจะเกิดอะไรขึ้น — ตัดสินใจด้วยข้อมูลเท่าที่มี เหมือนการลงทุนจริง
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto sm:grid-cols-3 sm:gap-2">
          {tools.map((t) => (
            <ToolRow
              key={t.id}
              tool={t}
              percent={alloc[t.id]}
              value={(alloc[t.id] / 100) * total}
              canAdd={cashLeft >= STEP}
              onAdd={() => change(t.id, STEP)}
              onSub={() => change(t.id, -STEP)}
            />
          ))}
        </div>

        <div className="mt-1.5 shrink-0">
          <div className="pixel-bar mb-1.5 flex h-3 w-full overflow-hidden bg-slate-950 sm:h-4">
            {tools.map((t) => alloc[t.id] > 0 && <div key={t.id} className={colorOf(t.id).bar} style={{ width: `${alloc[t.id]}%` }} />)}
            {cashLeft > 0 && <div className="bg-slate-500" style={{ width: `${cashLeft}%` }} />}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-[9px] leading-snug text-white/60 sm:text-xs">
              เงินสดที่ยังไม่ลงทุน <b className="text-slate-200">{cashLeft}%</b> ({money((cashLeft / 100) * total)})
              <div className="text-[8px] text-white/40 sm:text-[10px]">
                เงินสดไม่โตและถูกเงินเฟ้อกิน แต่ต้องมีไว้ถึงจะซื้อเพิ่มตอนตลาดร่วงได้
              </div>
            </div>
            <button
              type="button"
              onClick={() => onConfirm(weights)}
              className="pixel-btn shrink-0 bg-emerald-500 px-4 py-1.5 text-xs font-bold text-emerald-950 sm:px-8 sm:py-2.5 sm:text-base"
            >
              ลงทุน {investedPct}% ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
