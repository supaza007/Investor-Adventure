import { useState } from 'react'
import { CONSENT_VERSION, PRE_QUESTIONS, POST_QUESTIONS, scoreAssessment } from '../game/learning.js'

function Shell({ title, eyebrow, children }) {
  return <main className="cozy-screen min-h-[100dvh] overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-3 py-5 text-white">
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-widest text-emerald-300">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-black sm:text-4xl">{title}</h1>
      {children}
    </div>
  </main>
}

function Questions({ questions, actionLabel, onSubmit, onSkip }) {
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const result = scoreAssessment(questions, answers)
    if (!result) { setError('กรุณาตอบทุกข้อ หรือเลือกข้ามแบบสะท้อนนี้'); return }
    onSubmit(result)
  }
  return <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
    {questions.map((q, index) => <fieldset key={q.id} className="pixel-frame bg-slate-900/80 p-3">
      <legend className="px-1 font-bold">{index + 1}. {q.prompt}</legend>
      <div className="mt-2 grid gap-2">{q.options.map(([value, label]) => <label key={value} className="pixel-chip flex min-h-11 cursor-pointer items-center gap-3 bg-slate-800 px-3 py-2">
        <input type="radio" name={q.id} value={value} checked={answers[q.id] === value} onChange={() => { setAnswers((a) => ({ ...a, [q.id]: value })); setError('') }} />
        <span>{label}</span>
      </label>)}</div>
    </fieldset>)}
    {error && <p role="alert" className="pixel-chip bg-rose-950 p-3 text-rose-100">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button className="pixel-btn min-h-11 flex-1 bg-emerald-500 px-4 py-3 font-bold text-emerald-950" type="submit">{actionLabel}</button>
      <button className="pixel-btn min-h-11 bg-slate-700 px-4 py-3" type="button" onClick={onSkip}>ข้าม · ไม่ประเมิน</button>
    </div>
  </form>
}

export function PreAssessmentScreen({ onComplete, onSkip }) {
  return <Shell eyebrow="ก่อนเริ่มเกม" title="แบบสะท้อนความรู้และความเสี่ยง">
    <p className="mt-2 text-sm leading-relaxed text-white/70">แบบสะท้อนที่ดัดแปลงเพื่อการเรียนรู้ ไม่ใช่แบบทดสอบ TSI ทางการ ไม่ใช้เลือกสไตล์แทนคุณ และไม่มีคำตอบนี้ไปเปลี่ยนผลตอบแทนในเกม</p>
    <Questions questions={PRE_QUESTIONS} actionLabel="บันทึกและไปต่อ" onSubmit={onComplete} onSkip={onSkip} />
  </Shell>
}

export function ConsentScreen({ onChoice }) {
  const [telemetry, setTelemetry] = useState(false)
  return <Shell eyebrow="การวิจัยเป็นทางเลือก" title="เลือกการใช้ข้อมูลของคุณ">
    <div className="pixel-frame mt-4 space-y-3 bg-slate-900/80 p-4 text-sm leading-relaxed">
      <p>เกมเล่นได้ครบแม้ไม่ยินยอม ขณะนี้เวอร์ชันเว็บ <b>ยังไม่ส่งข้อมูลไปเซิร์ฟเวอร์</b> การเลือกนี้บันทึกในเครื่องเพื่อเตรียม contract เท่านั้น</p>
      <label className="pixel-chip flex min-h-11 items-start gap-3 bg-slate-800 p-3"><input className="mt-1" type="checkbox" checked={telemetry} onChange={(e) => setTelemetry(e.target.checked)} /><span>ยินยอมให้เก็บคำตอบแบบประเมินและเวลาแบบไม่ระบุตัวตน หากระบบวิจัยได้รับอนุมัติในอนาคต</span></label>
      <p className="text-xs text-white/55">Consent version: {CONSENT_VERSION} · ไม่มีชื่อ อีเมล หรือข้อมูลส่วนบุคคล</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" className="pixel-btn min-h-11 bg-emerald-500 px-4 py-3 font-bold text-emerald-950" onClick={() => onChoice(telemetry)}>บันทึกและเริ่มเกม</button>
      <button type="button" className="pixel-btn min-h-11 bg-slate-700 px-4 py-3" onClick={() => onChoice(false)}>ไม่ยินยอม แต่เล่นต่อ</button>
    </div>
  </Shell>
}

export function PostAssessmentScreen({ onComplete, onSkip }) {
  return <Shell eyebrow="หลังจบ 4 บท" title="ทบทวนสิ่งที่ได้เรียนรู้">
    <p className="mt-2 text-sm text-white/70">ผลส่วนนี้แยกจากกำไร ขาดทุน และโชคในเกมโดยสิ้นเชิง</p>
    <Questions questions={POST_QUESTIONS} actionLabel="ส่งคำตอบและดูรายงาน" onSubmit={onComplete} onSkip={onSkip} />
  </Shell>
}
