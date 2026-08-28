import { useState } from 'react'
import Modal from './Modal'
import { money } from './ToolTheme'
import { buildChapterTransitionBreakdown } from '../game/presentation.js'

const mapUrl = new URL('../assets/worlds/chapter-transition-map.webp', import.meta.url).href

const signedMoney = (value) => {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${money(rounded)}`
}

export default function ChapterTransition({ chapter, prevSummary, startValue, incomeAdded, onContinue }) {
  const [mapFailed, setMapFailed] = useState(false)
  const transition = buildChapterTransitionBreakdown({ prevSummary, chapter, startValue, incomeAdded })

  return (
    <Modal
      label={`จบบทที่ ${prevSummary.chapter} และกำลังเข้าสู่บทที่ ${chapter.n}`}
      panelClassName="journey-dialog pixel-frame max-w-xl overflow-hidden border border-amber-300/60 bg-slate-950 text-white"
    >
      <div className="journey-map relative min-h-48 overflow-hidden sm:min-h-64" aria-hidden="true">
        {!mapFailed && <img src={mapUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" onError={() => setMapFailed(true)} />}
        <div className="journey-map-shade absolute inset-0" />
        <div className="relative z-10 flex min-h-48 flex-col justify-between p-3 sm:min-h-64 sm:p-5">
          <div className="cozy-banner self-center px-4 py-2 text-center">
            <div className="text-lg font-black text-amber-100 sm:text-2xl">จบบทที่ {prevSummary.chapter} แล้ว</div>
            <div className="text-[10px] text-amber-100/75 sm:text-xs">เส้นทางชีวิตกำลังพาคุณเข้าสู่บทที่ {chapter.n}</div>
          </div>
          <div className="flex items-end justify-between gap-3 text-[10px] font-bold sm:text-sm">
            <span className="cozy-map-label">บทที่ {prevSummary.chapter} · สำเร็จ ✓</span>
            <span className="cozy-map-label">บทที่ {chapter.n} · อายุ {chapter.ageFrom}-{chapter.ageTo}</span>
          </div>
        </div>
      </div>

      <div className="cozy-panel m-2 p-3 sm:m-3 sm:p-4">
        <h1 className="text-center text-base font-black text-amber-100 sm:text-xl">เริ่มบทใหม่ เงินเปลี่ยนเพราะอะไร?</h1>
        <div className="mt-3 space-y-1.5 text-xs sm:text-sm" aria-label="ที่มาของเงินเมื่อเริ่มบทใหม่">
          <div className="cozy-ledger-row"><span>เงินปลายบทก่อน</span><b>{money(transition?.previousValue ?? prevSummary.valueEnd)}</b></div>
          {transition?.cashAdjustment !== 0 && <div className="cozy-ledger-row text-rose-200"><span>เงินสดถูกเงินเฟ้อกินกำลังซื้อ</span><b>{signedMoney(transition.cashAdjustment)}</b></div>}
          <div className="cozy-ledger-row text-emerald-200"><span>เงินเติมจากช่วงชีวิตใหม่</span><b>{signedMoney(transition?.income ?? incomeAdded)}</b></div>
          <div className="cozy-ledger-total"><span>เงินเริ่มบทนี้</span><b>{money(transition?.startValue ?? startValue)}</b></div>
        </div>
        <p className="mt-2 text-center text-[10px] text-white/65 sm:text-xs">ไม่ใช่กำไรจากตลาดทั้งหมด</p>
        <button type="button" onClick={onContinue} className="cozy-primary pixel-btn mt-3 w-full py-2.5 text-sm font-black sm:text-base">ดูเงินที่ได้รับในบทนี้</button>
      </div>
    </Modal>
  )
}
