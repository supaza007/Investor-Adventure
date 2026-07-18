import { useState } from 'react'
import { getTool, TAG_LABELS } from '../game/engine/data/tools.js'
import { currentStage, currentEvent, currentChapter, currentStyle, netWorth, canAdjustNow } from '../game/engine/gameState.js'
import { BALANCE } from '../game/engine/balance.js'
import PortfolioPanel from './PortfolioPanel'
import { money, pct } from './ToolTheme'
import Portrait, { PortraitPlaceholder } from './Portrait'
import { eventArtOf } from './art'

// แถบบอกว่าอยู่สเตจไหนของบท — ผู้เล่นต้องรู้เสมอว่าเหลืออีกกี่ก้าว
function StageTrack({ stageIndex }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {BALANCE.stages.map((s, i) => (
        <div
          key={s.key}
          className={`pixel-chip px-1 py-0.5 text-[7px] sm:px-1.5 sm:text-[9px] ${
            i === stageIndex ? 'bg-yellow-500 font-bold text-yellow-950' : i < stageIndex ? 'bg-emerald-800 text-emerald-200/70' : 'bg-slate-800 text-white/35'
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  )
}

// สเตจ 1 — สัญญาณเตือนคลุมเครือ: รู้ว่ามีบางอย่างมา แต่ไม่รู้ว่าอะไร
function SignalStage({ event }) {
  return (
    <div className="text-center">
      <div className="enemy-idle text-5xl font-black opacity-40 grayscale sm:text-7xl">?</div>
      <div className="mt-3 text-sm font-bold text-amber-200 sm:text-xl">มีบางอย่างกำลังก่อตัว...</div>
      <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-white/75 sm:text-sm">“{event.hint}”</p>
      <p className="mt-2 text-[9px] text-white/40 sm:text-xs">ยังบอกไม่ได้ว่าจะกลายเป็นอะไร — นี่คือข้อมูลทั้งหมดที่คุณมี</p>
    </div>
  )
}

// สเตจ 2 — เผยประเภทเหตุการณ์บางส่วน (บอก tag แต่ยังไม่บอกความรุนแรง)
function RevealStage({ event }) {
  const primary = Object.entries(event.tagWeights).sort((a, b) => b[1] - a[1])[0]
  const art = eventArtOf(event.id)
  return (
    <div className="text-center">
      <div className="enemy-idle mx-auto w-fit">
        {art ? <Portrait src={art} alt={event.name} size="lg" /> : <PortraitPlaceholder label={event.name} emoji={event.emoji} size="lg" />}
      </div>
      <div className="mt-2 text-sm font-bold sm:text-xl">{event.name}</div>
      <div className="pixel-chip mx-auto mt-2 inline-block bg-rose-950/70 px-2 py-1 text-[10px] text-rose-200 sm:text-sm">
        กระทบด้าน {TAG_LABELS[primary[0]]}
      </div>
      <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-white/75 sm:text-sm">{event.description}</p>
      <p className="mt-2 text-[9px] text-white/40 sm:text-xs">ยังไม่รู้ว่าจะแรงแค่ไหน — สินทรัพย์ที่อ่อนไหวด้านนี้จะเจ็บที่สุด</p>
    </div>
  )
}

// สเตจ 3 — แรงกระแทกจริง โชว์ทั้งช่วงที่เป็นไปได้และผลที่จับสลากได้ (ระบบแฟร์เนส ดีไซน์ข้อ 7)
function ShockStage({ state, event }) {
  const { band, shock, valueBeforeShock } = state
  const now = netWorth(state)
  const change = now - valueBeforeShock
  const down = change < 0

  const range = band.max - band.min
  const markerPos = range > 0 ? ((shock.shockPct - band.min) / range) * 100 : 50

  return (
    <div className="text-center">
      {state.isBlackSwan && (
        <div className="pixel-chip mx-auto mb-2 inline-block bg-purple-950 px-2 py-1 text-[10px] font-bold text-purple-200 sm:text-sm">
          BLACK SWAN — เหตุการณ์ที่ไม่มีใครเตรียมตัวทันได้
        </div>
      )}
      <div className="mx-auto w-fit">
        {eventArtOf(event.id) ? (
          <Portrait src={eventArtOf(event.id)} alt={event.name} size="md" />
        ) : (
          <PortraitPlaceholder label={event.name} emoji={event.emoji} size="md" />
        )}
      </div>
      <div className="mt-1 text-sm font-bold sm:text-xl">{event.name}เกิดขึ้นแล้ว</div>

      <div className={`mt-2 text-2xl font-black sm:text-4xl ${down ? 'text-rose-400' : 'text-emerald-400'}`}>
        {down ? '▼' : '▲'} {money(Math.abs(change))}
      </div>
      <div className="text-[10px] text-white/50 sm:text-sm">
        {money(valueBeforeShock)} → <b className="text-white/80">{money(now)}</b> ({pct(shock.shockPct)})
      </div>

      {/* ช่วงผลลัพธ์ที่เป็นไปได้ + จุดที่จับสลากได้จริง */}
      <div className="mx-auto mt-3 max-w-md">
        <div className="mb-1 text-[9px] text-white/45 sm:text-[11px]">ช่วงผลลัพธ์ที่พอร์ตของคุณเป็นไปได้ในเหตุการณ์นี้</div>
        <div className="pixel-bar relative h-4 w-full bg-gradient-to-r from-rose-900 via-amber-800 to-emerald-800 sm:h-5">
          <div className="absolute top-0 h-full w-1 bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.6)]" style={{ left: `calc(${Math.min(98, Math.max(0, markerPos))}% - 2px)` }} />
        </div>
        <div className="flex justify-between text-[8px] text-white/40 sm:text-[10px]">
          <span>แย่สุด {pct(band.min)}</span>
          <span>ดีสุด {pct(band.max)}</span>
        </div>
      </div>

      {state.scam?.accepted && state.scam.lost > 0 && (
        <div className="pixel-chip mx-auto mt-3 inline-block bg-rose-950 px-2 py-1 text-[10px] text-rose-200 sm:text-sm">
          “ที่ปรึกษา” เชิดเงิน {money(state.scam.lost)} หายไปแล้ว ติดต่อไม่ได้อีกเลย
        </div>
      )}
    </div>
  )
}

// สเตจ 4 — จุดตัดสินใจพฤติกรรม: สอน panic-selling ผ่านการกระทำ ไม่ใช่ผ่าน popup
// เลือกแบบสองขั้น: คลิกครั้งแรก = เลือกไว้ก่อน (pending) ยังยกเลิก/เปลี่ยนใจได้ ต้องกด "ยืนยันการเลือก"
// ถึงจะ dispatch เข้าเอนจินจริง (state.behavior) — กันมือลั่นตอนตัดสินใจสำคัญที่แก้ไม่ได้
function BehaviorStage({ state, onChoose }) {
  const style = currentStyle(state)
  const hasCash = state.cash > 0.5
  const lost = Math.max(0, state.valueBeforeShock - netWorth(state))
  const confirmed = state.behavior // ตั้งแล้วคือ dispatch ไปแล้วจริง แก้ไม่ได้อีก
  const [pending, setPending] = useState(null)
  const selectedId = confirmed ?? pending

  const options = [
    { id: 'hold', title: 'ถือต่อ', desc: 'ไม่ทำอะไร รอตลาดฟื้น', detail: `ได้คืน ${Math.round(BALANCE.reboundPct * 100)}% ของที่เสียไปในบทหน้า`, cls: 'bg-sky-800 border-sky-500/50' },
    { id: 'cut', title: 'ตัดขาดทุน', desc: 'ขายทิ้งหมด ย้ายเข้าตราสารหนี้', detail: 'ไม่ฟื้นตัว แต่ปลอดภัยถ้ามีคลื่นตามมาอีก', cls: 'bg-rose-900 border-rose-500/50' },
    {
      id: 'buy',
      title: 'ซื้อเพิ่มตอนถูก',
      desc: hasCash ? `ทุ่มเงินสดที่เหลือ ${money(state.cash)} ลงไปอีก` : 'ต้องมีเงินสดเหลือถึงจะทำได้',
      detail: hasCash ? `ฟื้นแรง ×${(BALANCE.buyDipReboundMult * (style.buyDipMult ?? 1)).toFixed(1)} — แต่ถ้าร่วงต่อจะเจ็บหนักกว่าเดิม` : 'คุณลงทุนไปหมดแล้วตั้งแต่ต้นบท',
      cls: 'bg-amber-900 border-amber-500/50',
      disabled: !hasCash,
    },
  ]

  return (
    <div className="text-center">
      <div className="text-sm font-bold text-amber-200 sm:text-xl">พอร์ตคุณเพิ่งเสียไป {money(lost)}</div>
      <p className="mt-1 text-[10px] text-white/55 sm:text-sm">
        {confirmed ? 'ตัดสินใจแล้ว — เปลี่ยนใจไม่ได้อีก' : 'ตอนนี้คุณจะทำยังไง? ไม่มีตัวเลือกไหนถูกเสมอ'}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-3">
        {options.map((o) => {
          const isSelected = selectedId === o.id
          const dimmed = !!selectedId && !isSelected
          return (
            <button
              key={o.id}
              type="button"
              disabled={o.disabled || !!confirmed}
              onClick={() => setPending(o.id)}
              className={`pixel-frame border p-2 text-left transition sm:p-3 ${
                o.disabled
                  ? 'cursor-not-allowed border-slate-700 bg-slate-900 opacity-45'
                  : dimmed
                    ? 'cursor-pointer border-slate-700 bg-slate-700/50 opacity-50 grayscale'
                    : isSelected
                      ? `${o.cls} outline outline-2 outline-offset-1 outline-white`
                      : `${o.cls} hover:brightness-125`
              } ${confirmed ? 'cursor-default' : ''}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold sm:text-base">{o.title}</span>
                {isSelected && <span className="text-[8px] font-bold text-white/80 sm:text-[10px]">{confirmed ? '✓ ยืนยันแล้ว' : 'เลือกอยู่'}</span>}
              </div>
              <div className="mt-1 text-[9px] leading-snug text-white/75 sm:text-xs">{o.desc}</div>
              <div className="mt-1 text-[8px] leading-snug text-white/45 sm:text-[10px]">{o.detail}</div>
            </button>
          )
        })}
      </div>

      {pending && !confirmed && (
        <div className="pixel-frame mx-auto mt-3 flex max-w-md flex-col items-center justify-between gap-2 border border-amber-500/50 bg-amber-950/40 p-2 sm:flex-row">
          <span className="text-[10px] text-amber-100 sm:text-xs">มั่นใจกับ "{options.find((o) => o.id === pending)?.title}" ไหม?</span>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setPending(null)} className="pixel-btn bg-slate-600 px-2.5 py-1 text-[10px] font-bold text-white sm:text-xs">
              ยกเลิก
            </button>
            <button type="button" onClick={() => onChoose(pending)} className="pixel-btn bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-emerald-950 sm:text-xs">
              ยืนยันการเลือก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// คำแปลความหมาย exposure/concentration ให้ครบทุกช่วง ไม่ใช่แค่กรณีสุดโต่ง — ใช้ใน DebriefStage เท่านั้น
// ไม่เกี่ยวกับเกณฑ์ที่ engine ใช้คำนวณจริง (band.js/balance.js) นี่คือ threshold สำหรับคำอธิบายเฉยๆ
const exposureNote = (exposure) => {
  if (exposure >= 0.6) return 'สินทรัพย์ส่วนใหญ่ในพอร์ตอ่อนไหวกับเหตุการณ์แบบนี้'
  if (exposure >= 0.35) return 'พอร์ตโดนเหตุการณ์นี้กระทบปานกลาง'
  return 'สินทรัพย์ส่วนใหญ่ในพอร์ตไม่ค่อยเกี่ยวกับเหตุการณ์นี้'
}

// รับค่า diversification (= 1 - band.concentration) ที่พลิกด้านแล้ว ไม่ใช่ concentration ดิบ
// ป้าย "กระจายตัว" ต้องมากับเลขที่ยิ่งเยอะยิ่งดี ถ้าใช้ concentration ดิบตรงๆ ป้ายกับเลขจะสวนทางกัน
// (concentration 0 = กระจายดีสุด แต่ถ้าโชว์เป็น "กระจายตัว 0%" จะอ่านผิดว่าไม่กระจายเลย)
const diversificationNote = (diversification) => {
  if (diversification >= 0.75) return 'กระจายดี คุณไม่ลงทุนแบบสุดโต่งเกินไปความเสียหายเลยถูกกระจาย'
  if (diversification >= 0.4) return 'กระจายพอสมควร ผลลัพธ์จึงไม่สุดโต่งไปทางใดทางหนึ่ง'
  return 'กระจุกมาก ผลลัพธ์จึงเดาไม่ได้'
}

// สีไฮไลต์ตามโทน ให้กวาดตาจับได้ก่อนอ่านตัวเลข — สำคัญเวลาเจอ "กระจายตัว 0%" ซึ่งจริงๆ คือดีที่สุด
// แต่เลขเปล่าๆ เสี่ยงอ่านผิดว่าแย่ ถ้าไม่มีสีเขียวช่วยส่งสัญญาณ
const TONE_CLS = {
  bad: 'border-rose-500/50 bg-rose-950/40 text-rose-300',
  good: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300',
  neutral: 'border-slate-700 bg-slate-900/70 text-white/70',
}

const exposureTone = (exposure) => (exposure >= 0.6 ? 'bad' : exposure < 0.35 ? 'good' : 'neutral')
// เกณฑ์นี้ใช้กับ diversification (พลิกด้านแล้ว) เท่านั้น — กลับด้านจากเกณฑ์ concentration ดิบ
// (concentration > 0.6 → bad, < 0.25 → good) ห้ามเอาเกณฑ์ 0.6/0.25 มาใช้ตรงๆ กับค่านี้
const diversificationTone = (diversification) => (diversification >= 0.75 ? 'good' : diversification < 0.4 ? 'bad' : 'neutral')
const luckTone = (luckPct) => (luckPct >= 55 ? 'good' : luckPct >= 45 ? 'neutral' : 'bad')

// สเตจ 5 — สรุปเฉพาะตัว: อธิบายด้วยตัวเลขจริงว่าทำไมผลถึงออกมาแบบนี้
function DebriefStage({ state, event }) {
  const { band, shock } = state
  const luckPct = Math.round(shock.percentile * 100)
  const diversification = 1 - band.concentration // แปลงตอนแสดงผลเท่านั้น ไม่แตะ band.concentration ที่ engine ใช้จริง
  const style = currentStyle(state)

  // เรียงว่าอะไรในพอร์ตช่วย/ทำร้ายมากสุดในเหตุการณ์นี้
  const contributions = Object.keys(state.positions)
    .map((id) => {
      const tool = getTool(id)
      const sens = Object.entries(event.tagWeights).reduce((s, [tag, w]) => s + w * (tool.exposure[tag] ?? 0), 0)
      return { tool, sens: sens * (tool.shockMult ?? 1) }
    })
    .sort((a, b) => a.sens - b.sens)

  const hero = contributions[0]
  const villain = contributions[contributions.length - 1]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center text-sm font-bold sm:text-lg">เกิดอะไรขึ้นกับพอร์ตของคุณ</div>

      <div className="pixel-frame mt-2 border border-slate-700 bg-slate-900/70 p-2 text-[10px] leading-relaxed sm:p-3 sm:text-sm">
        <div className={`pixel-frame border p-1.5 sm:p-2 ${TONE_CLS[exposureTone(band.exposure)]}`}>
          อ่อนไหวต่อ{event.name} <b>{Math.round(band.exposure * 100)}%</b> — {exposureNote(band.exposure)}
        </div>
        <div className={`pixel-frame mt-1.5 border p-1.5 sm:p-2 ${TONE_CLS[diversificationTone(diversification)]}`}>
          กระจายตัว <b>{Math.round(diversification * 100)}%</b> — {diversificationNote(diversification)}
        </div>

        <div className={`pixel-frame mt-1.5 border p-1.5 sm:p-2 ${TONE_CLS[luckTone(luckPct)]}`}>
          ดวงของคุณรอบนี้: ผลออกมาที่ <b>อันดับ {luckPct}%</b> ของช่วงที่เป็นไปได้ —{' '}
          {luckPct >= 55 ? 'โชคดีกว่าค่ากลาง' : luckPct >= 45 ? 'พอดีค่ากลาง' : 'โชคร้ายกว่าค่ากลาง'}
        </div>

        {hero && villain && hero.tool.id !== villain.tool.id && (
          <div className="mt-1.5">
            <b className={'text-emerald-300'}>{hero.tool.name}</b> ช่วยดูดซับแรงกระแทกไว้มากสุด ส่วน{' '}
            <b className="text-rose-300">{villain.tool.name}</b> คือตัวที่เจ็บหนักสุด
          </div>
        )}

        {state.lastFee > 0.5 && (
          <div className="mt-1.5 text-rose-300/90">ค่าธรรมเนียมการซื้อขายรอบนี้ {money(state.lastFee)} — {style.name}จ่ายทุกครั้งที่แตะพอร์ต</div>
        )}

        {state.isBlackSwan && (
          <div className="mt-1.5 text-purple-300">เหตุการณ์นี้คือ Black Swan — แม้นักลงทุนเก่งที่สุดในโลกก็เลี่ยงไม่ได้ ไม่ใช่ความผิดของคุณ</div>
        )}
      </div>

      <div className="pixel-chip mt-2 bg-emerald-950/60 p-2 text-[10px] leading-relaxed text-emerald-100/90 sm:text-xs">
        {villain?.tool.lesson ?? event.description}
      </div>
    </div>
  )
}

// ข้อเสนอมิจฉาชีพ — ธงแดงคือ "การันตี" + "เร่งรัดเวลา" ไม่ใช่ตัวเลข
function ScamOffer({ scam, onAnswer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
      <div className="pixel-frame w-full max-w-md border border-amber-500/60 bg-gradient-to-b from-amber-950 to-slate-950 p-3 sm:p-5">
        <div className="text-center">
          <div className="text-sm font-bold text-amber-200 sm:text-lg">มีคนทักมาหาคุณ</div>
        </div>
        <div className="pixel-chip mt-2 bg-black/50 p-2 text-[10px] leading-relaxed text-white/85 sm:text-sm">
          “สวัสดีครับ ผมเป็นที่ปรึกษาการลงทุนมืออาชีพ เห็นพอร์ตคุณแล้วน่าสนใจมาก<br />
          ผมมีกองทุนพิเศษที่ <b className="text-amber-300">การันตีผลตอบแทน {Math.round(scam.promisedReturnPct * 100)}%</b> ภายใน 10 ปี ไม่มีความเสี่ยงเลยครับ<br />
          แต่รับเพิ่มแค่วันนี้วันเดียว <b className="text-amber-300">ต้องตัดสินใจตอนนี้เลย</b> พรุ่งนี้ปิดรับแล้วครับ”
        </div>
        <div className="mt-2 text-center text-[10px] text-white/55 sm:text-xs">
          เขาขอให้คุณโอน <b className="text-amber-200">{money(scam.offerAmount)}</b>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onAnswer(true)} className="pixel-btn bg-amber-600 py-2 text-xs font-bold text-amber-950 sm:text-sm">
            โอนเลย
          </button>
          <button type="button" onClick={() => onAnswer(false)} className="pixel-btn bg-slate-600 py-2 text-xs font-bold text-white sm:text-sm">
            ปฏิเสธ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StageScreen({ state, dispatch, onAdjust }) {
  const stage = currentStage(state)
  const event = currentEvent(state)
  const chapter = currentChapter(state)
  const canAdjust = canAdjustNow(state)
  const needsBehavior = stage.key === 'behavior' && !state.behavior
  const showScam = stage.key === 'reveal' && state.scam && state.scam.accepted === null

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3">
        <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <div className="text-[10px] font-bold sm:text-sm">
            บทที่ {chapter.n} · อายุ {chapter.ageFrom}-{chapter.ageTo}
          </div>
          <StageTrack stageIndex={state.stageIndex} />
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2">
          {stage.key === 'signal' && <SignalStage event={event} />}
          {stage.key === 'reveal' && <RevealStage event={event} />}
          {stage.key === 'shock' && <ShockStage state={state} event={event} />}
          {stage.key === 'behavior' && <BehaviorStage state={state} onChoose={(choice) => dispatch({ type: 'CHOOSE_BEHAVIOR', choice })} />}
          {stage.key === 'debrief' && <DebriefStage state={state} event={event} />}
        </div>

        <div className="mt-1.5 shrink-0">
          <PortfolioPanel positions={state.positions} cash={state.cash} compact />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {canAdjust ? (
              <button type="button" onClick={onAdjust} className="pixel-btn bg-sky-600 px-3 py-1.5 text-[10px] font-bold sm:px-5 sm:py-2 sm:text-sm">
                ปรับพอร์ต
              </button>
            ) : (
              <span className="text-[8px] leading-snug text-white/35 sm:text-[10px]">
                {currentStyle(state).name}แตะพอร์ตตรงนี้ไม่ได้
              </span>
            )}
            <button
              type="button"
              disabled={needsBehavior}
              onClick={() => dispatch({ type: 'NEXT_STAGE' })}
              className={`pixel-btn px-4 py-1.5 text-[11px] font-bold sm:px-8 sm:py-2 sm:text-base ${
                needsBehavior ? 'cursor-not-allowed bg-slate-700 text-slate-500' : 'bg-emerald-500 text-emerald-950'
              }`}
            >
              {needsBehavior ? 'เลือกก่อน' : state.stageIndex === BALANCE.stages.length - 1 ? 'ไปบทถัดไป ▶' : 'ต่อไป ▶'}
            </button>
          </div>
        </div>
      </div>

      {showScam && <ScamOffer scam={state.scam} onAnswer={(accept) => dispatch({ type: 'ANSWER_SCAM', accept })} />}
    </div>
  )
}
