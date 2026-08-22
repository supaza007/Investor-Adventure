import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// build มี 2 โหมด โดยทั้งสองโหมดเก็บไฟล์ภาพแยกไว้ให้ browser โหลดได้เสถียร
//
//   npm run build      → dist/index.html + dist/assets/*
//                        ใช้กับ .exe / เปิดจากไฟล์ในเครื่องได้ (ต้องส่งทั้งโฟลเดอร์ dist)
//   npm run build:web  → dist-web/index.html + dist-web/assets/*
//                        ใช้ตอนขึ้นเว็บและ cache รูปแยกใบได้
//
// ห้ามฝัง SVG ขนาดใหญ่ลงใน CSS data URL: Chromium จะตัด background-image ทิ้ง
// เมื่อค่า style ใหญ่เกินขีดจำกัด แม้ไฟล์ SVG เองจะถูกต้องก็ตาม
export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web'

  return {
    // GitHub Pages project site ต้องโหลด assets ใต้ repository subpath
    // ส่วน build ปกติยังใช้ relative path เพื่อเปิด dist/index.html แบบ file:// ได้
    base: isWeb ? '/Investor-Adventure/' : './',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: isWeb ? 'dist-web' : 'dist',
      // ให้ทุก asset ใช้ URL ไฟล์จริง เพื่อให้ background-image / border-image โหลดได้
      assetsInlineLimit: 0,
    },
  }
})
