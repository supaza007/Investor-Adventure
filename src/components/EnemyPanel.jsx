import PixelSprite, { SPRITES } from './PixelSprite'

const INTENT_STYLE = {
  attack: 'border-rose-400/50 bg-rose-950/80 text-rose-200',
  defend: 'border-sky-400/50 bg-sky-950/80 text-sky-200',
  debuff: 'border-violet-400/50 bg-violet-950/80 text-violet-200',
}

function intentText(intent) {
  if (intent.type === 'attack') return `โจมตีด้วยท่า "${intent.label}" (ทำดาเมจ ${intent.value})`
  if (intent.type === 'defend') return `ตั้งการ์ดด้วยท่า "${intent.label}" (Block +${intent.value})`
  if (intent.type === 'debuff') return `ปล่อยท่า "${intent.label}" (เสี่ยงเพิ่มดาเมจ ${intent.value}%)`
  return intent.label
}

const INTENT_ICON = { attack: '⚔', defend: '🛡', debuff: '💢' }

// แสดงศัตรู + intent ล่วงหน้าแบบ Slay the Spire
export default function EnemyPanel({ enemy }) {
  const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100)
  const intent = enemy.intent
  const hasSprite = SPRITES[enemy.id]

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      {/* Intent ลอยเหนือหัว */}
      {intent && (
        <div className={`pixel-chip flex max-w-[10rem] items-center gap-1 border px-2 py-0.5 text-center text-[8px] font-semibold sm:max-w-[16rem] sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs ${INTENT_STYLE[intent.type] || INTENT_STYLE.attack}`}>
          <span className="text-xs sm:text-base">{INTENT_ICON[intent.type] || '⚔'}</span>
          <span>{intentText(intent)}</span>
        </div>
      )}

      {enemy.tier === 'boss' && (
        <div className="pixel-chip border border-amber-400/60 bg-amber-950/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300 sm:px-2 sm:text-[10px]">
          👑 บอส
        </div>
      )}

      {hasSprite ? (
        <div className="flex flex-col items-center">
          <PixelSprite id={enemy.id} size={80} className="enemy-idle sm:hidden" />
          <PixelSprite id={enemy.id} size={128} className="enemy-idle hidden sm:block" />
          <div className="sprite-shadow -mt-1 h-1.5 w-14 bg-black/60 sm:h-2 sm:w-20" />
        </div>
      ) : (
        <div className="text-4xl drop-shadow-lg sm:text-6xl">{enemy.emoji}</div>
      )}
      <div className="text-sm font-bold text-white sm:text-lg">{enemy.name}</div>

      {/* หลอดเลือดศัตรู */}
      <div className="w-32 sm:w-52">
        <div className="pixel-bar relative h-4 w-full overflow-hidden bg-slate-800 sm:h-5">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-rose-700"
            style={{ width: `${hpPct}%` }}
          />
          {enemy.block > 0 && (
            <div className="pixel-chip absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center border border-sky-200 bg-sky-500 text-[8px] font-bold text-white sm:-right-2 sm:-top-2 sm:h-8 sm:w-8 sm:border-2 sm:text-xs">
              🛡{enemy.block}
            </div>
          )}
        </div>
        <div className="mt-0.5 text-center text-[9px] text-white/80 sm:text-xs">
          HP {enemy.hp} / {enemy.maxHp}
        </div>
      </div>
    </div>
  )
}
