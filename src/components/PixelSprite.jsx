// สไปรต์พิกเซลของตัวละครแต่ละคลาส วาดเป็น grid 14x16
// '.' = โปร่งใส, '0' = เส้นขอบดำ, ตัวอักษรอื่นดูใน palette ของแต่ละตัว
// เรนเดอร์เป็น SVG rect ต่อพิกเซล + shape-rendering crispEdges = คมแบบพิกเซลแท้

const OUTLINE = '#0a0b12'

export const SPRITES = {
  // ⚔️ หุ้น — นักดาบจอมกล้า (ผมน้ำตาล เสื้อหนัง ดาบข้างตัว)
  stock: {
    palette: {
      H: '#7a4a21', // ผม
      S: '#eab98b', // ผิว
      L: '#a4713f', // เสื้อหนัง
      D: '#7c5127', // หนังเข้ม
      W: '#cdd3dd', // ใบดาบ
      P: '#5b4632', // กางเกง
      B: '#3c2f22', // รองเท้า
    },
    rows: [
      '..000000......',
      '.0HHHHHH0.....',
      '0HHHHHHHH0....',
      '0HSSSSSSH0....',
      '0SS0SS0SS0....',
      '.0SSSSSS0.....',
      '.0SS00SS0.....',
      '..0SSSS0..00..',
      '.00LLLL00.0W0.',
      '0SLLLLLLS00W0.',
      '0S0LLLL0S00W0.',
      '.00LDDL00.0W0.',
      '...0LL0....0..',
      '..0P00P0......',
      '.0PP00PP0.....',
      '.0B0..0B0.....',
    ],
  },

  // 👑 กองทุนรวม — หัวหน้ากิลด์ (ฮู้ดเขียว เข็มกลัดทอง)
  mutual_fund: {
    palette: {
      G: '#3f6d3a', // ฮู้ด
      g: '#2c4f2a', // ฮู้ดเข้ม
      S: '#eab98b', // ผิว
      C: '#d9a520', // เข็มกลัดทอง
      T: '#56794f', // เสื้อคลุม
      P: '#4a3b2c', // กางเกง
    },
    rows: [
      '...00000......',
      '..0GGGGG0.....',
      '.0GGGGGGG0....',
      '.0GgSSSgG0....',
      '.0GS0S0SG0....',
      '.0GSSSSSG0....',
      '..0gSSSg0.....',
      '..00SSS00.....',
      '.0TCTTTCT0....',
      '0STTTTTTTS0...',
      '0S0TTTTT0S0...',
      '.00TTTTT00....',
      '...0TTT0......',
      '..0P000P0.....',
      '.0PP0.0PP0....',
      '.0g0...0g0....',
    ],
  },

  // 🛡️ ตราสารหนี้ — อัศวินโล่หนัก (หมวกเหล็ก พู่แดง โล่ไม้)
  bond: {
    palette: {
      R: '#c23b3b', // พู่
      M: '#aab1bf', // เหล็ก
      m: '#7e8595', // เหล็กเข้ม
      Y: '#d9a520', // ช่องมองทอง
      B: '#8a5a33', // โล่ไม้
      S: '#eab98b', // ผิว(มือ)
    },
    rows: [
      '.....RR.......',
      '.....RR.......',
      '...0MMMM0.....',
      '..0MMMMMM0....',
      '..0mYYYYm0....',
      '..0MMMMMM0....',
      '..0MMMMMM0....',
      '...0mmmm0.....',
      '.00MMMMMM00...',
      '0BBMMmmMMS0...',
      '0BB0MMMM0S0...',
      '0BB0MMMM00....',
      '.00.0mm0......',
      '...0M00M0.....',
      '..0MM00MM0....',
      '..0m0..0m0....',
    ],
  },

  // 🔮 อนุพันธ์ — จอมเวทย์ทำลายล้าง (หมวกแดง ผมส้ม คทาคริสตัล)
  derivatives: {
    palette: {
      R: '#b03a2e', // หมวก
      r: '#8e2f26', // ปีกหมวก
      H: '#d1662a', // ผมส้ม
      S: '#eab98b', // ผิว
      P: '#5d3a66', // เสื้อคลุมม่วง
      p: '#462b4e', // ม่วงเข้ม
      W: '#7c5127', // ด้ามคทา
      C: '#57c7d4', // คริสตัล
    },
    rows: [
      '......00......',
      '.....0RR0.....',
      '....0RRRR0....',
      '...0RRRRRR0...',
      '..0RRRRRRRR0..',
      '.0rrrrrrrrrr0.',
      '.0HSSSSSSH0.0.',
      '.0HS0SS0SH00C0',
      '..0SSSSSS0.0W0',
      '..00SSSS00.0W0',
      '.0PPPPPPPP00W0',
      '0SPPPPPPPPS0W0',
      '0S0PPPPPP0S0W0',
      '.00PppppP00.0.',
      '...0PPPP0.....',
      '..0p0..0p0....',
    ],
  },

  // 🌱 หุ้นยั่งยืน — นักบวชผู้พิทักษ์โลก (ฮู้ดเขียว เคราขาว คทาใบไม้)
  esg: {
    palette: {
      K: '#2c5232', // ฮู้ดเข้ม
      g: '#35613a', // เขียวเข้ม
      G: '#48824e', // เสื้อคลุมเขียว
      S: '#eab98b', // ผิว
      B: '#e8e4da', // เคราขาว
      W: '#7c5127', // ด้ามคทา
      L: '#7ed957', // ใบไม้
    },
    rows: [
      '...00000......',
      '..0KKKKK0.....',
      '.0KKKKKKK0....',
      '.0KgSSSgK0....',
      '.0KS0S0SK0.0..',
      '.0KSSSSSK00L0.',
      '..0BBBBB0.0W0.',
      '..0BBBBB0.0W0.',
      '.0GBBBBBG00W0.',
      '0SGGBBBGGS0W0.',
      '0S0GGGGG0S0W0.',
      '.00GGGGG0.0W0.',
      '...0GGG0...0..',
      '..0g000g0.....',
      '.0gg0.0gg0....',
      '.0K0...0K0....',
    ],
  },

  // 📉 เงินเฟ้อ — ยักษ์อ้วนสีเทา (พุงใหญ่ เขี้ยว ผ้าเตี่ยวแดง)
  inflation: {
    palette: {
      G: '#c7c6d4', // ตัวเทาม่วงอ่อน
      g: '#a7a6b8', // เงาตัว
      W: '#ecebf2', // ไฮไลต์
      E: '#3a3a48', // ตา
      T: '#efe6cc', // เขี้ยว
      R: '#9e5560', // ผ้าเตี่ยวแดง
      F: '#8f8ea0', // เท้า
    },
    rows: [
      '......0000......',
      '.....0GGGG0.....',
      '....0GGWWGG0....',
      '...0GGWWGGGG0...',
      '..0GGGGGGGGGG0..',
      '.0GGGGGGGGGGGG0.',
      '.0GGEGGGGGEGGG0.',
      '0GGGGGGGGGGGGGG0',
      '0GGGTGGGGTGGGGG0',
      '0GgGGGGGGGGGGgG0',
      '0GgGGGGGGGGGGgG0',
      '0GGgGGGGGGGGgGG0',
      '.0GGgGGGGGGgGG0.',
      '.0GGGGggGGGGGG0.',
      '..0GGGGGGGGGG0..',
      '..0GGGRRRRGGG0..',
      '...0FF0RR0FF0...',
      '...0FF0..0FF0...',
    ],
  },

  // 🤑 ความโลภ — จระเข้เศรษฐี (หมวกทรงสูง เสื้อกั๊กแดง กระดุมทอง ฟันทอง)
  greed: {
    palette: {
      K: '#26262f', // หมวกดำ
      Y: '#e2ba3c', // ทอง (แถบหมวก/กระดุม/ฟัน)
      G: '#6f9e46', // ตัวเขียว
      g: '#517832', // เขียวเข้ม/เท้า/หาง
      E: '#1e1e28', // ตา
      V: '#8f3f45', // เสื้อกั๊กแดงเลือดหมู
      C: '#5a3f2a', // ข้อมือน้ำตาล
    },
    rows: [
      '.....0KKKK0.....',
      '.....0KKKK0.....',
      '.....0KKKK0.....',
      '....0YYYYYY0....',
      '..0KKKKKKKKKK0..',
      '...0GGGGGGGG0...',
      '..0GGGGGGGGGG0..',
      '.0GGEGGGGGGEGG0.',
      '.0GGGGGGGGGGGG0.',
      '.0GGGYYYYYYGGG0.',
      '0GGGGGGGGGGGGGG0',
      '0GVVVVVVVVVVVVG0',
      '0GVVVVVYVVVVVVG0',
      '0CVVVVVYVVVVVVC0',
      '0GVVVVVYVVVVVVG0',
      '.0GVVVVVVVVVVG0.',
      '.0GGGGGGGGGGGG0.',
      '..0gg0..0gg0gg0.',
    ],
  },
}

// วาดสไปรต์: id = คลาส, size = ความกว้าง px, animate = ใส่อนิเมชันเด้งแบบพิกเซล
export default function PixelSprite({ id, size = 112, animate = false, className = '' }) {
  const sprite = SPRITES[id]
  if (!sprite) return null

  const rows = sprite.rows
  const w = rows[0].length
  const h = rows.length

  const rects = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const fill = ch === '0' ? OUTLINE : sprite.palette[ch] || OUTLINE
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)
    }
  })

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size / w) * h}
      shapeRendering="crispEdges"
      className={`${animate ? 'sprite-bob' : ''} ${className}`}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    >
      {rects}
    </svg>
  )
}
