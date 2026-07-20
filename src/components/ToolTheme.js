// สีประจำเครื่องมือแต่ละชนิด — ใช้ร่วมกันทุกหน้าจอ เพื่อให้ผู้เล่นจำสีได้ว่าอันไหนคืออะไร
export const TOOL_COLOR = {
  bond: { bar: 'bg-sky-400', text: 'text-sky-300', border: 'border-sky-500/50', grad: 'from-sky-900/60 to-sky-950' },
  esg: { bar: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/50', grad: 'from-emerald-900/60 to-emerald-950' },
  fund: { bar: 'bg-violet-400', text: 'text-violet-300', border: 'border-violet-500/50', grad: 'from-violet-900/60 to-violet-950' },
  stock: { bar: 'bg-rose-400', text: 'text-rose-300', border: 'border-rose-500/50', grad: 'from-rose-900/60 to-rose-950' },
  derivatives: { bar: 'bg-fuchsia-400', text: 'text-fuchsia-300', border: 'border-fuchsia-500/50', grad: 'from-fuchsia-900/60 to-fuchsia-950' },
  crypto: { bar: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-500/50', grad: 'from-amber-900/60 to-amber-950' },
  cash: { bar: 'bg-slate-400', text: 'text-slate-300', border: 'border-slate-500/50', grad: 'from-slate-800/60 to-slate-950' },
}

export const colorOf = (id) => TOOL_COLOR[id] ?? TOOL_COLOR.cash

// แสดงเงินแบบไม่มีทศนิยม — นักเรียนไม่ต้องอ่านเลขยาว
//
// ต่อท้าย ฿ ในฟังก์ชันนี้ที่เดียว ห้ามไปเติมเองที่หน้าจอ — ก่อนหน้านี้มีแค่การ์ดในหน้าจัดพอร์ต
// ที่เขียน {money(x)}฿ ทำให้ที่อื่นทั้งเกมขึ้นเลขเปล่า เช่น "พอร์ตคุณเพิ่งเสียไป 9" ซึ่งอ่านไม่ออกว่า
// เก้าอะไร (บาท? หมื่นบาท?) หน่วยต้องมาคู่กับตัวเลขเสมอ ไม่งั้นตัวเลขไม่มีความหมาย
export const money = (n) => `${Math.round(n).toLocaleString('th-TH')}฿`
export const pct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`
