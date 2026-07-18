import { useReducer, useState, useEffect, useRef } from 'react'
import { gameReducer, createInitialState, currentChapter } from './game/engine/gameState.js'
import CoverScreen from './components/CoverScreen'
import StyleSelect from './components/StyleSelect'
import AllocationScreen from './components/AllocationScreen'
import StageScreen from './components/StageScreen'
import ReportScreen from './components/ReportScreen'

// เสียงคลิกปุ่มแบบสังเคราะห์ด้วย Web Audio — ไม่ใช้ไฟล์เสียงเลย
//
// ทำไมไม่ใช้ไฟล์ mp3: ไฟล์เสียงเดิมไม่ทราบเจ้าของลิขสิทธิ์เหมือนกับไฟล์ภาพ
// การสังเคราะห์เองแก้ปัญหาได้หมดจด — ไม่มีไฟล์ให้แจกจ่าย ไม่กินแบนด์วิดท์ และได้เสียง
// บลิปสั้นแบบเกมพิกเซลที่เข้ากับธีมอยู่แล้ว
//
// สร้าง AudioContext ครั้งเดียวแล้วใช้ซ้ำ (เบราว์เซอร์จำกัดจำนวน context ต่อหน้า)
// และสร้างตอนคลิกครั้งแรกเท่านั้น เพราะเบราว์เซอร์บล็อกการเล่นเสียงก่อนผู้ใช้โต้ตอบ
function useClickSound() {
  const ctxRef = useRef(null)
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('button')) return
      try {
        if (!ctxRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          if (!AudioCtx) return
          ctxRef.current = new AudioCtx()
        }
        const ctx = ctxRef.current
        if (ctx.state === 'suspended') ctx.resume()

        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // คลื่นสี่เหลี่ยม + ความถี่ตกเร็ว = เสียง "ป๊อก" แบบเครื่องเกม 8 บิต
        osc.type = 'square'
        osc.frequency.setValueAtTime(880, t)
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.06)

        // ลดเสียงลงเป็นเส้นโค้งจนเงียบสนิท ป้องกันเสียง "ปั้ก" ตอนตัดกะทันหัน
        gain.gain.setValueAtTime(0.12, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)

        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.09)
      } catch {
        // เล่นเสียงไม่ได้ก็ไม่เป็นไร เกมต้องเล่นต่อได้ปกติ
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])
}

export default function App() {
  useClickSound()
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(Date.now()))

  // เปิดหน้าจัดพอร์ตซ้อนระหว่างสเตจ (สำหรับสไตล์ที่ปรับพอร์ตกลางบทได้)
  const [adjusting, setAdjusting] = useState(false)

  if (state.phase === 'cover') return <CoverScreen onPlay={() => dispatch({ type: 'START' })} />

  if (state.phase === 'style') return <StyleSelect onSelect={(styleId) => dispatch({ type: 'SELECT_STYLE', styleId })} />

  if (state.phase === 'allocation') {
    return (
      <AllocationScreen
        state={state}
        chapter={currentChapter(state)}
        isChapterStart
        onConfirm={(weights) => {
          dispatch({ type: 'SET_ALLOCATION', weights })
          dispatch({ type: 'CONFIRM_ALLOCATION' })
        }}
      />
    )
  }

  if (state.phase === 'stage') {
    if (adjusting) {
      return (
        <AllocationScreen
          state={state}
          chapter={currentChapter(state)}
          onConfirm={(weights) => {
            dispatch({ type: 'SET_ALLOCATION', weights })
            setAdjusting(false)
          }}
        />
      )
    }
    return <StageScreen state={state} dispatch={dispatch} onAdjust={() => setAdjusting(true)} />
  }

  if (state.phase === 'report') {
    return <ReportScreen report={state.report} onRestart={() => dispatch({ type: 'RESTART' })} />
  }

  return null
}
