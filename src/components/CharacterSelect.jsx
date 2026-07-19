import { useState } from 'react'
import { getClasses, getCard } from '../game/reducer'
import PixelSprite from './PixelSprite'

const ROLE_STYLE = {
  stock: 'from-rose-900/60 to-rose-950 border-rose-500/50',
  mutual_fund: 'from-violet-900/60 to-violet-950 border-violet-500/50',
  bond: 'from-sky-900/60 to-sky-950 border-sky-500/50',
  derivatives: 'from-fuchsia-900/60 to-fuchsia-950 border-fuchsia-500/50',
  esg: 'from-emerald-900/60 to-emerald-950 border-emerald-500/50',
}

// หน้าเลือกตัวละครแบบสไลด์ (เลื่อนดูทีละตัว ตัวละครขยับตอนกำลังเลือก)
export default function CharacterSelect({ onSelect }) {
  const classes = getClasses()
  const [index, setIndex] = useState(0)
  const cls = classes[index]

  const prev = () => setIndex((i) => (i - 1 + classes.length) % classes.length)
  const next = () => setIndex((i) => (i + 1) % classes.length)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-6">
        <header className="mb-2 shrink-0 text-center sm:mb-5">
          <p className="game-subtitle text-xs sm:text-base">
            เลือกตัวละครของคุณ
          </p>
        </header>

        {/* แถบสไลด์: ปุ่มซ้าย | การ์ดตัวละคร | ปุ่มขวา */}
        <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="ตัวก่อนหน้า"
            className="pixel-btn shrink-0 bg-slate-700 px-2 py-3 text-base font-bold text-white sm:px-4 sm:py-6 sm:text-xl"
          >
            ◀
          </button>

          <div
            key={cls.id}
            className={`pixel-frame slide-in flex w-full max-w-md flex-col overflow-y-auto border bg-gradient-to-b p-3 sm:p-5 ${
              ROLE_STYLE[cls.id] || ROLE_STYLE.stock
            }`}
          >
            <div className="flex flex-col items-center">
              <PixelSprite id={cls.id} size={64} animate className="sm:hidden" />
              <PixelSprite id={cls.id} size={126} animate className="hidden sm:block" />
              <div className="sprite-shadow -mt-1 h-1.5 w-14 bg-black/60 sm:h-2 sm:w-20" />
            </div>

            <div className="mt-2 text-center sm:mt-3">
              <div className="text-base font-bold leading-tight sm:text-xl">{cls.name}</div>
              <div className="text-[10px] text-white/70 sm:text-xs">
                {cls.archetype} · {cls.role}
              </div>
            </div>

            <p className="mt-1 hidden text-center text-xs leading-relaxed text-white/80 sm:mt-2 sm:block">{cls.tagline}</p>

            <div className="mt-2 flex justify-center gap-2 text-[10px] sm:mt-3 sm:text-xs">
              <span className="pixel-chip bg-black/30 px-1.5 py-0.5 sm:px-2 sm:py-1">
                ❤️ <b className="text-emerald-300">{cls.startPortfolio}</b>
              </span>
              <span className="pixel-chip bg-black/30 px-1.5 py-0.5 sm:px-2 sm:py-1">
                ⚡ <b className="text-yellow-300">{cls.maxEnergy}</b>
              </span>
            </div>

            <div className="pixel-chip mt-2 bg-black/30 p-1.5 text-[10px] leading-snug text-amber-200/90 sm:mt-3 sm:p-2 sm:text-xs sm:leading-relaxed">
              ✨ {cls.passiveText}
            </div>

            <div className="mt-2 hidden sm:mt-3 sm:block">
              <div className="mb-1 text-center text-[10px] uppercase tracking-wide text-white/50">
                สำรับเริ่มต้น ({cls.deck.length} ใบ)
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {cls.deck.map((cardId, i) => (
                  <span
                    key={`${cardId}-${i}`}
                    className="bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80"
                  >
                    {getCard(cardId)?.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-2 hidden text-center text-[11px] leading-relaxed text-white/60 sm:mt-3 sm:block">
              💡 {cls.lesson}
            </div>

            <button
              type="button"
              onClick={() => onSelect(cls.id)}
              className="pixel-btn mt-2 w-full bg-white py-1.5 text-sm font-semibold text-slate-900 sm:mt-4 sm:py-2.5 sm:text-base"
            >
              เลือก {cls.name}
            </button>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="ตัวถัดไป"
            className="pixel-btn shrink-0 bg-slate-700 px-2 py-3 text-base font-bold text-white sm:px-4 sm:py-6 sm:text-xl"
          >
            ▶
          </button>
        </div>

        {/* จุดบอกตำแหน่ง */}
        <div className="mt-2 flex shrink-0 items-center justify-center gap-1 sm:mt-4 sm:gap-2">
          {classes.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={c.name}
              className={`pixel-chip px-1.5 py-0.5 text-[8px] sm:px-2 sm:py-1 sm:text-[10px] ${
                i === index
                  ? 'bg-yellow-500 font-bold text-yellow-950'
                  : 'bg-slate-800 text-white/60 hover:bg-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
