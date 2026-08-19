// หน้าสรุปเมื่อจบเกม (ชนะ/แพ้)
export default function GameOverScreen({ phase, state, onRestart }) {
  const won = phase === 'won'
  const accidentDeath = !won && state.deathCause === 'accident'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        className={`pixel-frame w-full max-w-lg border p-8 text-center ${
          won ? 'border-emerald-400/50 bg-emerald-950/90' : 'border-rose-400/50 bg-rose-950/90'
        }`}
      >
        <div className="mb-3 text-6xl">{won ? '🏆' : '💸'}</div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          {won ? 'พอร์ตโตพิชิตทุกศัตรู!' : accidentDeath ? 'พอร์ตแตก! อุบัติเหตุทางการเงิน' : `พอร์ตแตก! ${state.enemy?.name ?? 'ศัตรู'} ชนะ`}
        </h2>
        <p className="mb-6 text-sm text-white/80">
          {won
            ? 'คุณเอาชนะทั้งเงินเฟ้อและความโลภได้ด้วยกลยุทธ์การลงทุนที่ดี — ลงทุนสม่ำเสมอ กระจายความเสี่ยง และปล่อยให้ดอกเบี้ยทบต้นทำงาน'
            : accidentDeath
              ? 'เหตุไม่คาดฝันระหว่างทางทำให้มูลค่าพอร์ตของคุณหมดลง ลองใหม่ด้วยการสำรองพอร์ตให้หนาขึ้นก่อนเดินหน้าต่อ'
              : `มูลค่าพอร์ตของคุณถูก${state.enemy?.name ?? 'ศัตรู'}กัดกินจนหมด ลองใหม่ด้วยการสร้างเกราะป้องกันและพลังทบต้นให้เร็วขึ้น`}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <Stat label="เทิร์นที่ใช้" value={state.turn} />
          <Stat label="Portfolio คงเหลือ" value={`${state.player.portfolio}/${state.player.maxPortfolio}`} />
          {accidentDeath ? (
            <Stat label="สาเหตุ" value="อุบัติเหตุ" />
          ) : (
            <Stat label="HP ศัตรูคงเหลือ" value={`${state.enemy?.hp ?? '-'}/${state.enemy?.maxHp ?? '-'}`} />
          )}
          <Stat label="ดอกเบี้ยทบต้นสะสม" value={`+${state.buffs.compound}/เทิร์น`} />
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="pixel-btn bg-white px-6 py-2.5 font-semibold text-slate-900"
        >
          เล่นอีกครั้ง
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="pixel-chip bg-black/30 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}
