// ⚠️ ไม่ import รูปหน้าปกตรงๆ ด้วยเหตุผลเดียวกับ art.js — ไฟล์รูปไม่ถูก commit ขึ้น git
// เครื่องที่มีไฟล์ → ใช้โลโก้/พื้นหลังจริง · เครื่องที่ไม่มี (GitHub Actions) → ใช้ชื่อเกมแบบตัวอักษร
// สไตล์ .cover-title (ตัวทองขอบคู่) มีอยู่ใน index.css อยู่แล้ว จึงไม่ได้ดูเหมือนของขาด
const ASSETS = import.meta.glob('../assets/title-*.{webp,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const find = (name) => Object.entries(ASSETS).find(([p]) => p.includes(`/${name}.`))?.[1] ?? null

const titleBg = find('title-bg')
const titleLogo = find('title-logo')

const GAME_TITLE = 'พอร์ตพิชิตเงินเฟ้อ'

// หน้าปกเกม: พื้นหลัง + ชื่อเกม + ปุ่ม Play
export default function CoverScreen({ onPlay, onContinue = null, saveError = null }) {
  return (
    <div
      className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 text-center"
      style={
        titleBg
          ? { backgroundImage: `url(${titleBg})`, backgroundSize: 'cover', backgroundPosition: 'center', imageRendering: 'pixelated' }
          : { background: 'radial-gradient(ellipse at 50% 35%, #1e293b 0%, #0b0c15 70%)' }
      }
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_60px_rgba(0,0,0,0.7)]" />

      <div className="relative z-10 flex flex-col items-center">
        {titleLogo ? (
          <img
            src={titleLogo}
            alt={GAME_TITLE}
            className="w-[min(80vw,620px)] max-h-[30vh] max-w-full object-contain drop-shadow-[0_6px_0_rgba(0,0,0,0.5)]"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <h1 className="cover-title px-2 text-[clamp(2rem,9vw,4.5rem)]" data-text={GAME_TITLE}>
            {GAME_TITLE}
          </h1>
        )}

        <p className="game-subtitle mt-2 text-xs text-white/85 sm:text-base">เส้นทางชีวิตนักลงทุน · อายุ 20 ถึงเกษียณ</p>

        <button
          type="button"
          onClick={onPlay}
          className="pixel-btn play-pulse mt-6 bg-emerald-500 px-10 py-3 text-xl font-extrabold tracking-widest text-emerald-950 sm:mt-10 sm:px-14 sm:py-4 sm:text-2xl"
        >
          ▶ PLAY
        </button>

        {onContinue && <button type="button" onClick={onContinue} className="pixel-btn mt-3 bg-slate-700 px-8 py-2 text-sm font-bold text-white">เล่นต่อจากเครื่องนี้</button>}

        {saveError && <p role="alert" className="mt-3 max-w-lg bg-rose-950/90 p-2 text-xs text-rose-100">เปิดข้อมูลที่บันทึกไว้ไม่ได้ ({saveError}) เกมใหม่ยังเล่นได้ตามปกติ</p>}

        <p className="mt-3 text-[10px] text-white/50 sm:mt-4 sm:text-xs">กดปุ่ม PLAY เพื่อเริ่มการผจญภัย</p>
      </div>
    </div>
  )
}
