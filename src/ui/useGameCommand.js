import { useCallback, useEffect, useRef, useState } from 'react'
import { executeCommand } from '../game/engine/command.js'

// UI-only adapter around the authoritative command boundary. It deliberately
// keeps command errors outside GameState: rejected commands must preserve the
// committed state object and the caller's local draft.
export function useGameCommand(createInitialState) {
  const [state, setState] = useState(createInitialState)
  const [commandError, setCommandError] = useState(null)
  const [busy, setBusy] = useState(false)
  const stateRef = useRef(state)
  const inFlightRef = useRef(false)

  stateRef.current = state

  // Keep the lock through the render caused by the command. This covers
  // double clicks/key presses dispatched before React paints the new state.
  useEffect(() => {
    if (!busy) return undefined
    const release = window.setTimeout(() => {
      inFlightRef.current = false
      setBusy(false)
    }, 0)
    return () => window.clearTimeout(release)
  }, [state, busy])

  const command = useCallback((input) => {
    if (inFlightRef.current) return { ok: false, state: stateRef.current, error: { code: 'DUPLICATE_SUBMIT', message: 'กำลังประมวลผลคำสั่งอยู่' } }

    inFlightRef.current = true
    setBusy(true)
    setCommandError(null)

    const result = executeCommand(stateRef.current, input)
    if (result.ok) {
      stateRef.current = result.state
      setState(result.state)
    } else {
      // Do not replace state on rejection. The returned reference is also
      // authoritative evidence that no partial transition occurred.
      setCommandError(result.error)
    }
    return result
  }, [])

  const clearCommandError = useCallback(() => setCommandError(null), [])

  return { state, command, busy, commandError, clearCommandError }
}
