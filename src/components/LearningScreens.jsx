import { useState } from 'react'
import { PRE_QUESTIONS, POST_QUESTIONS, scoreAssessment } from '../game/learning.js'
import preAssessmentBackground from '../assets/ui/pre-assessment-background-user.webp'
import preAssessmentDisclaimer from '../assets/ui/pre-assessment-disclaimer-user.webp'
import preAssessmentEyebrow from '../assets/ui/pre-assessment-eyebrow-user.webp'
import preAssessmentFrame from '../assets/ui/pre-assessment-frame-user.webp'
import preAssessmentOptionFrame from '../assets/ui/pre-assessment-answer-option-frame-user.webp'
import preAssessmentOptionSelected from '../assets/ui/pre-assessment-answer-option-selected-user.webp'
import preAssessmentQuestionBadge from '../assets/ui/pre-assessment-question-number-badge-user.webp'
import preAssessmentTitle from '../assets/ui/pre-assessment-title-user.webp'
import consentBackground from '../assets/ui/consent-background-user.webp'

// โครงหน้ากลางของหน้าแบบประเมินและหน้าการเรียนรู้
// ปรับได้: className, สีพื้นหลัง, ระยะห่าง และความกว้างของเนื้อหา
function Shell({ title, eyebrow, children, className = '', style = {}, contentClassName = 'max-w-2xl' }) {
  return <main className={`cozy-screen min-h-[100dvh] overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-3 py-5 text-white ${className}`} style={style}>
    <div className={`mx-auto ${contentClassName}`}>
      {eyebrow && <p className="text-xs uppercase tracking-widest text-emerald-300">{eyebrow}</p>}
      {title && <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-4xl">{title}</h1>}
      {children}
    </div>
  </main>
}

// แบบฟอร์มคำถามที่ใช้ร่วมกันทั้งแบบประเมินก่อนเล่นและหลังเล่น
// ปรับได้: actionLabel, ปุ่มข้าม, ข้อความแจ้งเตือน และรูปแบบคำตอบ
function Questions({ questions, actionLabel, onSubmit, onSkip, className = '' }) {
  const [answers, setAnswers] = useState({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [error, setError] = useState('')
  const question = questions[questionIndex]
  const selectedAnswer = question ? answers[question.id] : null
  const isLastQuestion = questionIndex === questions.length - 1

  const submit = (event) => {
    event.preventDefault()
    const result = scoreAssessment(questions, answers)
    if (!result) { setError('กรุณาตอบทุกข้อ หรือเลือกข้ามแบบสะท้อนนี้'); return }
    onSubmit(result)
  }
  const continueToNext = () => {
    if (selectedAnswer == null) { setError('กรุณาเลือกคำตอบก่อนดำเนินการต่อ'); return }
    setError('')
    setQuestionIndex((index) => Math.min(index + 1, questions.length - 1))
  }
  const goBack = () => {
    setError('')
    setQuestionIndex((index) => Math.max(index - 1, 0))
  }
  return <form onSubmit={submit} className={`mt-4 space-y-5 ${className}`} noValidate>
    <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest text-emerald-200" aria-live="polite">
      <span>คำถามที่ {questionIndex + 1} / {questions.length}</span>
      <span aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
        <span className="block h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
      </span>
    </div>
    {question && <fieldset key={question.id} className="assessment-question-card min-w-0" style={{ borderImageSource: `url(${preAssessmentFrame})` }}>
      <div className="assessment-question-card__content">
        <legend className="assessment-question-legend max-w-full break-words px-1 font-bold leading-snug" style={{ backgroundImage: `url(${preAssessmentTitle})` }}>
          <span className="assessment-question-badge" style={{ backgroundImage: `url(${preAssessmentQuestionBadge})` }} aria-hidden="true">{questionIndex + 1}</span>
          <span className="sr-only">ข้อ {questionIndex + 1}: </span>
          <span className="min-w-0 flex-1 break-words">{question.prompt}</span>
        </legend>
        <div className="mt-3 grid min-w-0 gap-2">{question.options.map(([value, label], optionIndex) => {
          const selected = selectedAnswer === value
          const isLongOption = label.trim().length > 28
          return <label
            key={value}
            className={`assessment-answer-row ${isLongOption ? 'assessment-answer-row--long' : ''} ${optionIndex % 2 === 0 ? 'assessment-answer-row--left' : 'assessment-answer-row--right'} flex min-h-11 min-w-0 cursor-pointer items-center gap-3 leading-snug ${selected ? 'assessment-answer-row--selected' : ''}`}
            style={{
              backgroundImage: `url(${selected ? preAssessmentOptionSelected : preAssessmentOptionFrame})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
            }}
          >
            <input className="sr-only" type="radio" name={question.id} value={value} checked={selected} onChange={() => { setAnswers((a) => ({ ...a, [question.id]: value })); setError('') }} />
            <span className="assessment-answer-row__text min-w-0 flex-1 break-words">{label}</span>
          </label>
        })}</div>
      </div>
    </fieldset>}
    {error && <p role="alert" className="pixel-chip min-w-0 break-words bg-rose-950 p-3 text-rose-100">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {questionIndex > 0 && <button className="pixel-btn min-h-11 flex-1 border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white" type="button" onClick={goBack}>ย้อนกลับ</button>}
      {isLastQuestion
        ? <button className="pixel-btn min-h-11 flex-1 bg-emerald-500 px-4 py-3 font-bold text-emerald-950" type="submit">{actionLabel}</button>
        : <button className="pixel-btn min-h-11 flex-1 bg-emerald-500 px-4 py-3 font-bold text-emerald-950" type="button" onClick={continueToNext}>ถัดไป</button>}
    </div>
    {onSkip && <button type="button" className="mx-auto block min-h-11 px-3 py-2 text-xs font-bold text-white/60 underline underline-offset-4 hover:text-white" onClick={onSkip}>ข้ามแบบประเมินนี้</button>}
  </form>
}

// หน้าแบบประเมินก่อนเริ่มเกม
// ปรับข้อความและภาพแถบหัวข้อได้ที่บรรทัดด้านล่าง
export function PreAssessmentScreen({ onComplete, onSkip }) {
  return <Shell
    eyebrow=""
    title=""
    className="pre-assessment-screen"
    style={{ backgroundImage: `linear-gradient(180deg, rgba(3,7,18,.25), rgba(3,7,18,.86)), url(${preAssessmentBackground})` }}
    contentClassName="max-w-4xl"
  >
    {/* TEXT: “ก่อนเริ่มเกม” — ป้ายเล็กด้านบน; ปรับขนาดที่ text-xl */}
    <p className="sr-only" aria-hidden="true" style={{ backgroundImage: `url(${preAssessmentEyebrow})` }}>ก่อนเริ่มเกม</p>
    {/* TEXT: “แบบประเมินของผู้กล้า” — หัวข้อใหญ่; ปรับขนาดที่ text-3xl / sm:text-4xl */}
    <h1 className="assessment-scroll-label assessment-scroll-label--title mt-1 break-words text-3xl font-black leading-tight text-amber-950 sm:text-4xl" style={{ backgroundImage: `url(${preAssessmentTitle})` }}>แบบประเมินของผู้กล้า</h1>
    {/* TEXT: คำอธิบายใต้หัวข้อ; ปรับขนาดที่ text-2xl */}
    <p className="assessment-scroll-label assessment-scroll-label--disclaimer mt-2 min-w-0 break-words text-2xl leading-relaxed text-amber-950" style={{ backgroundImage: `url(${preAssessmentDisclaimer})` }}>อยากรู้ไหมว่า คุณรับความเสี่ยงได้มากแค่ไหน ลองตอบคำถามพวกนี้ดูสิ!!</p>
    <section className="pre-assessment-panel mt-4">
      <div className="pre-assessment-panel__content">
        {/* PRE_QUESTIONS คือชุดคำถามที่แสดงในหน้านี้ */}
        <Questions questions={PRE_QUESTIONS} actionLabel="บันทึกและไปต่อ" onSubmit={onComplete} onSkip={onSkip} className="pre-assessment-questions" />
      </div>
    </section>
  </Shell>
}

export function ConsentScreen({ onChoice }) {
  const [telemetry, setTelemetry] = useState(false)
  return <Shell
    eyebrow="การวิจัยเป็นทางเลือก"
    title="การยินยอมเปิดเผยข้อมูล"
    className="consent-screen"
    style={{
      backgroundImage: `linear-gradient(180deg, rgba(3, 15, 28, 0.38), rgba(3, 10, 20, 0.82)), url(${consentBackground})`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }}
  >
    <div className="pixel-frame mt-4 space-y-3 bg-slate-900/80 p-4 text-sm leading-relaxed">
      <p>ยินยอมให้สิทธ์ในการใช้ข้อมูลเพื่อประโยชน์ในการศึกษาหรือไม่</p>
      <label className="pixel-chip flex min-h-11 items-start gap-3 bg-slate-800 p-3"><input className="mt-1" type="checkbox" checked={telemetry} onChange={(e) => setTelemetry(e.target.checked)} /><span>ยินยอมให้เก็บชื่อหรือนามแฝง ห้องเรียน คำตอบแบบประเมิน และสถิติการเล่นเกมเพื่อประโยชน์ในการศึกษา</span></label>
      <p className="text-xs leading-relaxed text-white/65">ข้อมูลที่ส่งไปยังฐานข้อมูลประกอบด้วยชื่อหรือนามแฝง ห้องเรียน ตัวละครที่เลือก การจัดพอร์ต การตัดสินใจ ผลลัพธ์ และเวลาเล่น โดยไม่เก็บอีเมล รหัสผ่าน หรือข้อมูลติดต่อ</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={!telemetry}
        className="pixel-btn min-h-11 bg-emerald-500 px-4 py-3 font-bold text-emerald-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-white/45"
        onClick={() => onChoice(true)}
      >
        บันทึกและเริ่มเกม
      </button>
      <button
        type="button"
        className="pixel-btn min-h-11 border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white"
        onClick={() => onChoice(false)}
      >
        ไม่ยินยอม แต่เล่นเกมต่อ
      </button>
    </div>
  </Shell>
}

export function PostAssessmentScreen({ onComplete, onSkip }) {
  return <Shell eyebrow="หลังจบ 4 บท" title="ทบทวนสิ่งที่ได้เรียนรู้" className="post-assessment-screen">
    <p className="mt-2 text-sm text-white/70">ผลส่วนนี้แยกจากกำไร ขาดทุน และโชคในเกมโดยสิ้นเชิง</p>
    <Questions questions={POST_QUESTIONS} actionLabel="ส่งคำตอบและดูรายงาน" onSubmit={onComplete} onSkip={onSkip} />
  </Shell>
}
