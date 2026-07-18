// จุดพักผ่อนบนแผนที่ — ฟื้น Portfolio 30% ของค่าสูงสุด (ขั้นต่ำ 10) แล้วกลับแผนที่
export default function RestScreen({ player, onRest }) {
  const healAmount = Math.max(10, Math.round(player.maxPortfolio * 0.3))
  const preview = Math.min(player.maxPortfolio, player.portfolio + healAmount)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="pixel-frame w-full max-w-md border border-emerald-400/40 bg-slate-900 p-6 text-center">
        <div className="mb-1 text-4xl">🏕️</div>
        <h2 className="mb-2 text-xl font-bold text-white">จุดพักผ่อน</h2>
        <p className="mb-4 text-sm text-white/70">พักฟื้น Portfolio ก่อนเดินทางต่อ</p>
        <div className="pixel-chip mb-4 border border-emerald-400/30 bg-black/30 p-3 text-sm text-emerald-200">
          Portfolio {player.portfolio} → {preview} (+{preview - player.portfolio})
        </div>
        <button
          type="button"
          onClick={onRest}
          className="pixel-btn bg-emerald-600 px-6 py-2.5 font-semibold text-white"
        >
          พักผ่อน 🌿
        </button>
      </div>
    </div>
  )
}
