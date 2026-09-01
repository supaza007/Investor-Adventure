import { useEffect, useRef, useState } from 'react'
import { BALANCE } from '../game/engine/balance.js'
import { money, pct } from './ToolTheme'
import Portrait, { PortraitPlaceholder } from './Portrait'
import { eventArtOf, eventStaticArtOf } from './art'
import Modal from './Modal'
import { buildReadiness } from '../game/learning.js'
import { getTool } from '../game/engine/data/tools.js'
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

function ChapterRow({ c, onDetails }) {
  const down = c.change < 0
  return (
    <div className="report-chapter-row pixel-frame border border-slate-700 bg-slate-900/70 p-1.5 sm:p-2">
      <div className="flex items-center gap-1.5">
        {eventArtOf(c.eventId) ? (
          <Portrait src={eventArtOf(c.eventId)} reducedMotionSrc={eventStaticArtOf(c.eventId)} alt={c.eventName} size="sm" />
        ) : (
          <PortraitPlaceholder label={c.eventName} emoji={c.emoji} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-bold text-white/80 sm:text-sm">บท {c.chapter} · อายุ {c.ageFrom}-{c.ageTo}</div>
          <div className="truncate text-[9px] font-semibold text-white sm:text-xs">{c.eventName}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xs font-bold sm:text-base ${down ? 'text-rose-400' : 'text-emerald-400'}`}>{pct(c.changePct)}</div>
          <div className="text-[8px] text-white/55 sm:text-[10px]">ปลายบท {money(c.valueEnd)}</div>
        </div>
        <button type="button" onClick={() => onDetails(c)} className="report-chapter-row__info" aria-label={`ดูรายละเอียดบท ${c.chapter}`}>
          i
        </button>
      </div>
    </div>
  )
}

function ChapterDetailsModal({ chapter, onClose }) {
  if (!chapter) return null
  return <Modal onClose={onClose} label={`รายละเอียดบท ${chapter.chapter}`} panelClassName="report-chapter-modal pixel-frame max-w-lg border border-amber-400/60 bg-gradient-to-b from-slate-900 to-slate-950 p-3 text-white sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-base font-bold text-amber-200 sm:text-xl">บท {chapter.chapter} · อายุ {chapter.ageFrom}-{chapter.ageTo}</div><div className="mt-1 text-sm text-white/70">{chapter.eventName}</div></div>
      <button type="button" onClick={onClose} className="report-chapter-modal__close" aria-label="ปิดรายละเอียด">×</button>
    </div>
    <div className="report-chapter-modal__summary mt-3"><b>{chapter.prep.text}</b>{chapter.behaviorLabel !== '—' && ` · คุณเลือก “${chapter.behaviorLabel}”`}</div>
    <dl className="report-chapter-modal__facts mt-3">
      <div><dt>มูลค่าต้นบท</dt><dd>{money(chapter.valueBefore)}</dd></div>
      <div><dt>มูลค่าปลายบท</dt><dd>{money(chapter.valueEnd)} ({pct(chapter.changePct)})</dd></div>
      <div><dt>โบนัสความสามารถ</dt><dd className="text-emerald-300">+{money(chapter.abilityBonus ?? 0)}</dd></div>
      <div><dt>โบนัสรับมือเหตุการณ์</dt><dd className="text-emerald-300">+{money(chapter.eventReward ?? 0)} ({pct(chapter.eventRewardPct ?? 0)})</dd></div>
      <div><dt>ค่าธรรมเนียม</dt><dd className="text-rose-300">-{money(chapter.abilityCost ?? 0)}</dd></div>
      {chapter.scamAccepted && <div><dt>ความเสียหายจากมิจฉาชีพ</dt><dd className="text-rose-300">-{money(chapter.scamLost ?? 0)}</dd></div>}
    </dl>
    <div className="mt-3 text-xs font-bold text-sky-200">ผลตอบแทนรายสินทรัพย์</div>
    <div className="report-chapter-modal__returns mt-1">
      {Object.entries(chapter.assetReturns ?? {}).map(([toolId, value]) => <div key={toolId}><span>{getTool(toolId)?.name ?? toolId}</span><b className={value >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{pct(value)}</b></div>)}
    </div>
    {(chapter.abilityTriggered || chapter.adjustmentCount > 0) && <div className="mt-3 text-[11px] leading-relaxed text-violet-200"><b className="text-violet-300">ความสามารถ:</b> {ABILITY_LABEL[chapter.characterAbilityId] ?? chapter.characterAbilityId}{chapter.adjustmentCount > 0 && ` · ปรับพอร์ต ${chapter.adjustmentCount} ครั้ง`}</div>}
  </Modal>
}

function BestWorstSummary({ report }) {
  const allPositive = report.chapters.length > 0 && report.chapters.every((chapter) => chapter.changePct >= 0)
  const worstLabel = allPositive ? 'กำไรน้อยที่สุด' : 'เสียหายที่สุด'
  const worstTone = allPositive ? 'report-outcome--least' : 'report-outcome--worst'
  const victimLoss = report.chapters.reduce((sum, chapter) => sum + (chapter.scamLost ?? 0), 0)
  return <section className="report-highlights" aria-label="สรุปบทที่ทำได้ดีที่สุดและต้องระวังที่สุด">
    {report.best && report.worst && <div className="report-highlights__pair">
      <div className="report-outcome report-outcome--best"><span>ทำได้ดีที่สุด</span><b>บท {report.best.chapter} · อายุ {report.best.ageFrom}-{report.best.ageTo}</b><small>{report.best.eventName}</small><strong>{pct(report.best.changePct)}</strong></div>
      <div className={`report-outcome ${worstTone}`}><span>{worstLabel}</span><b>บท {report.worst.chapter} · อายุ {report.worst.ageFrom}-{report.worst.ageTo}</b><small>{report.worst.eventName}</small><strong>{pct(report.worst.changePct)}</strong></div>
    </div>}
    <div className={`report-scam-alert ${report.scamVictim ? 'report-scam-alert--victim' : 'report-scam-alert--safe'}`}>
      <span aria-hidden="true">{report.scamVictim ? '!' : '✓'}</span><div><b>{report.scamVictim ? 'คุณตกเป็นเหยื่อมิจฉาชีพ' : 'คุณไม่ตกเป็นเหยื่อมิจฉาชีพในรอบนี้'}</b><small>{report.scamVictim ? `เสียเงินจากข้อเสนอหลอกลวง ${money(victimLoss)} · การันตีผลตอบแทนสูงและเร่งรัดให้โอน คือสัญญาณเตือน` : 'คุณไม่เสียเงินให้กับข้อเสนอหลอกลวงในรอบนี้'}</small></div>
    </div>
  </section>
}

// สถานะทางการเงินเทียบกับเงินที่ผู้เล่นได้รับจริงตลอดเกม
export default function ReportScreen({ report, session, styleId, gameTiming, versions, learning, onRestart }) {
  const submittedRef = useRef(false)
  const sendingRef = useRef(false)
  const [detailsChapter, setDetailsChapter] = useState(null)
  const b = BAND_STYLE[report.band.id] ?? BAND_STYLE.tight
  const vsBench = report.benchmarkRatio - 1
  const beat = vsBench >= 0
  const readiness = buildReadiness(report, session.assessment)

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
      return
    }

    const queued = enqueuePlayerRun(run)
    const sendQueuedRuns = async () => {
      if (sendingRef.current) return
      sendingRef.current = true
      try {
        if (!queued.ok) {
          await submitPlayerRun(run)
          return
        }

        await flushPlayerDataQueue()
      } catch (error) {
        console.warn('[player-data] unable to save completed run', error)
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
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] sm:text-xs">
            <div className="pixel-chip bg-black/20 p-2">โบนัสรับมือเหตุการณ์ {report.eventWinCount}/4 บท<br /><b className="text-emerald-300">+{money(report.eventReward)}</b></div>
            <div className="pixel-chip bg-black/20 p-2">โบนัสความสม่ำเสมอ<br /><b className="text-emerald-300">+{money(report.consistencyReward)}</b></div>
          </div>
        </div>

        <details className="pixel-frame mt-1.5 shrink-0 border border-slate-700 bg-slate-900/70 p-2 text-center sm:p-3">
          <summary className="cursor-pointer text-[10px] font-bold text-violet-300 sm:text-sm">ดูข้อมูลเปรียบเทียบเพิ่มเติม (ไม่ใช้ตัดสินสถานะ)</summary>
          <div className="mt-2 text-[9px] text-white/50 sm:text-xs">กองทุนรวมอ้างอิงจากเงินและเวลาลงทุนเดียวกัน: {money(report.benchmark)}</div>
          <div className={`mt-0.5 text-[10px] font-bold sm:text-sm ${beat ? 'text-emerald-300' : 'text-rose-300'}`}>{report.benchmarkBand.label} · {beat ? 'สูงกว่า' : 'ต่ำกว่า'} {Math.abs(Math.round(vsBench * 100))}%</div>
        </details>

        <div className="mt-2 shrink-0 text-[10px] font-bold text-white/70 sm:text-sm">เกิดอะไรขึ้นบ้างในชีวิตคุณ</div>
        {/* ต้องระบุ grid-cols-1 ห้ามใช้ grid เปล่าๆ — grid เปล่าได้คอลัมน์ auto ที่ยืดตาม min-content
            ของลูกได้ไม่จำกัด และ truncate ข้างใน ChapterRow มี white-space: nowrap ที่ดัน min-content
            ให้เท่ากับความยาวข้อความเต็ม ผลคือแถวกว้าง 454px บนจอ 390px แล้วกล่องแม่ (overflow-y-auto
            ซึ่ง CSS บังคับให้ overflow-x เป็น auto ตามไปด้วย) เลื่อนแนวนอนได้ ผู้เล่นปัดนิ้วทีเดียว
            ข้อความหายไปทางซ้ายทั้งหน้า · grid-cols-1 ของ Tailwind = minmax(0,1fr) ซึ่งตรึงไว้ที่ความกว้างแม่ */}
        <div className="mt-1 grid grid-cols-1 gap-1.5">
          {report.chapters.map((c) => (
            <ChapterRow key={c.chapter} c={c} onDetails={setDetailsChapter} />
          ))}
        </div>

        <BestWorstSummary report={report} />

        <section className="report-readiness pixel-frame mt-3 bg-slate-900/80 p-3" aria-labelledby="readiness-title">
          <h2 id="readiness-title" className="text-base font-black text-emerald-300 sm:text-xl">ภาพรวมการเงิน 3 ด้านในสถานการณ์จำลอง</h2>
          <p className="mt-1 text-xs text-white/60">ไม่ใช่คำวินิจฉัยหรือคำแนะนำการลงทุนสำหรับชีวิตจริง</p>
          <div className="report-readiness__bars mt-3">{readiness.map((item) => <div key={item.id} className="report-readiness__bar">
            <div><span>{item.label}</span><b>{item.score == null ? 'Not assessed' : `${item.score}/100`}</b></div>
            <div className="report-readiness__track"><div style={{ width: `${item.score ?? 0}%` }} /></div>
            <small>{item.evidence}</small>
          </div>)}</div>
        </section>

        <section className="report-learning pixel-frame mt-3 bg-slate-900/80 p-3 text-xs" aria-labelledby="learning-title">
          <h2 id="learning-title" className="text-base font-black text-sky-300 sm:text-xl">สรุปการเรียนรู้ของฉัน</h2>
          <div className="report-learning__metrics mt-3">
            <div><span>โปรไฟล์ความเสี่ยง</span><b>{learning.preRiskProfile ? RISK_PROFILE_LABEL[learning.preRiskProfile] : 'ยังไม่ได้ประเมิน'}</b></div>
            <div><span>คะแนนความรู้</span><b>{learning.status === 'assessed' ? `${learning.knowledgeGain >= 0 ? '+' : ''}${learning.knowledgeGain}` : 'ยังไม่ได้ประเมิน'}</b></div>
          </div>
          <div className="report-learning__items mt-3">
            <div><span aria-hidden="true">✓</span><p><b>สิ่งที่ทำได้ดี:</b> {report.best?.changePct >= 0 ? `บท ${report.best.chapter} ช่วยให้พอร์ตของคุณรับมือเหตุการณ์ได้ดี` : 'คุณเดินเกมครบทุกบทและเห็นผลของการตัดสินใจต่อพอร์ต'}</p></div>
            <div className="report-learning__warning"><span aria-hidden="true">!</span><p><b>จุดที่ควรระวัง:</b> {report.scamVictim ? 'ข้อเสนอที่การันตีผลตอบแทนและเร่งให้โอนเงิน คือสัญญาณของมิจฉาชีพ' : report.cashOnlyChapters > 0 ? 'การถือเงินสดทั้งหมดช่วยลดแรงกระแทก แต่กำลังซื้อยังถูกเงินเฟ้อลดทอน' : 'เหตุการณ์เดียวกันส่งผลต่อสินทรัพย์แต่ละประเภทไม่เท่ากัน'}</p></div>
            <div><span aria-hidden="true">→</span><p><b>รอบต่อไป:</b> ลองใช้รายละเอียดรายบทเพื่อเทียบว่าการกระจายพอร์ตและการปรับพอร์ตช่วยอะไรได้บ้าง</p></div>
          </div>
        </section>

        <button type="button" onClick={onRestart} className="pixel-btn mt-3 mb-1 shrink-0 bg-emerald-500 py-2 text-sm font-bold text-emerald-950 sm:py-3 sm:text-lg">
          ↻ เล่นอีกครั้งด้วยสไตล์อื่น
        </button>
      </div>
      <ChapterDetailsModal chapter={detailsChapter} onClose={() => setDetailsChapter(null)} />
    </div>
  )
}


