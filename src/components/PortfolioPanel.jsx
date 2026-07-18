import { getTool } from '../game/engine/data/tools.js'
import { totalValue } from '../game/engine/portfolio.js'
import { colorOf, money } from './ToolTheme'

// แถบสรุปพอร์ต — แสดงตลอดทุกหน้าจอ ผู้เล่นต้องเห็นเสมอว่าตัวเองถืออะไรอยู่
// (เกมเดิมซ่อนสำรับไว้ในกองจั่ว ผู้เล่นเลยไม่เคยคิดถึงภาพรวมพอร์ตเลย)
export default function PortfolioPanel({ positions, cash, compact = false }) {
  const invested = totalValue(positions)
  const total = invested + cash
  const rows = Object.entries(positions)
    .filter(([, v]) => v > 0.5)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="pixel-frame border border-slate-800 bg-slate-900/60 p-2 sm:p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wide text-white/50 sm:text-xs">พอร์ตของคุณ</span>
        <span className="text-sm font-bold text-emerald-300 sm:text-lg">{money(total)}</span>
      </div>

      {/* แถบสัดส่วนรวม — เห็นการกระจายความเสี่ยงเป็นภาพในแวบเดียว */}
      <div className="pixel-bar mb-1.5 flex h-3 w-full overflow-hidden bg-slate-950 sm:h-4">
        {rows.map(([id, v]) => (
          <div key={id} className={colorOf(id).bar} style={{ width: `${(v / total) * 100}%` }} title={getTool(id)?.name} />
        ))}
        {cash > 0.5 && <div className={colorOf('cash').bar} style={{ width: `${(cash / total) * 100}%` }} title="เงินสด" />}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1">
          {rows.map(([id, v]) => {
            const tool = getTool(id)
            return (
              <span key={id} className={`pixel-chip bg-black/40 px-1.5 py-0.5 text-[9px] sm:text-[11px] ${colorOf(id).text}`}>
                {tool?.name} {money(v)}
                <span className="text-white/40"> · {Math.round((v / total) * 100)}%</span>
              </span>
            )
          })}
          {cash > 0.5 && (
            <span className="pixel-chip bg-black/40 px-1.5 py-0.5 text-[9px] text-slate-300 sm:text-[11px]">
              เงินสด {money(cash)}
              <span className="text-white/40"> · {Math.round((cash / total) * 100)}%</span>
            </span>
          )}
          {rows.length === 0 && cash <= 0.5 && <span className="text-[10px] text-white/40">ไม่มีสินทรัพย์เหลือ</span>}
        </div>
      )}
    </div>
  )
}
