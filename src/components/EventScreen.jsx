const EVENT_STYLE = {
  heal: {
    emoji: '💰',
    title: 'โบนัสนักลงทุน!',
    desc: 'พบโอกาสลงทุนที่ให้ผลตอบแทนดี Portfolio ของคุณเพิ่มขึ้น',
    border: 'border-emerald-400/40',
    chip: 'border-emerald-400/30 text-emerald-200',
    btn: 'bg-emerald-600',
    sign: '+',
  },
  accident: {
    emoji: '⚡',
    title: 'อุบัติเหตุทางการเงิน!',
    desc: 'เกิดเหตุไม่คาดฝันที่ทำให้ Portfolio ของคุณลดลง',
    border: 'border-rose-400/40',
    chip: 'border-rose-400/30 text-rose-200',
    btn: 'bg-rose-600',
    sign: '-',
  },
}

// หน้าแสดงผลลัพธ์โหนด Event ที่ไม่เกี่ยวกับการต่อสู้หรือการ์ด (ฟื้นพอร์ต / อุบัติเหตุพอร์ตลด)
export default function EventScreen({ result, onContinue }) {
  const cfg = EVENT_STYLE[result.kind] || EVENT_STYLE.heal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className={`pixel-frame w-full max-w-md border ${cfg.border} bg-slate-900 p-6 text-center`}>
        <div className="mb-1 text-4xl">{cfg.emoji}</div>
        <h2 className="mb-2 text-xl font-bold text-white">{cfg.title}</h2>
        <p className="mb-4 text-sm text-white/70">{cfg.desc}</p>
        <div className={`pixel-chip mb-4 border bg-black/30 p-3 text-sm ${cfg.chip}`}>
          Portfolio {result.before} → {result.after} ({cfg.sign}
          {result.amount})
        </div>
        <button type="button" onClick={onContinue} className={`pixel-btn px-6 py-2.5 font-semibold text-white ${cfg.btn}`}>
          ไปต่อ ➡
        </button>
      </div>
    </div>
  )
}
