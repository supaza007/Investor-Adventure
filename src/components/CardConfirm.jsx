import { useState } from 'react'
import { getCard } from '../game/reducer'

const TYPE_STYLE = {
  attack: 'from-rose-900/80 to-rose-950 border-rose-500/60',
  skill: 'from-sky-900/80 to-sky-950 border-sky-500/60',
  power: 'from-amber-900/80 to-amber-950 border-amber-500/60',
}

// หน้าต่างใช้การ์ดแบบ 2 จังหวะ: 1) อ่านความหมายก่อน 2) ยืนยันใช้ท้ายสุด
// ยกเลิกได้ทุกจังหวะ
export default function CardConfirm({ cardId, growthBonus = 0, passive, onConfirm, onCancel }) {
  const [step, setStep] = useState('info') // 'info' | 'confirm'
  const card = getCard(cardId)
  if (!card) return null

  const eff = card.effects || {}
  const atkBonus = passive?.attackBonus || 0

  // สรุปผลที่จะเกิดขึ้นจริง (รวม passive และค่าที่สะสม)
  const summary = []
  if (eff.attack != null) summary.push(`โจมตี ${eff.attack + growthBonus + atkBonus}`)
  if (eff.block != null) summary.push(`Block ${eff.block}`)
  if (eff.damageReduction != null) summary.push(`ลดดาเมจ ${Math.round(eff.damageReduction * 100)}% เทิร์นนี้`)
  if (eff.compound != null) summary.push(`ดอกเบี้ยทบต้น +${eff.compound}/เทิร์น`)
  if (eff.heal != null) summary.push(`เพิ่ม Portfolio ${eff.heal}`)
  if (eff.draw != null) summary.push(`จั่วการ์ด ${eff.draw} ใบ`)
  if (eff.selfDamage != null) summary.push(`เสีย Portfolio ตัวเอง ${eff.selfDamage}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="pixel-frame w-full max-w-sm border border-white/20 bg-slate-900 p-3 text-center sm:p-5">
        <div className="mb-2 text-xs font-semibold text-white/70 sm:mb-3 sm:text-sm">
          {step === 'info' ? '1/2 · อ่านทำความเข้าใจ' : '2/2 · ยืนยันการใช้การ์ด'}
        </div>

        {/* การ์ดที่เลือก */}
        <div
          className={`pixel-frame mx-auto flex w-36 flex-col border bg-gradient-to-b p-2 text-left sm:w-44 sm:p-3 ${
            TYPE_STYLE[card.type] || TYPE_STYLE.skill
          }`}
        >
          <div className="relative">
            <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-yellow-300 bg-yellow-500 text-[10px] font-bold text-yellow-950 sm:h-7 sm:w-7 sm:border-2 sm:text-xs">
              {card.cost}
            </div>
          </div>
          <div className="mt-1 text-center text-xs font-bold text-white sm:text-sm">{card.name}</div>
          <div className="mt-1 text-center text-[10px] leading-snug text-white/80 sm:mt-2 sm:text-xs sm:leading-relaxed">
            {card.blurb || card.description}
          </div>
        </div>

        {step === 'info' ? (
          <>
            {/* ความรู้การลงทุนของการ์ดใบนี้ */}
            <div className="mt-3 border-2 border-emerald-400/30 bg-emerald-950/40 p-2 text-left text-xs leading-relaxed text-emerald-200/90">
              💡 {card.lesson}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="pixel-btn flex-1 border border-slate-600 bg-slate-700 py-2.5 font-semibold text-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="pixel-btn flex-1 bg-sky-600 py-2.5 font-semibold text-white"
              >
                ถัดไป →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* สรุปผลจริง */}
            <div className="mt-3 rounded-lg bg-black/30 p-2 text-xs text-emerald-200/90">
              ผลที่จะเกิด: {summary.join(' · ')}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="pixel-btn flex-1 border border-slate-600 bg-slate-700 py-2.5 font-semibold text-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="pixel-btn flex-1 bg-emerald-600 py-2.5 font-semibold text-white"
              >
                ✓ ใช้การ์ด
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
