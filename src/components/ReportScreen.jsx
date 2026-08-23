import { useEffect, useRef, useState } from 'react'
import { BALANCE } from '../game/engine/balance.js'
import { money, pct } from './ToolTheme'
import Portrait, { PortraitPlaceholder } from './Portrait'
import { eventArtOf } from './art'
import { buildReadiness } from '../game/learning.js'
import { createPlayerRunPayload, submitPlayerRun } from '../lib/playerData.js'
import { enqueuePlayerRun, flushPlayerDataQueue } from '../lib/playerDataQueue.js'

const BAND_STYLE = {
  fire: { cls: 'from-amber-800 to-amber-950 border-amber-400/60', text: 'text-amber-300', blurb: 'พอร์ตของคุณแข็งแรงมากในสถานการณ์จำลองนี้' },
  comfortable: { cls: 'from-emerald-800 to-emerald-950 border-emerald-400/60', text: 'text-emerald-300', blurb: 'พอร์ตของคุณมีฐานที่มั่นคงในสถานการณ์จำลองนี้' },
  adequate: { cls: 'from-sky-800 to-sky-950 border-sky-400/60', text: 'text-sky-300', blurb: 'พอร์ตยังพอรับมือได้ แต่ควรระวังค่าใช้จ่าย' },
  tight: { cls: 'from-orange-900 to-orange-950 border-orange-400/60', text: 'text-orange-300', blurb: 'เงินตึงมือ ต้องระวังการตัดสินใจครั้งต่อไป' },
  ruined: { cls: 'from-rose-900 to-rose-950 border-rose-400/60', text: 'text-rose-300', blurb: 'พอร์ตเสียหายหนักในสถานการณ์จำลองนี้' },
}

const RISK_PROFILE_LABEL = {
  conservative: 'ระมัดระวัง',
  balanced: 'สมดุล',
  aggressive: 'รับความเสี่ยงสูง',
}

