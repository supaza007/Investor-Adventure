import { useEffect, useState } from 'react'
import ChapterOpeningCard, { CHAPTER_OPENINGS } from './ChapterOpeningCard.jsx'

const DEMO_CHAPTERS = [
  { n: 1, ageFrom: 20, ageTo: 29, startValue: 10000 },
  { n: 2, ageFrom: 30, ageTo: 39, startValue: 24830 },
  { n: 3, ageFrom: 40, ageTo: 49, startValue: 46250 },
  { n: 4, ageFrom: 50, ageTo: 59, startValue: 73900 },
]

function currentChapter() {
  const value = Number(new URLSearchParams(window.location.search).get('chapter'))
  return DEMO_CHAPTERS.some((item) => item.n === value) ? value : 1
}

function ChapterSwitcher({ value, onChange }) {
  const index = DEMO_CHAPTERS.findIndex((item) => item.n === value)
  const cycle = (direction) => onChange(DEMO_CHAPTERS[(index + direction + DEMO_CHAPTERS.length) % DEMO_CHAPTERS.length].n)

  useEffect(() => {
    const handleKey = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.matches('input, textarea, [contenteditable="true"]')) return
      cycle(event.key === 'ArrowLeft' ? -1 : 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return <nav className="chapter-prototype-switcher" aria-label="เลือกดูบรรยากาศแต่ละบท">
    <button type="button" onClick={() => cycle(-1)} aria-label="บทก่อนหน้า">‹</button>
    <span><b>บท {value} / 4</b> — {CHAPTER_OPENINGS[index].title}</span>
    <button type="button" onClick={() => cycle(1)} aria-label="บทถัดไป">›</button>
  </nav>
}

export default function ChapterTransitionPrototype() {
  const [chapterNumber, setChapterNumber] = useState(currentChapter)
  const chapter = DEMO_CHAPTERS.find((item) => item.n === chapterNumber)

  const changeChapter = (next) => {
    const url = new URL(window.location.href)
    url.searchParams.set('chapter', next)
    window.history.replaceState({}, '', url)
    setChapterNumber(next)
  }

  return <main className="chapter-prototype-screen">
    <div className="chapter-prototype-screen__content">
      <ChapterOpeningCard key={chapterNumber} chapter={chapter} startValue={chapter.startValue} onContinue={() => {}} />
    </div>
    <ChapterSwitcher value={chapterNumber} onChange={changeChapter} />
  </main>
}
