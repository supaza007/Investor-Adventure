import { getCard } from '../game/reducer'

const TYPE_STYLE = {
  attack: 'from-rose-900/70 to-rose-950 border-rose-500/60',
  skill: 'from-sky-900/70 to-sky-950 border-sky-500/60',
  power: 'from-amber-900/70 to-amber-950 border-amber-500/60',
}

const TYPE_LABEL = { attack: 'โจมตี', skill: 'ป้องกัน', power: 'พลัง' }

const REASON_TEXT = {
  battle: { title: 'ชนะแล้ว! รับการ์ดใหม่ 1 ใบ', desc: 'เลือกการ์ด 1 ใน 2 ใบไปเสริมสำรับสำหรับสู้ศัตรูตัวถัดไป' },
  event: { title: 'พบโอกาสการลงทุนพิเศษ!', desc: 'เลือกการ์ด 1 ใน 2 ใบไปเสริมสำรับของคุณ' },
}

// หน้าเลือกการ์ดรางวัล (เลือก 1 ใน 2) — เกิดจากการฆ่าศัตรู (battle) หรือโหนด Event (event)
export default function RewardScreen({ choices, reason = 'battle', onChoose }) {
  const text = REASON_TEXT[reason] || REASON_TEXT.battle
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <div className="pixel-frame w-full max-w-2xl border border-yellow-400/40 bg-slate-900 p-3 text-center sm:p-6">
        <div className="mb-1 text-2xl sm:text-4xl">🎉</div>
        <h2 className="mb-1 text-sm font-bold text-white sm:text-xl">{text.title}</h2>
        <p className="mb-3 text-xs text-white/60 sm:mb-6 sm:text-sm">{text.desc}</p>

        <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-4">
          {choices.map((cardId) => {
            const card = getCard(cardId)
            return (
              <button
                key={cardId}
                type="button"
                onClick={() => onChoose(cardId)}
                className={`pixel-frame group relative flex w-36 flex-col border bg-gradient-to-b p-2 text-left transition hover:-translate-y-2 sm:w-52 sm:p-4
                  ${TYPE_STYLE[card.type] || TYPE_STYLE.skill}`}
              >
                <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-yellow-300 bg-yellow-500 text-[10px] font-bold text-yellow-950 shadow sm:-left-2 sm:-top-2 sm:h-8 sm:w-8 sm:border-2 sm:text-sm">
                  {card.cost}
                </div>
                <div className="mt-1 text-center text-xs font-bold text-white sm:text-base">{card.name}</div>
                <div className="mt-0.5 text-center text-[8px] uppercase tracking-wide text-white/50 sm:text-[10px]">
                  {TYPE_LABEL[card.type]}
                </div>
                <div className="mt-1.5 text-center text-[10px] leading-snug text-white/85 sm:mt-3 sm:text-sm sm:leading-relaxed">
                  {card.blurb || card.description}
                </div>
                <div className="mt-1.5 border border-black/40 bg-black/30 p-1.5 text-[9px] leading-snug text-emerald-200/90 sm:mt-3 sm:border-2 sm:p-2 sm:text-xs sm:leading-relaxed">
                  💡 {card.lesson}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
