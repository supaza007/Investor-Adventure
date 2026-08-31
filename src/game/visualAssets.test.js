import sharp from 'sharp'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

test('chapter opening backgrounds stay inside the approved 150–350 KB budget', async () => {
  const assets = [
    'chapter-1-fresh-dawn.webp',
    'chapter-2-growing-town.webp',
    'chapter-3-storm-pressure.webp',
    'chapter-4-warm-homecoming.webp',
  ]

  for (const asset of assets) {
    const path = fileURLToPath(new URL(`../assets/worlds/chapter-openings/${asset}`, import.meta.url))
    const info = await stat(path)
    assert.ok(info.size >= 150 * 1024, `${asset} is unexpectedly small: ${info.size} bytes`)
    assert.ok(info.size <= 350 * 1024, `${asset} exceeds 350 KB: ${info.size} bytes`)
  }
})

test('canonical runtime characters stay inside the approved 30–120 KB budget', async () => {
  for (const id of ['trader', 'vi', 'medium', 'longterm']) {
    const path = fileURLToPath(new URL(`../assets/characters/${id}-canonical.webp`, import.meta.url))
    const info = await stat(path)
    assert.ok(info.size >= 30 * 1024, `${id} is unexpectedly small: ${info.size} bytes`)
    assert.ok(info.size <= 120 * 1024, `${id} exceeds 120 KB: ${info.size} bytes`)
  }
})

test('user-supplied Cover assets stay within the web delivery budget', async () => {
  const budgets = {
    'cover-background-user.webp': 350,
    'cover-adventure-subtitle-user.webp': 150,
    'cover-start-button-user.webp': 100,
  }
  for (const [name, maxKb] of Object.entries(budgets)) {
    const path = fileURLToPath(new URL(`../assets/ui/${name}`, import.meta.url))
    const info = await stat(path)
    assert.ok(info.size <= maxKb * 1024, `${name} exceeds ${maxKb} KB: ${info.size} bytes`)
  }

  const titleLogo = await stat(fileURLToPath(new URL('../assets/title-logo-money-survival.webp', import.meta.url)))
  assert.ok(titleLogo.size <= 180 * 1024, `title logo exceeds 180 KB: ${titleLogo.size} bytes`)
})

test('mobile runtime imports optimized artwork instead of authoring assets', async () => {
  const sources = {
    '../components/CoverScreen.jsx': [
      'cover-background-user.webp',
      'cover-adventure-subtitle-user.webp',
      'cover-start-button-user.webp',
      'title-logo-money-survival.webp',
    ],
    '../components/LearningScreens.jsx': [
      'pre-assessment-background-user.webp',
      'pre-assessment-frame-user.webp',
      'consent-background-user.webp',
    ],
    '../components/ChapterOpeningCard.jsx': [
      'chapter-1-fresh-dawn.webp',
      'chapter-2-growing-town.webp',
      'chapter-3-storm-pressure.webp',
      'chapter-4-warm-homecoming.webp',
    ],
  }

  for (const [source, assets] of Object.entries(sources)) {
    const jsx = await readFile(fileURLToPath(new URL(source, import.meta.url)), 'utf8')
    for (const asset of assets) assert.ok(jsx.includes(asset), `${source} does not use ${asset}`)
  }

  const art = await readFile(fileURLToPath(new URL('../components/art.js', import.meta.url)), 'utf8')
  assert.match(art, /CHARACTER_RASTER_ART\[id \+ '-canonical'\] \?\? CHARACTER_ART\[id \+ '-canonical'\]/)
})

test('every chapter start uses the shared production chapter opening card', async () => {
  const allocation = await readFile(fileURLToPath(new URL('../components/AllocationScreen.jsx', import.meta.url)), 'utf8')
  const transition = await readFile(fileURLToPath(new URL('../components/ChapterTransition.jsx', import.meta.url)), 'utf8')

  assert.match(allocation, /showChapterIntro && <ChapterTransition/)
  assert.doesNotMatch(allocation, /ChapterIntroModal/)
  assert.match(transition, /<ChapterOpeningCard/)
})

test('animated events have lightweight static artwork for reduced motion', async () => {
  for (const id of ['inflation', 'pandemic', 'reserve_boss', 'scammer', 'tariff_boss', 'tomyumkung']) {
    const path = fileURLToPath(new URL(`../assets/events/${id}-static.webp`, import.meta.url))
    const info = await stat(path)
    assert.ok(info.size <= 20 * 1024, `${id} static frame exceeds 20 KB: ${info.size} bytes`)
  }

  const portrait = await readFile(fileURLToPath(new URL('../components/Portrait.jsx', import.meta.url)), 'utf8')
  assert.match(portrait, /prefers-reduced-motion: reduce/)
  assert.match(portrait, /reducedMotionSrc/)
})

