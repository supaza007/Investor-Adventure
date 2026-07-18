import PixelSprite, { SPRITES } from './PixelSprite'

// แสดงสถานะผู้เล่น: ตัวละคร, Portfolio (HP), Energy, Block, buff
export default function PlayerPanel({ player, buffs, hero }) {
  const pct = Math.max(0, (player.portfolio / player.maxPortfolio) * 100)
  const hasSprite = hero && SPRITES[hero.id]

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      {hasSprite ? (
        <div className="flex flex-col items-center">
          <PixelSprite id={hero.id} size={56} animate className="sm:hidden" />
          <PixelSprite id={hero.id} size={84} animate className="hidden sm:block" />
          <div className="sprite-shadow -mt-1 h-1 w-10 bg-black/60 sm:h-1.5 sm:w-14" />
        </div>
      ) : (
        <div className="text-3xl drop-shadow sm:text-5xl">{hero?.emoji ?? '🧑‍💼'}</div>
      )}
      <div className="text-sm font-bold text-white sm:text-lg">{hero?.name ?? 'นักลงทุน'} (คุณ)</div>
      {hero && (
        <div className="-mt-0.5 text-[8px] text-white/50 sm:-mt-1 sm:text-[10px]">
          {hero.archetype} · {hero.role}
        </div>
      )}
      {hero?.passiveText && (
        <div className="pixel-chip max-w-[10rem] border border-amber-400/30 bg-amber-950/50 px-1.5 py-0.5 text-center text-[8px] leading-snug text-amber-200/90 sm:max-w-[15rem] sm:px-2 sm:py-1 sm:text-[10px]">
          ✨ {hero.passiveText}
        </div>
      )}

      {/* Portfolio = HP */}
      <div className="w-32 sm:w-56">
        <div className="pixel-bar relative h-4 w-full overflow-hidden bg-slate-800 sm:h-6">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700"
            style={{ width: `${pct}%` }}
          />
          {player.block > 0 && (
            <div className="pixel-chip absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center border border-sky-200 bg-sky-500 text-[8px] font-bold text-white sm:-right-2 sm:-top-2 sm:h-8 sm:w-8 sm:border-2 sm:text-xs">
              🛡{player.block}
            </div>
          )}
        </div>
        <div className="mt-0.5 text-center text-[9px] text-white/80 sm:text-xs">
          Portfolio {player.portfolio} / {player.maxPortfolio}
        </div>
      </div>

      {/* Energy */}
      <div className="flex items-center gap-1 text-xs text-white sm:gap-2 sm:text-sm">
        <span className="font-semibold text-yellow-300">⚡</span>
        <div className="flex gap-0.5 sm:gap-1">
          {Array.from({ length: player.maxEnergy }).map((_, i) => (
            <span
              key={i}
              className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                i < player.energy
                  ? 'border-yellow-300 bg-yellow-500 text-yellow-950'
                  : 'border-slate-600 bg-slate-800 text-slate-600'
              }`}
            >
              ⚡
            </span>
          ))}
        </div>
        <span className="text-[10px] text-white/70 sm:text-sm">
          {player.energy}/{player.maxEnergy}
        </span>
      </div>

      {/* Buff ที่ทำงานอยู่ */}
      <div className="flex min-h-4 flex-wrap justify-center gap-1 sm:min-h-6 sm:gap-1.5">
        {buffs.compound > 0 && (
          <span className="rounded-full border border-amber-400/50 bg-amber-950/70 px-1.5 py-0.5 text-[8px] text-amber-200 sm:px-2 sm:text-xs">
            💰 +{buffs.compound}/เทิร์น
          </span>
        )}
        {buffs.damageReduction > 0 && (
          <span className="rounded-full border border-sky-400/50 bg-sky-950/70 px-1.5 py-0.5 text-[8px] text-sky-200 sm:px-2 sm:text-xs">
            🛡 -{Math.round(buffs.damageReduction * 100)}%
          </span>
        )}
        {player.vulnerable?.remaining > 0 && (
          <span className="rounded-full border border-violet-400/50 bg-violet-950/70 px-1.5 py-0.5 text-[8px] text-violet-200 sm:px-2 sm:text-xs">
            💢 +{Math.round(player.vulnerable.pct * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
