import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// build มี 2 โหมด เพราะ "ดับเบิลคลิกเปิดได้" กับ "โหลดเร็วบนเว็บ" ขัดกันโดยตรง
//
//   npm run build      → ไฟล์เดียว dist/index.html (รูปฝังเป็น base64)
//                        ใช้กับ .exe / ส่งไฟล์ให้คนอื่น / ดับเบิลคลิกเปิดออฟไลน์
//
//   npm run build:web  → แยกไฟล์ตามปกติ (HTML + JS + รูปแยกใบ)
//                        ใช้ตอนขึ้นเว็บ: เบราว์เซอร์โหลด HTML+JS ก่อนแล้วรูปทยอยตามมา
//                        และ cache รูปแยกใบได้ เข้าเว็บครั้งที่ 2 แทบไม่ต้องโหลดใหม่
//
// ทำไมต้องแยก: โหมดไฟล์เดียวทำให้ผู้เล่นเห็นจอขาวจนกว่าจะโหลดครบทุกไบต์
// ซึ่งบนเน็ตมือถือคือหลายวินาที — ยอมรับได้ตอนเปิดจากไฟล์ในเครื่อง แต่ไม่ใช่ตอนแชร์ลิงก์
export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web'

  return {
    // path แบบ relative — ใช้ได้ทั้งเปิดจากไฟล์ (file://) และวางใน subfolder ของ GitHub Pages
    base: './',
    plugins: [react(), tailwindcss(), ...(isWeb ? [] : [viteSingleFile()])],
    build: {
      outDir: isWeb ? 'dist-web' : 'dist',
      // โหมดไฟล์เดียวต้อง inline ทุกอย่าง · โหมดเว็บใช้ค่าปกติ (ไฟล์เล็กกว่า 4KB เท่านั้นที่ inline)
      assetsInlineLimit: isWeb ? 4096 : 100 * 1024 * 1024,
    },
  }
})
