import { BALANCE } from '../game/engine/balance.js'
import { money, pct } from './ToolTheme'
import Portrait, { PortraitPlaceholder } from './Portrait'
import { eventArtOf } from './art'

const BAND_STYLE = {
  fire: { cls: 'from-amber-800 to-amber-950 border-amber-400/60', text: 'text-amber-300', blurb: 'คุณเกษียณได้ก่อนกำหนดแบบสบายๆ' },
  comfortable: { cls: 'from-emerald-800 to-emerald-950 border-emerald-400/60', text: 'text-emerald-300', blurb: 'เงินพอใช้ไปตลอดชีวิตหลังเกษียณ' },
  adequate: { cls: 'from-sky-800 to-sky-950 border-sky-400/60', text: 'text-sky-300', blurb: 'พออยู่ได้ แต่ต้องระวังค่าใช้จ่าย' },
  tight: { cls: 'from-orange-900 to-orange-950 border-orange-400/60', text: 'text-orange-300', blurb: 'เงินไม่ค่อยพอ อาจต้องทำงานต่อ' },
  ruined: { cls: 'from-rose-900 to-rose-950 border-rose-400/60', text: 'text-rose-300', blurb: 'พอร์ตพังหมด ไม่เหลืออะไรเลย' },
}

function ChapterRow({ c }) {
  const down = c.change < 0
  return (
    <div className="pixel-frame border border-slate-700 bg-slate-900/70 p-1.5 sm:p-2">
      <div className="flex items-center gap-1.5">
        {eventArtOf(c.eventId) ? (
          <Portrait src={eventArtOf(c.eventId)} alt={c.eventName} size="sm" />
        ) : (
          <PortraitPlaceholder label={c.eventName} emoji={c.emoji} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-bold sm:text-sm">
            บท {c.chapter} · อายุ {c.ageFrom}-{c.ageTo} — {c.eventName}
            {c.isBlackSwan && <span className="ml-1 text-purple-300">(Black Swan)</span>}
          </div>
          <div className="truncate text-[8px] text-white/50 sm:text-[10px]">
            {c.prep.text} · {c.luck.text}
            {c.behaviorLabel !== '—' && ` · คุณเลือก "${c.behaviorLabel}"`}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xs font-bold sm:text-base ${down ? 'text-rose-400' : 'text-emerald-400'}`}>{pct(c.changePct)}</div>
          <div className="text-[8px] text-white/40 sm:text-[10px]">ปลายบท {money(c.valueEnd)}</div>
        </div>
      </div>
      {c.scamAccepted && c.scamLost > 0 && (
        <div className="mt-1 text-[8px] text-rose-300/90 sm:text-[10px]">โดนมิจฉาชีพหลอกไป {money(c.scamLost)} — “การันตีผลตอบแทน” ไม่มีอยู่จริงในโลกการลงทุน</div>
      )}
    </div>
  )
}

// รายงานผลเกษียณ — ไม่ใช่ win/lose แต่เป็นสเปกตรัม เทียบกับเกณฑ์อ้างอิง (ดีไซน์ข้อ 7)
export default function ReportScreen({ report, onRestart }) {
  const b = BAND_STYLE[report.band.id] ?? BAND_STYLE.tight
  const vsBench = report.finalValue / report.benchmark - 1
  const beat = vsBench >= 0

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
        <div className="shrink-0 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45 sm:text-xs">อายุ {BALANCE.retireAge} · รายงานผลเกษียณ</div>
        </div>

        <div className={`pixel-frame mt-2 shrink-0 border bg-gradient-to-b p-3 text-center sm:p-4 ${b.cls}`}>
          <div className={`mt-1 text-lg font-black sm:text-3xl ${b.text}`}>{report.band.label}</div>
          <div className="text-[10px] text-white/70 sm:text-sm">{b.blurb}</div>
          <div className="mt-2 text-2xl font-black text-white sm:text-4xl">{money(report.finalValue)}</div>
          <div className="text-[9px] text-white/55 sm:text-xs">
            จากเงินที่ใส่ไปทั้งชีวิต {money(report.contributed)} · โตขึ้น {report.multiple.toFixed(1)} เท่า
          </div>
        </div>

        {/* เทียบกับเกณฑ์อ้างอิง — "ถ้าถือกองทุนดัชนีเฉยๆ 40 ปีจะได้เท่าไหร่" */}
        <div className="pixel-frame mt-1.5 shrink-0 border border-slate-700 bg-slate-900/70 p-2 text-center sm:p-3">
          <div className="text-[9px] text-white/50 sm:text-xs">ถ้าคุณซื้อกองทุนรวมแล้วนอนเฉยๆ 40 ปี จะได้ประมาณ</div>
          <div className="text-base font-bold text-violet-300 sm:text-2xl">{money(report.benchmark)}</div>
          <div className={`mt-0.5 text-[10px] font-bold sm:text-sm ${beat ? 'text-emerald-300' : 'text-rose-300'}`}>
            คุณทำได้ {beat ? 'ดีกว่า' : 'แย่กว่า'}เกณฑ์นี้ {Math.abs(Math.round(vsBench * 100))}%
          </div>
          {!beat && <div className="mt-0.5 text-[8px] leading-snug text-white/40 sm:text-[10px]">นักลงทุนมืออาชีพส่วนใหญ่ก็ทำได้ไม่ถึงเกณฑ์นี้เหมือนกัน — การอยู่เฉยๆ ยากกว่าที่คิด</div>}
        </div>

        <div className="mt-2 shrink-0 text-[10px] font-bold text-white/70 sm:text-sm">เกิดอะไรขึ้นบ้างในชีวิตคุณ</div>
        <div className="mt-1 grid gap-1.5">
          {report.chapters.map((c) => (
            <ChapterRow key={c.chapter} c={c} />
          ))}
        </div>

        <div className="pixel-chip mt-2 shrink-0 bg-slate-800/70 p-2 text-[9px] leading-relaxed text-white/75 sm:text-xs">
          {report.best && report.worst && report.best.chapter !== report.worst.chapter && (
            <div>
              {/* ทุกบทมีแรงกระแทกเสมอ บทที่ "ดีที่สุด" จึงมักหมายถึงเจ็บน้อยสุด ไม่ใช่กำไร — อย่าเขียนให้เข้าใจผิด */}
              บทที่คุณ{report.best.changePct >= 0 ? 'ทำกำไรได้มากสุด' : 'รับมือได้ดีที่สุด'}คือ{' '}
              <b className="text-emerald-300">บท {report.best.chapter} ({report.best.eventName})</b> — {report.best.prep.text} ·{' '}
              บทที่ทำร้ายคุณมากสุดคือ <b className="text-rose-300">บท {report.worst.chapter} ({report.worst.eventName})</b> — {report.worst.prep.text}
            </div>
          )}
          {report.blackSwanCount > 0 && <div className="mt-1 text-purple-200">คุณเจอ Black Swan {report.blackSwanCount} ครั้ง ซึ่งไม่มีใครเตรียมตัวทันได้ — ไม่ใช่ความผิดของคุณ</div>}
          {report.scamVictim && <div className="mt-1 text-amber-200">คุณเคยตกเป็นเหยื่อมิจฉาชีพ จำไว้ว่า “การันตีผลตอบแทนสูง” + “ต้องตัดสินใจเดี๋ยวนี้” = โกงเสมอ</div>}
        </div>

        <button type="button" onClick={onRestart} className="pixel-btn mt-3 mb-1 shrink-0 bg-emerald-500 py-2 text-sm font-bold text-emerald-950 sm:py-3 sm:text-lg">
          ↻ เล่นอีกครั้งด้วยสไตล์อื่น
        </button>
      </div>
    </div>
  )
}