const ABILITY_LABEL = {
  flex_rebalance: 'ปรับพอร์ตฟรีหลังรู้เหตุการณ์',
  patient_compounding: 'อดทนฟื้นตัวและทบต้น',
  active_rebalance: 'ปรับพอร์ตเชิงรุก',
  value_buy_dip: 'ซื้อเพิ่มเมื่อราคาลดลง',
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
          </div>
          <div className="truncate text-[8px] text-white/50 sm:text-[10px]">
            {c.prep.text}
            {c.behaviorLabel !== '—' && ` · คุณเลือก "${c.behaviorLabel}"`}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xs font-bold sm:text-base ${down ? 'text-rose-400' : 'text-emerald-400'}`}>{pct(c.changePct)}</div>
          <div className="text-[8px] text-white/55 sm:text-[10px]">ปลายบท {money(c.valueEnd)}</div>
        </div>
      </div>
      {c.scamAccepted && c.scamLost > 0 && (
        <div className="mt-1 text-[8px] text-rose-300/90 sm:text-[10px]">โดนมิจฉาชีพหลอกไป {money(c.scamLost)} — “การันตีผลตอบแทน” ไม่มีอยู่จริงในโลกการลงทุน</div>
      )}
      {(c.abilityTriggered || c.abilityCost > 0 || c.adjustmentCount > 0) && (
        <div className="mt-1 border-t border-violet-500/25 pt-1 text-[8px] leading-relaxed text-violet-100/85 sm:text-[10px]">
          <b className="text-violet-300">ความสามารถ: {ABILITY_LABEL[c.characterAbilityId] ?? c.characterAbilityId}</b>
          {' · '}โบนัส <span className="text-emerald-300">+{money(c.abilityBonus ?? 0)}</span>
          {' · '}ค่าใช้จ่าย <span className="text-rose-300">-{money(c.abilityCost ?? 0)}</span>
          {' · '}สุทธิ <span className={(c.abilityNetEffect ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
            {(c.abilityNetEffect ?? 0) >= 0 ? '+' : '-'}{money(Math.abs(c.abilityNetEffect ?? 0))}
          </span>
          {c.adjustmentCount > 0 && ` · ปรับพอร์ต ${c.adjustmentCount} ครั้ง`}
        </div>
      )}
    </div>
  )
}

// สถานะทางการเงินเทียบกับเงินที่ผู้เล่นได้รับจริงตลอดเกม
export default function ReportScreen({ report, session, styleId, gameTiming, versions, learning, onRestart }) {
  const submittedRef = useRef(false)
  const sendingRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const b = BAND_STYLE[report.band.id] ?? BAND_STYLE.tight
  const vsBench = report.finalValue / report.benchmark - 1
  const beat = vsBench >= 0
  const readiness = buildReadiness(report, session.assessment)
  const durationMinutes = Number.isFinite(gameTiming?.runDurationSeconds) ? Math.round(gameTiming.runDurationSeconds / 60) : null

  useEffect(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    if (!session.player?.studentName || !session.player?.classRoom) return

    const run = createPlayerRunPayload({
      player: session.player,
      report,
      styleId,
      preAssessment: session.assessment?.pre,
      postAssessment: session.assessment?.post,
      learning,
      timing: gameTiming,
      consent: session.consent?.researchTelemetry === true ? session.consent : false,
      anonymousPlayerId: session.anonymousPlayerId,
      platform: window.electronAPI ? 'electron' : 'web',
      sessionStatus: 'completed',
      rulesVersion: versions?.rulesVersion,
      contentVersion: versions?.contentVersion,
      rngVersion: versions?.rngVersion,
    })
    if (!run) {
      setSaveStatus('waiting')
      return
    }

    const queued = enqueuePlayerRun(run)
    const sendQueuedRuns = async () => {
      if (sendingRef.current) return
      sendingRef.current = true
      setSaveStatus('sending')
      try {
        if (!queued.ok) {
          const directResult = await submitPlayerRun(run)
          setSaveStatus(directResult.ok ? 'saved' : 'waiting')
          return
        }

        const result = await flushPlayerDataQueue()
        setSaveStatus(result.sentSessionIds.includes(run.sessionId) ? 'saved' : 'waiting')
      } catch (error) {
        console.warn('[player-data] unable to save completed run', error)
        setSaveStatus('waiting')
      } finally {
        sendingRef.current = false
      }
    }

    void sendQueuedRuns()
    const handleOnline = () => void sendQueuedRuns()
    window.addEventListener('online', handleOnline)
    const retryTimer = window.setInterval(sendQueuedRuns, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.clearInterval(retryTimer)
    }
  }, [])
  return (
    <div className="cozy-screen flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
        <div className="shrink-0 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45 sm:text-xs">อายุ {BALANCE.retireAge} · สถานะทางการเงินของคุณ</div>
        </div>

        <div className={`pixel-frame mt-2 shrink-0 border bg-gradient-to-b p-3 text-center sm:p-4 ${b.cls}`}>
          <div className={`mt-1 text-lg font-black sm:text-3xl ${b.text}`}>{report.band.label}</div>
          <div className="text-[10px] text-white/70 sm:text-sm">{b.blurb}</div>
          <div className="mt-2 text-2xl font-black text-white sm:text-4xl">{money(report.finalValue)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] sm:text-xs">
            <div className="pixel-chip bg-black/20 p-2">เงินที่ได้รับทั้งหมด<br /><b>{money(report.contributed)}</b></div>
            <div className="pixel-chip bg-black/20 p-2">กำไร/ขาดทุนสุทธิ<br /><b className={report.netGain >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{report.netGain >= 0 ? '+' : '-'}{money(Math.abs(report.netGain))} ({pct(report.netGainPct)})</b></div>
          </div>
          <div className="mt-2 text-[9px] text-white/55 sm:text-xs">มูลค่าปลายเกมเป็น {report.multiple.toFixed(1)} เท่าของเงินที่ได้รับทั้งหมด</div>
        </div>

        <details className="pixel-frame mt-1.5 shrink-0 border border-slate-700 bg-slate-900/70 p-2 text-center sm:p-3">
          <summary className="cursor-pointer text-[10px] font-bold text-violet-300 sm:text-sm">ดูข้อมูลเปรียบเทียบเพิ่มเติม (ไม่ใช้ตัดสินสถานะ)</summary>
          <div className="mt-2 text-[9px] text-white/50 sm:text-xs">พอร์ตจำลองกองทุนรวมล้วน: {money(report.benchmark)}</div>
          <div className={`mt-0.5 text-[10px] font-bold sm:text-sm ${beat ? 'text-emerald-300' : 'text-rose-300'}`}>คุณทำได้ {beat ? 'ดีกว่า' : 'แย่กว่า'}ตัวอย่างนี้ {Math.abs(Math.round(vsBench * 100))}%</div>
        </details>

        <div className="mt-2 shrink-0 text-[10px] font-bold text-white/70 sm:text-sm">เกิดอะไรขึ้นบ้างในชีวิตคุณ</div>
        {/* ต้องระบุ grid-cols-1 ห้ามใช้ grid เปล่าๆ — grid เปล่าได้คอลัมน์ auto ที่ยืดตาม min-content
            ของลูกได้ไม่จำกัด และ truncate ข้างใน ChapterRow มี white-space: nowrap ที่ดัน min-content
            ให้เท่ากับความยาวข้อความเต็ม ผลคือแถวกว้าง 454px บนจอ 390px แล้วกล่องแม่ (overflow-y-auto
            ซึ่ง CSS บังคับให้ overflow-x เป็น auto ตามไปด้วย) เลื่อนแนวนอนได้ ผู้เล่นปัดนิ้วทีเดียว
            ข้อความหายไปทางซ้ายทั้งหน้า · grid-cols-1 ของ Tailwind = minmax(0,1fr) ซึ่งตรึงไว้ที่ความกว้างแม่ */}
        <div className="mt-1 grid grid-cols-1 gap-1.5">
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
          {report.scamVictim && <div className="mt-1 text-amber-200">คุณเคยตกเป็นเหยื่อมิจฉาชีพ จำไว้ว่า “การันตีผลตอบแทนสูง” + “ต้องตัดสินใจเดี๋ยวนี้” = โกงเสมอ</div>}
          {report.cashOnlyChapters > 0 && <div className="mt-1 text-slate-200">มี {report.cashOnlyChapters} บทที่คุณถือเงินสดทั้งหมด — ยังไม่มีการกระจายการลงทุน เงินสดไม่โดนแรงกระแทกตลาด แต่กำลังซื้ออาจลดลงจากเงินเฟ้อ</div>}
        </div>

        <section className="pixel-frame mt-3 bg-slate-900/80 p-3" aria-labelledby="readiness-title">
          <h2 id="readiness-title" className="text-base font-black text-emerald-300 sm:text-xl">ภาพรวมการเงิน 3 ด้านในสถานการณ์จำลอง</h2>
          <p className="mt-1 text-xs text-white/60">ไม่ใช่คำวินิจฉัยหรือคำแนะนำการลงทุนสำหรับชีวิตจริง</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{readiness.map((item) => <div key={item.id} className="pixel-chip bg-slate-800 p-2 text-xs">
            <div className="font-bold">{item.label}</div>
            <div className="mt-1 text-lg text-amber-300">{item.score == null ? 'Not assessed' : `${item.score}/100`}</div>
            <div className="text-white/55">{item.evidence}</div>
          </div>)}</div>
        </section>

        <section className="pixel-frame mt-3 bg-slate-900/80 p-3 text-xs" aria-labelledby="learning-title">
          <h2 id="learning-title" className="text-base font-black text-sky-300 sm:text-xl">สรุปการเรียนรู้ของฉัน</h2>
          <p className="mt-2">โปรไฟล์ความเสี่ยงก่อนเล่น: <b>{learning.preRiskProfile ? RISK_PROFILE_LABEL[learning.preRiskProfile] : 'Not assessed'}</b></p>
          <p>การเปลี่ยนแปลงคะแนนความรู้: <b>{learning.status === 'assessed' ? `${learning.knowledgeGain >= 0 ? '+' : ''}${learning.knowledgeGain}` : 'Not assessed'}</b></p>
          <p>เวลาเล่นโดยประมาณ: <b>{durationMinutes == null ? 'เวลาไม่พร้อมใช้' : `${durationMinutes} นาที`}</b></p>
          <p className="mt-1 text-white/55">คะแนนการเรียนรู้แยกจากผลพอร์ตและโชค ระบบจะส่งเฉพาะสถิติการเล่นเมื่อเชื่อมต่อฐานข้อมูล</p>
          {saveStatus !== 'idle' && <p className="mt-1 text-emerald-300/80" aria-live="polite">
            {saveStatus === 'saved' ? '✓ ส่งข้อมูลเข้าฐานข้อมูลแล้ว' : '… เก็บข้อมูลไว้ในเครื่อง จะส่งอัตโนมัติเมื่ออินเทอร์เน็ตกลับมา'}
          </p>}
        </section>

        <details className="pixel-chip mt-3 bg-slate-900 p-3 text-xs">
          <summary className="cursor-pointer font-bold text-violet-300">สมมติฐานและแหล่งอ้างอิง</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/65">
            <li>เงินเฟ้อ 2% ต่อปีเป็นค่ากลางของกรอบเป้าหมาย 1–3% และเป็นสมมติฐานเกม</li>
            <li>HHI ใช้วัดการกระจุกตัวด้วยผลรวมสัดส่วนยกกำลังสอง</li>
            <li>ผลตอบแทนและเหตุการณ์เป็นพารามิเตอร์จำลอง ไม่ใช่การพยากรณ์</li>
          </ul>
        </details>

        <button type="button" onClick={onRestart} className="pixel-btn mt-3 mb-1 shrink-0 bg-emerald-500 py-2 text-sm font-bold text-emerald-950 sm:py-3 sm:text-lg">
          ↻ เล่นอีกครั้งด้วยสไตล์อื่น
        </button>
      </div>
    </div>
  )
}


