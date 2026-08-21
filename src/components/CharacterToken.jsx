import { useEffect, useState } from 'react'
import { characterArtOf } from './art.js'

export default function CharacterToken({ style, state = 'idle', className = '', label = true }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [style?.id])
  if (!style) return null
  const art = characterArtOf(style.id)

  return (
    <div className={`cozy-character-token cozy-character--${state} ${className}`} aria-label={label ? `ตัวละคร ${style.name}` : undefined} aria-hidden={label ? undefined : 'true'}>
      {art && !failed ? <img src={art} alt="" className="h-full w-full object-contain object-bottom" onError={() => setFailed(true)} /> : <span aria-hidden="true">{style.emoji}</span>}
    </div>
  )
}
