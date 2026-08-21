# Cover graphic drop zone

วางไฟล์กราฟิกต้นฉบับสำหรับหน้า `CoverScreen` ในโฟลเดอร์นี้ โดยยังไม่ต้อง optimize หรือเปลี่ยนชื่อไฟล์ต้นฉบับ

ชื่อที่แนะนำ:

- `cover-background.*` — Background Artwork
- `game-logo.*` — Game Logo
- `hero-trader.*` — Trader Character
- `hero-vi.*` — VI Character
- `hero-medium.*` — Medium-term Character
- `hero-longterm.*` — Long-term Character
- `play-button.*` — PLAY Button graphic
- `continue-button.*` — Continue Button graphic (ถ้ามี)
- `cover-reference.*` — ภาพตัวอย่างการจัดวางทั้งหน้า

รองรับไฟล์ต้นฉบับ PNG, WebP, JPG/JPEG และ SVG ที่ผู้ใช้เป็นเจ้าของหรือมีสิทธิ์ใช้งาน ผู้พัฒนาจะเก็บต้นฉบับไว้ที่นี่ แล้วสร้างไฟล์ optimized แยกใน `src/assets/` สำหรับ runtime

เมื่อเพิ่มไฟล์แล้ว ให้ระบุว่าไฟล์นั้นใช้กับ layout ใด ต้องแสดงเต็มภาพหรือครอป และใช้กับ mobile, desktop หรือทั้งคู่

## Integration log — 2026-08-21

- `cover-background` → `Background Artwork`; converted to `src/assets/ui/cover-background-user.webp` without changing the Cover layout.
- `game-subtitle.png` → `Game Subtitle`; converted to transparent WebP without trimming the original subtitle frame, while preserving accessible Thai text.
- `play-button.png` → `PLAY Button`; kept the existing START crop for layout stability and removed the supplied blue background color from the runtime image. The real button retains the accessible `PLAY` label and keyboard focus behavior.
- Existing `Game Logo`, `Hero Lineup`, overlays, Continue/Error states and layout positions were preserved.