test('shared modal has a readable default surface on mobile', async () => {
  const modal = await readFile(fileURLToPath(new URL('../components/Modal.jsx', import.meta.url)), 'utf8')
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  assert.match(modal, /panelClassName = 'cozy-modal-surface pixel-frame/)
  assert.match(css, /\.cozy-modal-surface\s*\{[\s\S]*?background:/)
  assert.match(css, /\.modal-backdrop\s*\{[\s\S]*?safe-area-inset-top/)
})

test('assessment presents one question at a time with progress and navigation', async () => {
  const jsx = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  assert.match(jsx, /คำถามที่ \{questionIndex \+ 1\} \/ \{questions\.length\}/)
  assert.match(jsx, /const question = questions\[questionIndex\]/)
  assert.match(jsx, /ย้อนกลับ/)
  assert.match(jsx, /ถัดไป/)
  assert.doesNotMatch(jsx, /questions\.map\(\(q, index\)/)
  assert.match(css, /\.pre-assessment-screen\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden !important/)
  assert.match(css, /\.pre-assessment-questions > \.assessment-question-card\s*\{[\s\S]*?flex:\s*0 0 auto/)
})


test('runtime visual assets are available as self-contained SVG files', async () => {
  const assets = [
    '../assets/title-bg.svg',
    '../assets/title-logo.svg',
    '../assets/characters/trader-canonical.svg',
    '../assets/characters/medium.svg',
    '../assets/events/inflation.svg',
    '../assets/ui/cover-background-user.svg',
    '../assets/worlds/chapter-transition-map.svg',
  ]

  for (const asset of assets) {
    const svg = await readFile(fileURLToPath(new URL(asset, import.meta.url)), 'utf8')
    assert.ok(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
    assert.ok(svg.includes('href="data:image/'))
  }
})

test('animated SVGs preserve per-frame dimensions', async () => {
  const assets = [
    ['../assets/characters/longterm.webp', '../assets/characters/longterm.svg'],
    ['../assets/characters/medium.webp', '../assets/characters/medium.svg'],
    ['../assets/characters/trader.webp', '../assets/characters/trader.svg'],
    ['../assets/events/inflation.webp', '../assets/events/inflation.svg'],
    ['../assets/events/pandemic.webp', '../assets/events/pandemic.svg'],
    ['../assets/events/reserve_boss.gif', '../assets/events/reserve_boss.svg'],
    ['../assets/events/scammer.webp', '../assets/events/scammer.svg'],
    ['../assets/events/tariff_boss.webp', '../assets/events/tariff_boss.svg'],
    ['../assets/events/tomyumkung.gif', '../assets/events/tomyumkung.svg'],
  ]

  for (const [sourceAsset, svgAsset] of assets) {
    const source = fileURLToPath(new URL(sourceAsset, import.meta.url))
    const svgPath = fileURLToPath(new URL(svgAsset, import.meta.url))
    const metadata = await sharp(source, { animated: true }).metadata()
    const svg = await readFile(svgPath, 'utf8')
    const match = svg.match(/width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/)
    assert.ok(match, 'missing SVG dimensions: ' + svgAsset)
    const expectedHeight = metadata.pageHeight ?? metadata.height
    assert.equal(Number(match[1]), metadata.width, svgAsset)
    assert.equal(Number(match[2]), expectedHeight, svgAsset)
    assert.equal(Number(match[3]), metadata.width, svgAsset)
    assert.equal(Number(match[4]), expectedHeight, svgAsset)
  }
})

test('desktop build keeps large visual assets external for CSS', async () => {
  const config = await readFile(fileURLToPath(new URL('../../vite.config.js', import.meta.url)), 'utf8')
  assert.match(config, /assetsInlineLimit:\s*0/)
  assert.doesNotMatch(config, /viteSingleFile/)
})

test('scroll backgrounds use a text-safe sizing mode', async () => {
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  assert.match(css, /\.assessment-scroll-label\s*\{[\s\S]*?background-size:\s*cover/)

})

test('answer rows reserve space for the end ornaments with a responsive background', async () => {
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  assert.match(css, /\.assessment-answer-row\s*\{[\s\S]*?background-size:\s*100% 100%/)
  assert.match(css, /\.assessment-answer-row\s*\{[\s\S]*?padding:\s*clamp\([^;]+\) clamp\(2\.75rem,\s*10%,\s*5rem\)/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row\s*\{[\s\S]*?width:\s*min\(94%,\s*32rem\)/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row\s*\{[\s\S]*?padding:\s*0\.72rem clamp\(3\.3rem,\s*12%,\s*4\.8rem\) 0\.72rem clamp\(3\.9rem,\s*16\.8%,\s*5\.7rem\)/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-question-legend \+ div\s*\{[\s\S]*?gap:\s*0 !important/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-question-legend \+ div > \.assessment-answer-row \+ \.assessment-answer-row\s*\{[\s\S]*?margin-top:\s*-1\.25rem !important/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row\s*\{[\s\S]*?min-height:\s*5\.46rem/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row__text\s*\{[\s\S]*?overflow-wrap:\s*anywhere/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row__text\s*\{[\s\S]*?text-wrap:\s*balance/)
  assert.match(css, /\.assessment-answer-row--left,[\s\S]*?\.assessment-answer-row--right\s*\{[\s\S]*?width:\s*min\(94%,\s*32rem\)/)
})

test('answer text scales with the viewport and stays inside the artwork', async () => {
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  const jsx = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  assert.match(css, /\.assessment-answer-row\s*\{[\s\S]*?font-size:\s*clamp\(/)
  assert.match(css, /\.assessment-answer-row\s*\{[\s\S]*?line-height:\s*1\.4/)
  assert.match(css, /\.assessment-answer-row__text\s*\{[\s\S]*?text-wrap:\s*pretty/)
  assert.match(css, /\.assessment-answer-row__text\s*\{[\s\S]*?white-space:\s*nowrap/)
  assert.match(css, /\.assessment-answer-row--long \.assessment-answer-row__text\s*\{[\s\S]*?white-space:\s*normal/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row--long\s*\{[\s\S]*?min-height:\s*6\.4rem/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.assessment-answer-row--long \.assessment-answer-row__text\s*\{[\s\S]*?font-size:\s*clamp\(0\.92rem,\s*3\.2vw,\s*1\.08rem\)/)
  assert.match(jsx, /assessment-answer-row--long/)
})

test('answer rows mount SVG artwork as a responsive background layer', async () => {
  const jsx = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  assert.match(jsx, /backgroundImage: `url\(\$\{selected \? preAssessmentOptionSelected : preAssessmentOptionFrame\}\)`/)
  assert.match(jsx, /backgroundSize: '100% 100%'/)
  assert.doesNotMatch(jsx, /className="assessment-answer-row__art"/)
})

test('friendly risk result renders every profile as a responsive loadout', async () => {
  const jsx = await readFile(fileURLToPath(new URL('../components/RiskResultScreen.jsx', import.meta.url)), 'utf8')
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

  for (const profile of ['conservative', 'balanced', 'aggressive']) assert.match(jsx, new RegExp(`${profile}:`))
  for (const asset of ['กองทุนรวมผสม', 'ตราสารหนี้', 'หุ้น', 'คริปโต']) assert.match(jsx, new RegExp(asset))
  assert.match(jsx, /onClick=\{onContinue\}/)
  assert.match(jsx, /aria-label=\{`สัดส่วนพอร์ตแนะนำ:/)
  assert.match(css, /\.risk-result-screen\s*\{[\s\S]*?min-height:\s*100dvh/)
  assert.match(css, /\.risk-result-donut\s*\{[\s\S]*?conic-gradient\(var\(--risk-result-gradient\)\)/)
  assert.match(css, /@media \(max-width: 390px\), \(max-height: 760px\)/)
})

test('consent hides implementation-only version text and character cards stay readable while scrolling', async () => {
  const learningScreens = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  const styleSelect = await readFile(fileURLToPath(new URL('../components/StyleSelect.jsx', import.meta.url)), 'utf8')
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

  assert.doesNotMatch(learningScreens, /Consent version:/)
  assert.doesNotMatch(learningScreens, /CONSENT_VERSION/)
  assert.match(styleSelect, /style-select-compare__name/)
  assert.match(styleSelect, /const SHORT_TAGLINE =/)
  assert.match(styleSelect, /style-select-tagline/)
  assert.match(styleSelect, /ดูรายละเอียดตัวละคร/)
  assert.doesNotMatch(styleSelect, /style-select-profile__tagline/)
  assert.match(styleSelect, /backgroundAttachment:\s*'local, local'/)
  assert.match(styleSelect, /style-select-screen flex min-h-\[100dvh\] flex-col overflow-y-auto/)
  assert.match(styleSelect, /style-select-details pixel-frame flex flex-col overflow-visible/)
  assert.doesNotMatch(styleSelect, /style-select-details[^"`]*overflow-y-auto/)
  assert.match(css, /\.style-select-compare__name\s*\{[\s\S]*?overflow-wrap:\s*normal[\s\S]*?word-break:\s*normal[\s\S]*?text-wrap:\s*balance/)
  assert.match(css, /\.style-select-info\s*\{[\s\S]*?background:\s*linear-gradient[\s\S]*?font-weight:\s*800/)
})

test('stage return cards prioritize the asset choice over its final result', async () => {
  const stageScreen = await readFile(fileURLToPath(new URL('../components/StageScreen.jsx', import.meta.url)), 'utf8')
  const css = await readFile(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

  assert.doesNotMatch(stageScreen, /event-return-matrix__details/)
  assert.doesNotMatch(stageScreen, /เหตุการณ์\s*\{pct/)
  assert.doesNotMatch(stageScreen, /event-return-matrix__reason line-clamp-1/)
  assert.match(stageScreen, /function impactSummary/)
  assert.doesNotMatch(stageScreen, /การตัดสินใจของคุณ/)
  assert.match(stageScreen, /debrief-tip__icon/)
  assert.match(css, /\.event-return-matrix__name\s*\{[\s\S]*?font-size:\s*clamp\(1rem/)
  assert.match(css, /\.event-return-matrix__final\s*\{[\s\S]*?font-size:\s*clamp\(0\.65rem/)
  assert.match(css, /\.event-return-matrix__reason\s*\{[\s\S]*?overflow-wrap:\s*anywhere/)
  assert.match(stageScreen, /reveal-stage__title[\s\S]*?reveal-stage__portrait/)
  assert.match(stageScreen, /shock-stage__portrait/)
  assert.match(css, /\.debrief-tip\s*\{[\s\S]*?grid-template-columns:\s*1\.35rem/)
})

test('pre-assessment visual chrome remains mounted', async () => {
  const jsx = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  for (const asset of ['preAssessmentBackground', 'preAssessmentDisclaimer', 'preAssessmentEyebrow', 'preAssessmentQuestionBadge', 'preAssessmentTitle']) {
    assert.ok(jsx.split(asset).length >= 3, asset + ' is imported but not rendered')
  }
})

test('answer artwork uses responsive native SVG geometry', async () => {
  for (const asset of ['../assets/ui/pre-assessment-answer-option-frame-user.svg', '../assets/ui/pre-assessment-answer-option-selected-user.svg']) {
    const svg = await readFile(fileURLToPath(new URL(asset, import.meta.url)), 'utf8')
    assert.match(svg, /<svg[^>]*viewBox="0 0 900 96"[^>]*data-slice="110"/, asset)
    assert.doesNotMatch(svg, /data:image\//, asset)
    assert.match(svg, /vector-effect="non-scaling-stroke"/, asset)
  }
})

test('asset conversion preserves handcrafted responsive answer SVGs', async () => {
  const converter = await readFile(fileURLToPath(new URL('../../scripts/convert-assets-to-svg.mjs', import.meta.url)), 'utf8')
  assert.match(converter, /HANDCRAFTED_SVG_NAMES/)
  assert.match(converter, /HANDCRAFTED_SVG_NAMES\.has\(basename\(output\)\)/)
})
test('static UI SVGs embed browser-compatible PNG data', async () => {
  const assets = [
    '../assets/title-bg.svg',
    '../assets/title-logo.svg',
    '../assets/ui/cover-background-user.svg',
    '../assets/ui/pre-assessment-background-user.svg',
    '../assets/ui/pre-assessment-frame-user.svg',
    '../assets/ui/pre-assessment-title-user.svg',
  ]

  for (const asset of assets) {
    const svg = await readFile(fileURLToPath(new URL(asset, import.meta.url)), 'utf8')
    assert.ok(svg.includes('href="data:image/png;base64,'), asset)
  }
})

test('animated SVGs contain a visible PNG fallback frame', async () => {
  const assets = [
    '../assets/characters/longterm.svg',
    '../assets/characters/medium.svg',
    '../assets/characters/trader.svg',
    '../assets/events/inflation.svg',
    '../assets/events/pandemic.svg',
    '../assets/events/reserve_boss.svg',
    '../assets/events/scammer.svg',
    '../assets/events/tariff_boss.svg',
    '../assets/events/tomyumkung.svg',
  ]

  for (const asset of assets) {
    const svg = await readFile(fileURLToPath(new URL(asset, import.meta.url)), 'utf8')
    assert.ok(svg.includes('href="data:image/png;base64,'), asset)
  }
})

test('debrief uses the immutable shock ledger and separates buy-dip cash from market return', async () => {
  const stageScreen = await readFile(fileURLToPath(new URL('../components/StageScreen.jsx', import.meta.url)), 'utf8')
  assert.match(stageScreen, /shock\?\.impacts/)
  assert.match(stageScreen, /BehaviorEffectSummary/)
  assert.match(stageScreen, /เงินลงทุนเพิ่มคือการย้ายเงินสดเข้าพอร์ต ไม่ใช่กำไรจากตลาด/)
  assert.doesNotMatch(stageScreen, /\(state\.positions\[id\] \?\? 0\) - before\[id\]/)
})
