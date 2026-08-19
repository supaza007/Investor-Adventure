import { getCard } from '../game/reducer'

// สีตามประเภทการ์ด (บอกใบ้ประเภทด้วยสี ไม่ต้องโชว์ตัวเลขพลัง)
const TYPE_STYLE = {
  attack: 'from-rose-900/70 to-rose-950 border-rose-500/60',
  skill: 'from-sky-900/70 to-sky-950 border-sky-500/60',
  power: 'from-amber-900/70 to-amber-950 border-amber-500/60',
}

export default function Card({ cardId, playable, onPlay }) {
  const card = getCard(cardId)
  if (!card) return null

  return (
    <button
      type="button"
      disabled={!playable}
      onClick={onPlay}
      className={`pixel-frame group relative flex shrink-0 flex-col border bg-gradient-to-b text-left
        h-28 w-24 p-1.5 sm:h-52 sm:w-40 sm:p-3
        ${TYPE_STYLE[card.type] || TYPE_STYLE.skill}
        ${playable
          ? 'cursor-pointer hover:-translate-y-3'
          : 'cursor-not-allowed opacity-50 saturate-50'}`}
    >
      {/* ค่า energy */}
      <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-yellow-300 bg-yellow-500 text-[10px] font-bold text-yellow-950 shadow sm:-left-2 sm:-top-2 sm:h-8 sm:w-8 sm:border-2 sm:text-sm">
        {card.cost}
      </div>

      <div className="mt-1 text-center text-[10px] font-bold leading-tight text-white sm:text-sm">
        {card.name}
      </div>

      <div className="mt-1 flex flex-1 items-center justify-center text-center text-[8px] leading-snug text-white/80 sm:mt-2 sm:text-xs sm:leading-relaxed">
        {card.blurb || card.description}
      </div>
    </button>
  )
}
