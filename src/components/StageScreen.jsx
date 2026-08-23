import { useState } from 'react'
import { getTool, getTools, TAG_LABELS } from '../game/engine/data/tools.js'
import { EVENT_RULES_DISCLAIMER } from '../game/engine/data/events.js'
import { currentStage, currentEvent, currentChapter, currentStyle, netWorth, canAdjustNow } from '../game/engine/gameState.js'
import { BALANCE } from '../game/engine/balance.js'
import { concentration } from '../game/engine/portfolio.js'
import { returnsForEvent } from '../game/engine/encounter.js'
import PortfolioPanel from './PortfolioPanel'
import { money, pct } from './ToolTheme'
import Portrait, { PortraitPlaceholder } from './Portrait'
import Modal from './Modal'
import CharacterToken from './CharacterToken.jsx'
import chapterResultBackground from '../assets/ui/chapter-result-background-user.jpg'
import { eventArtOf } from './art'
import LifeTimeline from './LifeTimeline'

// แถบบอกว่าอยู่สเตจไหนของบท — ผู้เล่นต้องรู้เสมอว่าเหลืออีกกี่ก้าว
//
// มือถือกับจอกว้างแสดงคนละแบบ เพราะชื่อสเตจภาษาไทยยาว ("เผยประเภทเหตุการณ์")
// ยัดครบ 5 ชื่อในจอ 375px ต้องย่อฟอนต์เหลือ 7px ซึ่งอ่านไม่ออกอยู่ดี
//   จอแคบ  → จุด 5 จุด + ชื่อสเตจปัจจุบันชื่อเดียวขนาดอ่านได้
//   จอกว้าง → ชิปครบ 5 อันเหมือนเดิม เห็นภาพรวมทั้งบทพร้อมกัน
function StageTrack({ stageIndex }) {
  const stages = BALANCE.stages
  return (
    <>
      {/* จอแคบ */}
      <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
        <div className="flex items-center gap-1">
          {stages.map((s, i) => (
            <div
              key={s.key}
              className={`h-2 w-2 ${i === stageIndex ? 'bg-yellow-400' : i < stageIndex ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="truncate text-[11px] font-bold text-yellow-300">{stages[stageIndex]?.label}</span>
      </div>

      {/* จอกว้าง */}
      <div className="hidden shrink-0 items-center gap-1 sm:flex">
        {stages.map((s, i) => (
          <div
            key={s.key}
            className={`pixel-chip px-1.5 py-0.5 text-[9px] ${
              i === stageIndex ? 'bg-yellow-500 font-bold text-yellow-950' : i < stageIndex ? 'bg-emerald-800 text-emerald-200/70' : 'bg-slate-800 text-white/55'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </>
  )
}

// สเตจ 1 — สัญญาณเตือนคลุมเครือ: รู้ว่ามีบางอย่างมา แต่ไม่รู้ว่าอะไร
function SignalStage({ event }) {
  return (
    <div className="w-full text-center">
      <div className="enemy-idle text-5xl font-black opacity-40 grayscale sm:text-7xl">?</div>
      <div className="mt-3 text-sm font-bold text-amber-200 sm:text-xl">มีบางอย่างกำลังก่อตัว...</div>
      <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-white/75 sm:text-sm">“{event.hint}”</p>
      <p className="mt-2 text-[9px] text-white/55 sm:text-xs">ยังบอกไม่ได้ว่าจะกลายเป็นอะไร — นี่คือข้อมูลทั้งหมดที่คุณมี</p>
    </div>
  )
}

// สเตจ 2 — เผยประเภทเหตุการณ์บางส่วน (บอก tag แต่ยังไม่บอกความรุนแรง)
function RevealStage({ event }) {
  const art = eventArtOf(event.id)
  return (
    <div className="w-full text-center">
      <div className="enemy-idle mx-auto w-fit">
        {art ? <Portrait src={art} alt={event.name} size="lg" /> : <PortraitPlaceholder label={event.name} emoji={event.emoji} size="lg" />}
      </div>
      <div className="mt-2 text-sm font-bold sm:text-xl">{event.name}</div>
      <div className="pixel-chip mx-auto mt-2 inline-block bg-rose-950/70 px-2 py-1 text-[10px] text-rose-200 sm:text-sm">
        กระทบด้าน {TAG_LABELS[event.primaryTag]}
      </div>
      <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-white/75 sm:text-sm">{event.description}</p>
      <p className="mt-2 text-[9px] text-white/55 sm:text-xs">เหตุการณ์แต่ละแบบมีผลตอบแทนตายตัว — ผลรายสินทรัพย์จะเปิดเผยเมื่อเกิดขึ้น</p>
      <p className="mx-auto mt-1 max-w-lg text-[8px] leading-relaxed text-amber-200/65 sm:text-[10px]">{EVENT_RULES_DISCLAIMER}</p>
    </div>
  )
}

function EventReturnMatrix({ event, shock }) {
  const baseReturns = shock?.baseReturns ?? returnsForEvent(event)
  const modifiers = shock?.ageModifiers ?? {}
  const returns = shock?.assetReturns ?? baseReturns
  return (
    <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-1 sm:grid-cols-4">
      {getTools().map((tool) => {
        const value = returns[tool.id] ?? 0
        const tone = value > 0 ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' : value < 0 ? 'border-rose-500/50 bg-rose-950/40 text-rose-300' : 'border-slate-600 bg-slate-900/70 text-white/70'
        return (
          <div key={tool.id} className={`pixel-frame border p-1.5 text-left ${tone}`} title={event.impactReasons?.[tool.id]}>
            <div className="truncate text-[9px] text-white/70 sm:text-[10px]">{tool.name}</div>
            <div className="text-[8px] text-white/55">เหตุการณ์ {pct(baseReturns[tool.id] ?? 0)}</div>
            <div className="text-[8px] text-amber-200">วัย {modifiers[tool.id] ? pct(modifiers[tool.id]) : '0%'}</div>
            <div className="text-sm font-black sm:text-lg">ผลสุดท้าย {pct(value)}</div>
            <div className="line-clamp-2 text-[8px] leading-snug text-white/55 sm:text-[9px]">{event.impactReasons?.[tool.id]}</div>
          </div>
        )
      })}
    </div>
  )
}

// สเตจ 3 — แสดงผลตอบแทนตายตัวของเหตุการณ์และผลรวมที่เกิดกับพอร์ตจริง
function ShockStage({ state, event }) {
  const { shock, valueBeforeShock } = state
  const now = netWorth(state)
  const change = now - valueBeforeShock
  const down = change < 0

  return (
    <div className="w-full text-center">
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
        {money(valueBeforeShock)} → <b className="text-white/80">{money(now)}</b> ({pct(shock.portfolioReturn)})
      </div>
      <EventReturnMatrix event={event} shock={shock} />

      <div className="pixel-chip mx-auto mt-2 max-w-xl bg-sky-950/55 px-2 py-1.5 text-[9px] leading-relaxed text-sky-100/85 sm:text-xs">
        {event.summary}
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
  const change = netWorth(state) - state.valueBeforeShock
  const lost = Math.max(0, -change)
  const gained = change >= 0
  const confirmed = state.behavior // ตั้งแล้วคือ dispatch ไปแล้วจริง แก้ไม่ได้อีก
  const [pending, setPending] = useState(null)
  const selectedId = confirmed ?? pending

  const options = [
    { id: 'hold', title: 'ถือต่อ', desc: gained ? 'คงพอร์ตเดิมไว้' : 'ไม่ทำอะไร รอตลาดฟื้น', detail: gained ? 'ไม่ล็อกกำไรและไม่เสียค่าปรับพอร์ต' : `ได้คืน ${Math.round(BALANCE.reboundPct * 100)}% ของที่เสียไปในบทหน้า`, cls: 'bg-sky-800 border-sky-500/50' },
    { id: 'cut', title: gained ? 'ลดความเสี่ยง' : 'ตัดขาดทุน', desc: 'ย้ายพอร์ตทั้งหมดเข้าตราสารหนี้', detail: gained ? 'รักษามูลค่าปัจจุบัน แต่เสียโอกาสเติบโตของสินทรัพย์เดิม' : 'ไม่ฟื้นตัว แต่ปลอดภัยถ้ามีคลื่นตามมาอีก', cls: 'bg-rose-900 border-rose-500/50' },
    {
      id: 'buy',
      title: gained ? 'เพิ่มการลงทุน' : 'ซื้อเพิ่มตอนถูก',
      desc: hasCash ? `ทุ่มเงินสดที่เหลือ ${money(state.cash)} ลงไปอีก` : 'ต้องมีเงินสดเหลือถึงจะทำได้',
      detail: hasCash ? (gained ? 'เพิ่มเงินที่รับผลของตลาด — ถ้ามีคลื่นตามก็เสี่ยงมากขึ้น' : `ฟื้นแรง ×${(BALANCE.buyDipReboundMult * (style.buyDipMult ?? 1)).toFixed(1)} — แต่ถ้าร่วงต่อจะเจ็บหนักกว่าเดิม`) : 'คุณลงทุนไปหมดแล้วตั้งแต่ต้นบท',
      cls: 'bg-amber-900 border-amber-500/50',
      disabled: !hasCash,
    },
  ]

  return (
    <div className="w-full text-center">
      <div className={`text-sm font-bold sm:text-xl ${gained ? 'text-emerald-300' : 'text-amber-200'}`}>
        {gained ? `พอร์ตคุณเพิ่มขึ้น ${money(change)}` : `พอร์ตคุณเพิ่งเสียไป ${money(lost)}`}
      </div>
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

// รับค่า diversification (= 1 - concentration) ที่พลิกด้านแล้ว ไม่ใช่ concentration ดิบ
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

// เกณฑ์นี้ใช้กับ diversification (พลิกด้านแล้ว) เท่านั้น — กลับด้านจากเกณฑ์ concentration ดิบ
// (concentration > 0.6 → bad, < 0.25 → good) ห้ามเอาเกณฑ์ 0.6/0.25 มาใช้ตรงๆ กับค่านี้
const diversificationTone = (diversification) => (diversification >= 0.75 ? 'good' : diversification < 0.4 ? 'bad' : 'neutral')

// ตารางผลกระทบรายสินทรัพย์ — หัวใจของสเตจ 5
//
// แทนประโยค "X ช่วยดูดซับมากสุด ส่วน Y เจ็บหนักสุด" แบบเดิม ซึ่งเรียงด้วยค่า exposure
// (คุณสมบัติติดตัวของสินทรัพย์) ไม่ใช่ผลที่เกิดขึ้นจริงรอบนั้น — สินทรัพย์ที่อ่อนไหวที่สุดแต่ถือไว้
// นิดเดียวไม่ใช่ตัวที่ทำร้ายพอร์ตจริง การเรียงด้วย ฿ ที่หายไปจริงจึงตรงกับสิ่งที่ผู้เล่นรู้สึก
//
// แถบสียาวตามสัดส่วน |฿ ที่เปลี่ยน| เทียบกับตัวที่เปลี่ยนมากสุดในรอบนั้น (สเกลสัมพัทธ์แบบเดียวกับ
// StyleCompareBars) วางเป็นพื้นหลังของแถวเลย ไม่ใช่บรรทัดแยก — จอเตี้ยจึงไม่ต้องจ่ายความสูงเพิ่ม
//
// ทิศการเรียงพลิกตามผลรวม: พอร์ตติดลบ → เสียมากสุดขึ้นก่อน · พอร์ตเป็นบวก → ได้มากสุดขึ้นก่อน
// ทั้งสองทางคือ "ตัวที่กำหนดผลลัพธ์รอบนี้มากที่สุดอยู่บนสุดเสมอ" กล่องบทเรียนจึงอ้างแถวบนสุดได้
function ImpactTable({ rows, cash, gained }) {
  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.change)))
  const lead = rows[0]
  const leadRounded = lead ? Math.round(Math.abs(lead.change)) : 0
  const leadSign = leadRounded === 0 ? '' : lead.change < 0 ? '-' : '+'

  return (
    <div className="mt-2">
      {lead && (
        <div className="pixel-chip bg-slate-800/80 px-2 py-1.5 text-[10px] font-bold sm:text-xs">
          {gained ? 'ฮีโร่รอบนี้' : 'ตัวที่ลากพอร์ตลงมากสุด'}: {lead.tool.name}{' '}
          <span className={lead.change < 0 ? 'text-rose-300' : 'text-emerald-300'}>{leadSign}{money(Math.abs(lead.change))}</span>
        </div>
      )}
      <div className="mt-1 text-[10px] text-white/55 sm:text-xs">{gained ? 'สินทรัพย์ไหนช่วยพอร์ตในรอบนี้' : 'สินทรัพย์ไหนได้รับผลกระทบในรอบนี้'}</div>

      <div className="mt-1 flex flex-col gap-[3px]">
        {rows.map((r) => {
          const down = r.change < 0
          // money() ปัดเป็นจำนวนเต็ม ตัวที่ขยับน้อยมากจึงกลายเป็น 0฿ — ต้องไม่ติดเครื่องหมายมาด้วย
          // ("−0฿" อ่านแล้วขัด และสื่อผิดว่าเสียเงินทั้งที่ปัดแล้วไม่เสีย) ส่วน % ยังบอกว่าขยับจริง
          const absRounded = Math.round(Math.abs(r.change))
          // ใช้ยัติภังค์ ASCII ให้ตรงกับที่ pct() ผลิต ไม่ใช่ − (U+2212) ไม่งั้นสองค่าในบรรทัดเดียวกัน
          // จะใช้เครื่องหมายลบคนละตัวจนดูเหมือนพิมพ์ผิด
          const sign = absRounded === 0 ? '' : down ? '-' : '+'
          return (
            <div key={r.tool.id} className="relative overflow-hidden bg-slate-900/80 px-1.5 py-1 [@media(max-height:500px)]:py-0.5">
              <div
                className={`absolute inset-y-0 left-0 ${down ? 'bg-rose-500/25' : 'bg-emerald-500/25'}`}
                style={{ width: `${(Math.abs(r.change) / maxAbs) * 100}%` }}
              />
              <div className="relative flex items-center justify-between gap-1.5 text-[10px] sm:text-xs">
                <span className="truncate text-white">{r.tool.name}</span>
                <span className={`shrink-0 whitespace-nowrap ${down ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {pct(r.pct)} · {sign}{money(Math.abs(r.change))}
                </span>
              </div>
            </div>
          )
        })}

        {/* เงินสดไม่ผ่าน Event Return Matrix เลย จึงไม่มีแถบ — ความต่างทางสายตาบอกเองว่ามันคนละประเภท
            ไม่ใช่แค่ตัวที่บังเอิญเปลี่ยนแปลง 0 และทำให้ผลรวมทุกแถวเท่ากับตัวเลขใหญ่ด้านบนพอดี */}
        {cash > 0.5 && (
          <div className="bg-slate-900/80 px-1.5 py-1 [@media(max-height:500px)]:py-0.5">
            <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-xs">
              <span className="truncate text-white/60">เงินสด</span>
              <span className="shrink-0 whitespace-nowrap text-white/55">{money(0)} · ไม่โดนตลาด แต่ไม่โต</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// สเตจ 5 — สรุปเฉพาะตัว: อธิบายด้วยตัวเลขจริงว่าทำไมผลถึงออกมาแบบนี้
function DebriefStage({ state, event }) {
  const { shock } = state
  const style = currentStyle(state)

  // เทียบก่อน/หลังเหตุการณ์รายสินทรัพย์ — ใช้ positionsBeforeShock ที่เอนจินเก็บไว้ตอน resolveShock
  const before = state.positionsBeforeShock ?? {}
  const diversification = 1 - concentration(before)
  const investedBefore = Object.values(before).reduce((sum, amount) => sum + amount, 0)
  const cashOnly = investedBefore <= 0 && state.cash > 0
  const impacts = Object.keys(before)
    .filter((id) => before[id] > 0.5)
    .map((id) => {
      const change = (state.positions[id] ?? 0) - before[id]
      return { tool: getTool(id), change, pct: change / before[id] }
    })

  const totalChange = impacts.reduce((s, r) => s + r.change, 0)
  const gained = totalChange >= 0
  impacts.sort((a, b) => (gained ? b.change - a.change : a.change - b.change))

  // บทเรียนของแถวบนสุด = ตัวที่กำหนดผลลัพธ์รอบนี้มากสุด · ไม่ได้ถืออะไรเลยก็ใช้คำอธิบายเหตุการณ์แทน
  const lead = impacts[0]

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center text-sm font-bold sm:text-lg">เงินเปลี่ยนเพราะอะไร?</div>

      <div className="pixel-frame mt-2 border border-slate-700 bg-slate-900/70 p-2 text-[10px] leading-relaxed sm:p-3 sm:text-sm">
        <div className={`pixel-frame border p-1.5 sm:p-2 ${TONE_CLS[shock.portfolioReturn >= 0 ? 'good' : 'bad']}`}>
          ผลรวมของพอร์ตจาก {event.name}: <b>{pct(shock.portfolioReturn)}</b>
        </div>
        <EventReturnMatrix event={event} shock={shock} />
        {cashOnly ? (
          <div className="pixel-frame mt-1.5 border border-slate-500/60 bg-slate-800/70 p-1.5 text-slate-200 sm:p-2">
            ถือเงินสดทั้งหมด — <b>ยังไม่มีการกระจายการลงทุน</b> เงินสดไม่โดนแรงกระแทกตลาด แต่กำลังซื้ออาจลดลงจากเงินเฟ้อ
          </div>
        ) : (
          <div className={`pixel-frame mt-1.5 border p-1.5 sm:p-2 ${TONE_CLS[diversificationTone(diversification)]}`}>
            กระจายตัว <b>{Math.round(diversification * 100)}%</b> — {diversificationNote(diversification)}
          </div>
        )}

        {impacts.length > 0 && (
          <ImpactTable rows={impacts} cash={state.cash} gained={gained} />
        )}

        {state.lastFee > 0.5 && (
          <div className="mt-1.5 text-rose-300/90">ค่าธรรมเนียม -{money(state.lastFee)} · ต้นทุนจากการปรับพอร์ตของ{style.name}</div>
        )}

        {state.scam?.lost > 0 && (
          <div className="mt-1.5 text-rose-300/90">มิจฉาชีพ -{money(state.scam.lost)} · สูญเสียจากการโอนเงิน ไม่ใช่ผลจากตลาด</div>
        )}

        {state.behavior && (
          <div className="mt-1.5 text-sky-200/90">
            การตัดสินใจของคุณ: {state.behavior === 'hold' ? 'ถือต่อและรอดูการฟื้นตัว' : state.behavior === 'cut' ? 'ย้ายไปตราสารหนี้เพื่อลดแรงกระแทกถัดไป' : 'ใช้เงินสดซื้อเพิ่ม ทำให้ผลรอบถัดไปแรงขึ้น'}
          </div>
        )}

      </div>

      <div className="pixel-chip mt-2 bg-emerald-950/60 p-2 text-[10px] leading-relaxed text-emerald-100/90 sm:text-xs">
        {event.summary ?? lead?.tool.lesson ?? event.description}
      </div>

      {(state.chapterAbility.triggered || state.chapterAbility.cost > 0) && (
        <div className="pixel-chip mt-2 bg-violet-950/70 p-2 text-[10px] leading-relaxed text-violet-100 sm:text-xs">
          <div className="font-bold text-violet-200">ผลความสามารถตัวละครในบทนี้</div>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            <span className="text-emerald-300">โบนัส +{money(state.chapterAbility.bonus)}</span>
            <span className="text-rose-300">ค่าใช้จ่าย -{money(state.chapterAbility.cost)}</span>
            <span className={state.chapterAbility.bonus - state.chapterAbility.cost >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
              ผลสุทธิ {state.chapterAbility.bonus - state.chapterAbility.cost >= 0 ? '+' : '-'}{money(Math.abs(state.chapterAbility.bonus - state.chapterAbility.cost))}
            </span>
          </div>
          <div className="mt-1 text-white/55">ปรับพอร์ตระหว่างเหตุการณ์ {state.chapterAbility.adjustmentCount} ครั้ง</div>
        </div>
      )}
    </div>
  )
}

// ข้อเสนอมิจฉาชีพ — ธงแดงคือ "การันตี" + "เร่งรัดเวลา" ไม่ใช่ตัวเลข
function ScamOffer({ scam, onAnswer }) {
  return (
    // ไม่ส่ง onClose = กด Esc หรือคลิกฉากหลังหนีไม่ได้ ต้องเลือก "โอนเลย" หรือ "ปฏิเสธ" เท่านั้น
    // ตั้งใจให้เป็นแบบนี้ — ในโลกจริงมิจฉาชีพก็บีบให้ตัดสินใจตรงนั้น การกดหนีได้จะทำให้บทเรียนหาย
    <Modal label="มีคนทักมาหาคุณ — ข้อเสนอการลงทุน" panelClassName="pixel-frame max-w-md border border-amber-500/60 bg-gradient-to-b from-amber-950 to-slate-950 p-3 sm:p-5">
      <div>
        <div className="w-full text-center">
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
    </Modal>
  )
}

function AdjustmentPrompt({ stageKey, style, onChoice }) {
  const isSignal = stageKey === 'signal'
  return (
    <Modal label="ความสามารถปรับพอร์ต" panelClassName="pixel-frame max-w-md border border-sky-500/60 bg-gradient-to-b from-sky-950 to-slate-950 p-3 sm:p-5">
      <div className="text-center">
        <CharacterToken style={style} state="idle" className="mx-auto h-16 w-16" label={false} />
        <div className="mt-2 text-sm font-bold text-sky-200 sm:text-lg">ความสามารถของ{style.name}พร้อมใช้งาน</div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/75 sm:text-sm">
          {isSignal
            ? 'พบสัญญาณเตือนแล้ว คุณอยากปรับพอร์ตเพื่อเตรียมรับมือไหม? การปรับของ Trader มีค่าธรรมเนียม 2% ของเงินที่ย้าย'
            : `รู้เหตุการณ์แล้ว คุณอยากปรับพอร์ตเพื่อรับมือไหม?${style.id === 'trader' ? ' การปรับมีค่าธรรมเนียม 2% ของเงินที่ย้าย' : ' ครั้งนี้ปรับได้ฟรี 1 ครั้งในบทนี้'}`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onChoice('skip')} className="pixel-btn bg-slate-600 px-2 py-2 text-xs font-bold text-white sm:text-sm">
            {isSignal ? 'รอดูก่อน' : 'ใช้พอร์ตเดิม'}
          </button>
          <button type="button" onClick={() => onChoice('adjust')} className="pixel-btn bg-sky-500 px-2 py-2 text-xs font-bold text-sky-950 sm:text-sm">
            ปรับพอร์ต
          </button>
        </div>
        <p className="mt-2 text-[9px] text-white/45 sm:text-[10px]">เลือกใช้พอร์ตเดิมได้โดยไม่มีบทลงโทษ และปุ่มปรับพอร์ตปกติยังคงอยู่</p>
      </div>
    </Modal>
  )
}

export default function StageScreen({ state, command, commandError = null, onDismissError, submitting = false, onAdjust }) {
  const stage = currentStage(state)
  const event = currentEvent(state)
  const chapter = currentChapter(state)
  const canAdjust = canAdjustNow(state)
  const needsBehavior = stage.key === 'behavior' && !state.behavior
  const showScam = stage.key === 'reveal' && state.scam && state.scam.accepted === null
  const promptAvailable = currentStyle(state).adjustmentPromptStages?.includes(stage.n)
    && !state.chapterAbility.promptChoices[stage.key]
  const showAdjustmentPrompt = promptAvailable && !showScam

  const answerAdjustmentPrompt = (choice) => {
    const result = command({ type: 'RECORD_ADJUSTMENT_PROMPT', choice })
    if (result.ok && choice === 'adjust') onAdjust()
  }

  return (
    <div
      className="stage-screen cozy-screen flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(4, 16, 30, 0.34) 0%, rgba(3, 10, 18, 0.82) 100%), url(${chapterResultBackground})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3">
        <LifeTimeline chapters={BALANCE.chapters} currentChapterN={chapter.n} history={state.history} />
        <header className="cozy-hud mb-1.5 flex shrink-0 items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex items-center gap-2 text-[10px] font-bold sm:text-sm">
            <CharacterToken style={currentStyle(state)} state={stage?.key ?? 'idle'} className="h-10 w-10 shrink-0" label={false} />
            <span>บทที่ {chapter.n} · อายุ {chapter.ageFrom}-{chapter.ageTo}</span>
          </div>
          <StageTrack stageIndex={state.stageIndex} />
        </header>

        {/* safe center ไม่ใช่ center เฉยๆ — เวลาเนื้อหาสั้นกว่ากล่องจะจัดกึ่งกลางเหมือนเดิม แต่พอเนื้อหา
            ล้น (เช่นหน้าสรุปบทที่มีตารางรายสินทรัพย์ครบ 6 ตัว บนมือถือที่แถบเบราว์เซอร์กินที่)
            การจัดกึ่งกลางจะดันส่วนเกินขึ้นไปเหนือขอบบนจนหลุดออกนอกระยะ scroll — scrollTop เป็น 0
            แล้วแต่หัวข้อยังอยู่สูงกว่าขอบ 48px คือมองไม่เห็นและเลื่อนขึ้นไปดูไม่ได้เลย
            safe center สั่งให้สลับไปชิดบนอัตโนมัติเมื่อล้น ทุกบรรทัดจึงเลื่อนถึงได้เสมอ
            เบราว์เซอร์เก่าที่ไม่รู้จักคำนี้จะทิ้งทั้งบรรทัดแล้วได้ค่า default (ชิดบน) ซึ่งก็ยังถูกกว่าเดิม */}
        <div className="stage-content-viewport flex min-h-0 flex-1 justify-center overflow-y-auto py-2 [align-items:safe_center]">
          <div className="stage-content-shell">
            {stage.key === 'signal' && <SignalStage event={event} />}
            {stage.key === 'reveal' && <RevealStage event={event} />}
            {stage.key === 'shock' && <ShockStage state={state} event={event} />}
            {stage.key === 'behavior' && <BehaviorStage state={state} onChoose={(choice) => command({ type: 'CHOOSE_BEHAVIOR', choice })} />}
            {stage.key === 'debrief' && <DebriefStage state={state} event={event} />}
          </div>
        </div>

        <div className="stage-footer mt-1.5 shrink-0">
          <PortfolioPanel positions={state.positions} cash={state.cash} compact />
          {commandError && (
            <div role="alert" aria-live="assertive" className="pixel-chip mb-1.5 bg-rose-950/70 px-2 py-1 text-[10px] text-rose-100 sm:text-xs">
              {commandError.code === 'DECISION_REQUIRED' && 'ต้องตัดสินใจก่อน: '}
              {commandError.code === 'STALE_COMMAND' && 'หน้าจอเปลี่ยนไปแล้ว: '}
              {commandError.code === 'WRONG_PHASE' && 'ยังทำรายการนี้ไม่ได้: '}
              {commandError.code === 'INVALID_DECISION' && 'ตัวเลือกไม่ถูกต้อง: '}
              {commandError.message}
              {onDismissError && <button type="button" className="ml-2 underline" onClick={onDismissError}>ปิดข้อความ</button>}
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {canAdjust ? (
              <button type="button" onClick={onAdjust} className="pixel-btn bg-sky-600 px-3 py-1.5 text-[10px] font-bold sm:px-5 sm:py-2 sm:text-sm">
                ปรับพอร์ต
              </button>
            ) : (
              <span className="text-[8px] leading-snug text-white/55 sm:text-[10px]">
                {currentStyle(state).name}แตะพอร์ตตรงนี้ไม่ได้
              </span>
            )}
            <button
              type="button"
              disabled={needsBehavior || submitting}
              onClick={() => command({ type: 'NEXT_STAGE', expectedStageIndex: state.stageIndex, at: new Date().toISOString() })}
              className={`pixel-btn px-4 py-1.5 text-[11px] font-bold sm:px-8 sm:py-2 sm:text-base ${
                needsBehavior ? 'cursor-not-allowed bg-slate-700 text-slate-500' : 'bg-emerald-500 text-emerald-950'
              }`}
            >
              {submitting ? 'กำลังประมวลผล…' : needsBehavior ? 'เลือกก่อน' : state.stageIndex === BALANCE.stages.length - 1 ? 'ไปบทถัดไป ▶' : 'ต่อไป ▶'}
            </button>
          </div>
        </div>
      </div>

      {showScam && <ScamOffer scam={state.scam} onAnswer={(accept) => command({ type: 'ANSWER_SCAM', accept })} />}
      {showAdjustmentPrompt && <AdjustmentPrompt stageKey={stage.key} style={currentStyle(state)} onChoice={answerAdjustmentPrompt} />}
    </div>
  )
}
