import { useMemo } from 'react'
import { getReachableNodeIds } from '../game/reducer'

const NODE_EMOJI = { monster: '⚔️', boss: '👑', rest: '🏕️', card: '🎲' }

// หน้าแผนที่แนวนอนเส้นทางเดียว — ผู้เล่นเดินซ้ายไปขวาทีละโหนด
export default function MapScreen({ map, player, hero, onEnterNode }) {
  const reachableIds = useMemo(() => getReachableNodeIds(map), [map])

  const totalRows = map.rows.length

  // คำนวณตำแหน่ง % ของแต่ละโหนด — แถวเดียว: วางแนวนอนจากซ้ายไปขวา (col 0 ซ้ายสุด = จุดเริ่ม)
  const positions = useMemo(() => {
    const pos = {}
    map.rows.forEach((row) => {
      const cols = row.nodes.length
      row.nodes.forEach((node) => {
        const y = totalRows === 1 ? 50 : 100 - (row.row / (totalRows - 1)) * 100
        const x = cols === 1 ? 50 : 6 + (node.col / (cols - 1)) * 88
        pos[node.id] = { x, y }
      })
    })
    return pos
  }, [map, totalRows])

  const clearedCount = map.visitedNodeIds.length
  const totalCount = map.rows.reduce((sum, row) => sum + row.nodes.length, 0)
  const pct = Math.max(0, (player.portfolio / player.maxPortfolio) * 100)

  const nodeClassName = (node, reachable) => {
    if (node.cleared) return 'border-slate-600 bg-slate-800/60 text-slate-500 opacity-50'
    if (reachable) return 'border-amber-300 bg-amber-500/20 text-white play-pulse cursor-pointer'
    return 'border-slate-700 bg-slate-900/60 text-slate-600 opacity-40 cursor-not-allowed'
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-2 sm:px-4 sm:py-4">
        <header className="mb-2 flex shrink-0 items-center justify-between sm:mb-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl sm:text-3xl">{hero?.emoji}</div>
            <div>
              <div className="text-xs font-bold text-white sm:text-sm">{hero?.name}</div>
              <div className="text-[9px] text-white/50 sm:text-[11px]">แผนที่การผจญภัย</div>
            </div>
          </div>
          <div className="pixel-chip border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs">
            ผ่านแล้ว <span className="font-bold text-emerald-300">{clearedCount}</span>/{totalCount}
          </div>
        </header>

        <div className="mb-2 w-full shrink-0 sm:mb-3">
          <div className="pixel-bar h-4 w-full overflow-hidden bg-slate-800 sm:h-5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-0.5 text-center text-[10px] text-white/80 sm:text-xs">
            Portfolio {player.portfolio} / {player.maxPortfolio}
          </div>
        </div>

        {/* แผนที่แนวนอน */}
        <div className="pixel-frame relative mx-auto w-full flex-1 border border-slate-800 bg-slate-900/40" style={{ maxWidth: 960, minHeight: 60 }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {map.edges.map((e, i) => {
              const a = positions[e.from]
              const b = positions[e.to]
              if (!a || !b) return null
              const traveled = map.visitedNodeIds.includes(e.from) && map.visitedNodeIds.includes(e.to)
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={traveled ? '#ffd23f' : 'rgba(255,255,255,0.18)'}
                  strokeWidth={traveled ? 1.2 : 0.6}
                />
              )
            })}
          </svg>

          {map.rows.flatMap((row) =>
            row.nodes.map((node) => {
              const pos = positions[node.id]
              const reachable = reachableIds.includes(node.id)
              const disabled = !reachable || node.cleared
              return (
                <button
                  key={node.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onEnterNode(node.id)}
                  title={node.type}
                  className={`pixel-chip absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border
                    h-8 w-8 text-sm sm:h-11 sm:w-11 sm:text-xl ${nodeClassName(node, reachable)}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  {NODE_EMOJI[node.type]}
                </button>
              )
            }),
          )}
        </div>

        <div className="mt-1.5 flex shrink-0 flex-wrap justify-center gap-2 text-[9px] text-white/60 sm:mt-3 sm:gap-3 sm:text-[11px]">
          <span>⚔️ มอนสเตอร์</span>
          <span>👑 บอส</span>
          <span>🎲 Event</span>
          <span>🏕️ พัก</span>
        </div>
      </div>
    </div>
  )
}
