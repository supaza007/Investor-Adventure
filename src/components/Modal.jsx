import { useEffect, useRef } from 'react'

// กรอบ modal ที่ใช้ร่วมกันทุกตัวในเกม (รายละเอียดเครื่องมือ / รายละเอียดสไตล์ / แนะนำบท / มิจฉาชีพ)
//
// รวมไว้ที่เดียวเพราะทั้ง 4 ตัวต้องการพฤติกรรมเดียวกันหมด และก่อนหน้านี้ไม่มีตัวไหนทำเลย:
//   - role="dialog" + aria-modal  → โปรแกรมอ่านหน้าจอรู้ว่านี่คือหน้าต่างซ้อน ไม่ใช่เนื้อหาปกติ
//   - กด Esc ปิด                  → ทางออกมาตรฐานที่คนคาดหวัง
//   - ขัง Tab ไว้ข้างใน           → เดิม Tab หลุดไปโดนปุ่มหลัง modal ได้ ทั้งที่มองไม่เห็น
//   - คืนโฟกัสให้ปุ่มเดิมตอนปิด   → ไม่งั้นโฟกัสเด้งกลับไปต้นหน้าจอ หาที่เดิมไม่เจอ
//
// dismissible = ไม่ส่ง onClose มา → ปิดไม่ได้เลย (ทั้ง Esc และคลิกฉากหลัง)
// ใช้กับ modal ที่ "ต้องตัดสินใจก่อนถึงไปต่อได้" คือข้อเสนอมิจฉาชีพกับหน้าแนะนำบท
// ซึ่งเป็นดีไซน์ตั้งใจ ไม่ใช่ของที่ลืมใส่ปุ่มปิด
export default function Modal({ children, onClose, label, panelClassName = '' }) {
  const panelRef = useRef(null)

  // เก็บ onClose ไว้ใน ref แล้วให้ effect มี deps ว่าง — ถ้าใส่ onClose ลง deps ตรงๆ
  // พาเรนต์ที่ส่ง arrow function แบบ inline (ซึ่งทำทุกตัว) จะสร้างฟังก์ชันใหม่ทุก render
  // ทำให้ effect รื้อ-ติดตั้งใหม่ทุก render → โฟกัสถูกดีดกลับตลอดจนพิมพ์/แท็บไม่ได้
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const restoreTo = document.activeElement
    const panel = panelRef.current

    // โฟกัสที่ตัวกรอบ ไม่ใช่ปุ่มแรก — จงใจ เพราะปุ่มแรกของข้อเสนอมิจฉาชีพคือ "โอนเลย"
    // ถ้าออโต้โฟกัสให้ คนที่เคาะ Enter รัวๆ จะโอนเงินให้มิจฉาชีพโดยไม่ได้อ่าน
    panel?.focus()

    const focusables = () =>
      [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.disabled && el.offsetParent !== null,
      )

    const onKey = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const list = focusables()
      if (list.length === 0) {
        e.preventDefault() // ไม่มีอะไรให้โฟกัส ก็อย่าปล่อยให้หลุดออกไปข้างนอก
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreTo?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4"
      onClick={onClose ? () => onClose() : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`max-h-[85vh] w-full overflow-y-auto focus:outline-none ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
