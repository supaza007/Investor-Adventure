// debug panel เปิด/ปิดได้ แสดงข้อมูลภายในเกม
export default function DebugPanel({ state, open, onToggle }) {
  return (
    <div className="fixed bottom-3 right-3 z-40 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="pixel-btn border border-slate-600 bg-slate-800 px-3 py-1.5 font-mono text-slate-300"
      >
        {open ? '✕ ปิด Debug' : '🐞 Debug'}
      </button>

      {open && (
        <div className="pixel-frame mt-2 w-64 border border-slate-600 bg-slate-900/95 p-3 font-mono text-slate-300">
          <div className="mb-1 font-bold text-slate-100">Debug Panel</div>
          <Row label="คลาส" value={state.hero?.name ?? '-'} />
          <Row label="เทิร์น" value={state.turn} />
          <Row label="phase" value={state.phase} />
          <Row label="โหนดปัจจุบัน" value={state.map?.currentNodeId ?? '-'} />
          <Row
            label="ผ่านแล้ว/ทั้งหมด"
            value={
              state.map
                ? `${state.map.visitedNodeIds.length}/${state.map.rows.reduce((s, r) => s + r.nodes.length, 0)}`
                : '-'
            }
          />
          <hr className="my-1 border-slate-700" />
          <Row label="ดาเมจที่ทำล่าสุด" value={state.debug.lastDamageDealt} />
          <Row label="ดาเมจที่รับล่าสุด" value={state.debug.lastDamageTaken} />
          <Row label="Block ที่ได้ล่าสุด" value={state.debug.lastBlockGained} />
          <Row label="Block ผู้เล่น" value={state.player.block} />
          <Row label="Block ศัตรู" value={state.enemy?.block ?? '-'} />
          <Row
            label="เปราะบาง (vulnerable)"
            value={
              state.player.vulnerable?.remaining > 0
                ? `+${Math.round(state.player.vulnerable.pct * 100)}%`
                : '-'
            }
          />
          <hr className="my-1 border-slate-700" />
          <Row label="Master deck (ครอบครอง)" value={state.masterDeck.length} />
          <Row label="Draw pile" value={state.drawPile.length} />
          <Row label="Hand" value={state.hand.length} />
          <Row label="Discard pile" value={state.discardPile.length} />
          <hr className="my-1 border-slate-700" />
          <Row label="ดอกเบี้ยทบต้น" value={state.buffs.compound} />
          <Row label="ลดดาเมจ" value={`${Math.round(state.buffs.damageReduction * 100)}%`} />
          <Row label="DCA bonus (ถาวร)" value={state.meta.cardGrowth.dca || 0} />
          <hr className="my-1 border-slate-700" />
          <div className="mb-0.5 text-slate-400">Log ล่าสุด:</div>
          <div className="max-h-24 space-y-0.5 overflow-y-auto text-[10px] text-slate-400">
            {state.log.slice(0, 6).map((l, i) => (
              <div key={i}>• {l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100">{value}</span>
    </div>
  )
}
