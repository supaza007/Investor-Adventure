import chapterOneBackdrop from '../assets/worlds/chapter-openings/chapter-1-fresh-dawn.webp'
import chapterTwoBackdrop from '../assets/worlds/chapter-openings/chapter-2-growing-town.webp'
import chapterThreeBackdrop from '../assets/worlds/chapter-openings/chapter-3-storm-pressure.webp'
import chapterFourBackdrop from '../assets/worlds/chapter-openings/chapter-4-warm-homecoming.webp'
import { money } from './ToolTheme'

export const CHAPTER_OPENINGS = [
  {
    chapter: 1,
    title: 'เริ่มต้นใหม่',
    story: 'เริ่มทำงานด้วยทุนก้อนแรก ทดลองเรียนรู้ และสร้างนิสัยการลงทุนที่ดีตั้งแต่วันนี้',
    eyebrow: 'จุดเริ่มต้นของเส้นทาง',
    rewardNote: 'ทุนเริ่มต้นสำหรับการเดินทางของคุณ',
    backdrop: chapterOneBackdrop,
  },
  {
    chapter: 2,
    title: 'สร้างรากฐาน',
    story: 'ครอบครัว บ้าน และเป้าหมายใหม่กำลังเข้ามา การเติบโตครั้งนี้ต้องมีแผนมากกว่าเดิม',
    eyebrow: 'บทที่ 1 สำเร็จแล้ว',
    rewardNote: 'รวมเงินเติมจากช่วงชีวิตใหม่แล้ว',
    backdrop: chapterTwoBackdrop,
  },
  {
    chapter: 3,
    title: 'ผ่านช่วงพีค',
    story: 'รายได้และโอกาสมาถึงจุดสูงสุด แต่แรงกดดันก็เพิ่มขึ้น จงรักษาสมดุลเมื่อวิกฤตเข้ามา',
    eyebrow: 'บทที่ 2 สำเร็จแล้ว',
    rewardNote: 'ทรัพยากรที่สะสมมาพร้อมรับบททดสอบ',
    backdrop: chapterThreeBackdrop,
  },
  {
    chapter: 4,
    title: 'เส้นทางที่มั่นคง',
    story: 'ปลายทางเริ่มชัดเจน รักษาสิ่งที่สร้างมาและค่อย ๆ ลดความเสี่ยง เพื่อก้าวสู่ชีวิตที่อุ่นใจ',
    eyebrow: 'บทที่ 3 สำเร็จแล้ว',
    rewardNote: 'ทุนสะสมก่อนเข้าสู่ช่วงเตรียมเกษียณ',
    backdrop: chapterFourBackdrop,
  },
]

export default function ChapterOpeningCard({ chapter, startValue, onContinue }) {
  const presentation = CHAPTER_OPENINGS.find((item) => item.chapter === chapter.n) ?? CHAPTER_OPENINGS[0]
  const paddedChapter = String(chapter.n).padStart(2, '0')

  return <article className="chapter-prototype chapter-prototype--portal" data-chapter={chapter.n}>
    <img className="chapter-prototype__backdrop" src={presentation.backdrop} alt="" />
    <div className="chapter-prototype__portal-shade" aria-hidden="true" />
    <div className="chapter-prototype__portal-content">
      <p className="chapter-prototype__completed">
        {presentation.eyebrow}{chapter.n > 1 && <span aria-hidden="true"> ✓</span>}
      </p>
      <div className="chapter-prototype__chapter-number" aria-hidden="true">
        <small>CHAPTER</small><strong>{paddedChapter}</strong>
      </div>
      <p className="chapter-prototype__age">ช่วงชีวิตใหม่ · อายุ {chapter.ageFrom}–{chapter.ageTo} ปี</p>
      <h1>{presentation.title}</h1>
      <p className="chapter-prototype__story">{presentation.story}</p>
      <div className="chapter-prototype__reward">
        <span>เงินเริ่มต้นบทนี้</span>
        <strong>{money(startValue)}</strong>
        <small>{presentation.rewardNote}</small>
      </div>
      <button type="button" className="chapter-prototype__start" onClick={onContinue}>
        ก้าวเข้าสู่บทที่ {chapter.n}<span aria-hidden="true">›</span>
      </button>
    </div>
  </article>
}
