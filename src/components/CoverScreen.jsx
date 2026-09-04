import { useState } from 'react'
import { characterArtOf } from './art.js'
import coverBackground from '../assets/ui/cover-background-user.webp'
import gameSubtitle from '../assets/ui/cover-adventure-subtitle-user.webp'
import playButton from '../assets/ui/cover-start-button-user.webp'
import titleLogo from '../assets/title-logo.webp'

// พื้นหลังรุ่นเก่ายังโหลดแบบ optional เพื่อให้ build ผ่านได้ แม้ไม่มีไฟล์ SVG ต้นฉบับ
const ASSETS = import.meta.glob('../assets/title-*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const find = (name) => Object.entries(ASSETS).find(([p]) => p.includes(`/${name}.`))?.[1] ?? null

const titleBg = find('title-bg')
const GAME_TITLE = 'Investor Adventure'

// หน้าปกเกม: พื้นหลัง + ชื่อเกม + ปุ่ม Play
export default function CoverScreen({ onPlay, onContinue = null, saveError = null }) {
  const [studentName, setStudentName] = useState('')
  const [classRoom, setClassRoom] = useState('')
  const [inputError, setInputError] = useState('')
  const heroes = ['trader', 'vi', 'medium', 'longterm'].map((id) => ({ id, src: characterArtOf(id) })).filter((hero) => hero.src)
  const start = (event) => {
    event.preventDefault()
    const name = studentName.trim()
    const room = classRoom.trim()
    if (!name || !room) {
      setInputError('กรุณากรอกชื่อและห้องเรียนก่อนเริ่มเกม')
      return
    }
    onPlay({ studentName: name, classRoom: room })
  }
  return (
    <div
      className="cozy-cover relative flex min-h-[100dvh] flex-col items-center justify-start overflow-y-auto px-4 py-6 text-center sm:justify-center"
      style={
        coverBackground || titleBg
          ? { backgroundImage: `url(${coverBackground || titleBg})`, backgroundSize: 'cover', backgroundPosition: 'center', imageRendering: 'pixelated' }
          : { background: 'radial-gradient(ellipse at 50% 35%, #1e293b 0%, #0b0c15 70%)' }
      }
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/45 to-slate-950/95" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_60px_rgba(0,0,0,0.7)]" />

      <div className="relative z-10 flex flex-col items-center">
        {titleLogo ? (
          <img
            src={titleLogo}
            alt={GAME_TITLE}
            className="w-[min(80vw,620px)] max-h-[26vh] max-w-full object-contain drop-shadow-[0_6px_0_rgba(0,0,0,0.5)]"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <h1 className="cover-title px-2 text-[clamp(2rem,9vw,4.5rem)]" data-text={GAME_TITLE}>
            {GAME_TITLE}
          </h1>
        )}

        <img src={gameSubtitle} alt="ผจญภัยในโลกแห่งการลงทุน" className="cover-adventure-subtitle mt-1 object-contain" draggable="false" />

        <div className="cover-lower-content">
          {heroes.length > 0 && <div className="cozy-hero-lineup mt-2 flex h-[min(25vh,12rem)] items-end justify-center" aria-label="ตัวละครนักลงทุนทั้งสี่สไตล์">
            {heroes.map((hero) => <img key={hero.id} src={hero.src} alt="" className="h-full min-w-0 object-contain object-bottom" />)}
          </div>}

          <form onSubmit={start} className="mt-3 flex w-[min(90vw,22rem)] flex-col items-stretch gap-2 text-left">
          <label
            className="text-sm font-semibold leading-normal tracking-[0.03em] text-white/80"
            htmlFor="student-name"
            style={{ fontFamily: "Mali, var(--font-game)" }}
          >ชื่อผู้เล่น</label>
          <input
            id="student-name"
            value={studentName}
            onChange={(event) => { setStudentName(event.target.value); setInputError('') }}
            className="pixel-chip min-h-11 bg-slate-950/90 px-3 py-2 text-[10px] leading-normal text-white outline-none placeholder:text-white/55"
            style={{ fontFamily: "Mali, var(--font-game)" }}
            placeholder="กรอกชื่อหรือนามแฝง"
            maxLength={80}
            autoComplete="off"
          />
          <label
            className="text-sm font-semibold leading-normal tracking-[0.03em] text-white/80"
            htmlFor="class-room"
            style={{ fontFamily: "Mali, var(--font-game)" }}
          >ห้องเรียน</label>
          <input
            id="class-room"
            value={classRoom}
            onChange={(event) => { setClassRoom(event.target.value); setInputError('') }}
            className="pixel-chip min-h-11 bg-slate-950/90 px-3 py-2 text-[10px] leading-normal text-white outline-none placeholder:text-white/55"
            style={{ fontFamily: "Mali, var(--font-game)" }}
            placeholder="เช่น ม.6/3"
            maxLength={30}
            autoComplete="off"
          />
          {inputError && <p role="alert" className="text-[8px] leading-relaxed text-rose-200" style={{ fontFamily: "Mali, var(--font-game)" }}>{inputError}</p>}
          <button type="submit" aria-label="เริ่มเกม" className="cover-play-art pixel-btn play-pulse mt-1 self-center">
            <img src={playButton} alt="" className="cover-start-image block" draggable="false" />
            <span className="sr-only">START</span>
          </button>
          </form>

          {onContinue && <button type="button" onClick={onContinue} className="pixel-btn mx-auto mt-3 block w-fit bg-slate-700 px-8 py-2 text-center text-sm font-bold text-white">เล่นต่อจากเครื่องนี้</button>}

          {saveError && <p role="alert" className="mt-3 max-w-lg bg-rose-950/90 p-2 text-xs text-rose-100">เปิดข้อมูลที่บันทึกไว้ไม่ได้ ({saveError}) เกมใหม่ยังเล่นได้ตามปกติ</p>}

          <p className="mt-3 w-full text-center text-[8px] leading-relaxed text-white/70 sm:mt-4" style={{ fontFamily: "Mali, var(--font-game)" }}>กดปุ่ม START เพื่อเริ่มการผจญภัย</p>
        </div>
      </div>
    </div>
  )
}
