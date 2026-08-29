import Modal from './Modal'
import ChapterOpeningCard from './ChapterOpeningCard.jsx'

export default function ChapterTransition({ chapter, startValue, onContinue }) {
  return (
    <Modal
      label={`กำลังเข้าสู่บทที่ ${chapter.n} อายุ ${chapter.ageFrom} ถึง ${chapter.ageTo} ปี`}
      panelClassName="chapter-opening-dialog"
    >
      <ChapterOpeningCard chapter={chapter} startValue={startValue} onContinue={onContinue} />
    </Modal>
  )
}
