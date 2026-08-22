import { useState, useEffect, useRef } from 'react'
import { createInitialState, currentChapter } from './game/engine/gameState.js'
import CoverScreen from './components/CoverScreen'
import StyleSelect from './components/StyleSelect'
import AllocationScreen from './components/AllocationScreen'
import StageScreen from './components/StageScreen'
import ReportScreen from './components/ReportScreen'
import { useGameCommand } from './ui/useGameCommand.js'
import { PreAssessmentScreen, ConsentScreen, PostAssessmentScreen } from './components/LearningScreens.jsx'
import { buildLearningSummary } from './game/learning.js'
import { createSession, parseSession, serializeSession, SESSION_STORAGE_KEY } from './game/sessionStore.js'

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
  const { state, command, restoreState, busy, commandError, clearCommandError } = useGameCommand(() => createInitialState(Date.now()))
  const [journey, setJourney] = useState('cover')
  const [session, setSession] = useState(createSession)
  const [savedRun, setSavedRun] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // เปิดหน้าจัดพอร์ตซ้อนระหว่างสเตจ (สำหรับสไตล์ที่ปรับพอร์ตกลางบทได้)
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return
    const parsed = parseSession(raw)
    if (parsed.ok) setSavedRun(parsed.value)
    else setSaveError(parsed.error)
  }, [])

  useEffect(() => {
    if (journey === 'cover' || state.phase === 'cover') return
    try {
      const raw = serializeSession(session, state)
      window.localStorage.setItem(SESSION_STORAGE_KEY, raw)
      setSavedRun(parseSession(raw).value)
    } catch {
      setSaveError('SAVE_WRITE_FAILED')
    }
  }, [state, session, journey])

  const beginCore = (consent) => {
    setSession((s) => ({ ...s, consent: { researchTelemetry: consent, consentVersion: 'research-consent-v1', decidedAt: new Date().toISOString() }, timing: { ...s.timing, startedAt: new Date().toISOString() } }))
    command({ type: 'START' })
    setJourney('game')
  }

  const continueSaved = () => {
    if (!savedRun) return
    const restored = restoreState(savedRun.gameState)
    if (!restored.ok) { setSaveError(restored.error.code); return }
    setSession(savedRun.session)
    setJourney(savedRun.gameState.phase === 'report' ? 'report' : 'game')
  }

  const finishAssessment = (post) => {
    setSession((s) => ({ ...s, assessment: { ...s.assessment, post }, timing: { ...s.timing, endedAt: new Date().toISOString() } }))
    setJourney('report')
  }

  const restart = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setSavedRun(null)
    setSaveError(null)
    setSession(createSession())
    setJourney('cover')
    setAdjusting(false)
    command({ type: 'RESTART' })
  }

  if (journey === 'cover') return <CoverScreen onPlay={(player) => { setSession((s) => ({ ...s, player })); setJourney('pre') }} onContinue={savedRun ? continueSaved : null} saveError={saveError} />
  if (journey === 'pre') return <PreAssessmentScreen onComplete={(pre) => { setSession((s) => ({ ...s, assessment: { ...s.assessment, pre } })); setJourney('consent') }} onSkip={() => setJourney('consent')} />
  if (journey === 'consent') return <ConsentScreen onChoice={beginCore} />
  if (state.phase === 'report' && journey === 'game') return <PostAssessmentScreen onComplete={finishAssessment} onSkip={() => finishAssessment(null)} />

  if (state.phase === 'style') return <div className={busy ? 'pointer-events-none opacity-75' : ''} aria-busy={busy}>
    {busy && <div role="status" className="fixed inset-x-0 top-2 z-50 mx-auto w-fit bg-slate-950 px-4 py-2 text-sm text-white">กำลังเริ่มเกม…</div>}
    <StyleSelect onSelect={(styleId) => command({ type: 'SELECT_STYLE', styleId, at: new Date().toISOString() })} />
  </div>

  if (state.phase === 'allocation') {
    return (
      <AllocationScreen
        state={state}
        chapter={currentChapter(state)}
        isChapterStart
        onConfirm={(weights) => {
          command({ type: 'CONFIRM_ALLOCATION', weights })
        }}
        commandError={commandError}
        onDismissError={clearCommandError}
        submitting={busy}
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
            const result = command({ type: 'SET_ALLOCATION', weights })
            if (result.ok) setAdjusting(false)
          }}
          commandError={commandError}
          onDismissError={clearCommandError}
          submitting={busy}
        />
      )
    }
    return <StageScreen state={state} command={command} commandError={commandError} onDismissError={clearCommandError} submitting={busy} onAdjust={() => setAdjusting(true)} />
  }

  if (state.phase === 'report') {
    return <ReportScreen report={state.report} session={session} styleId={state.styleId} gameTiming={state.timing} learning={buildLearningSummary(session.assessment.pre, session.assessment.post)} onRestart={restart} />
  }

  return null
}
