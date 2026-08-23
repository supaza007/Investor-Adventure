import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/Investor-Adventure/'
const [viewportWidth, viewportHeight] = (process.argv[3] ?? '390x844').split('x').map(Number)
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const profile = await mkdtemp(join(tmpdir(), 'investor-adventure-qa-'))
const port = 9300 + (viewportWidth % 100)
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', `--window-size=${viewportWidth},${viewportHeight}`, url,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws

try {
  let target
  for (let i = 0; i < 40; i += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      target = pages.find((page) => page.type === 'page')
      if (target) break
    } catch {}
    await sleep(250)
  }
  if (!target) throw new Error('Chrome DevTools target was not available')

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  let nextId = 0
  const pending = new Map()
  const browserErrors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry
      browserErrors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`)
    }
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  const clickText = async (text) => {
    let clicked = false
    for (let attempt = 0; attempt < 20 && !clicked; attempt += 1) {
      clicked = await evaluate(`(() => { const text = ${JSON.stringify(text)}; const el = [...document.querySelectorAll('button')].find((node) => node.textContent.includes(text) && !node.disabled); if (!el) return false; el.click(); return true })()`)
      if (!clicked) await sleep(100)
    }
    if (!clicked) {
      const snapshot = await evaluate(`({ url: location.href, title: document.title, body: document.body.innerText.slice(0, 500) })`)
      throw new Error(`Button not found: ${text}; page=${JSON.stringify(snapshot)}`)
    }
    await sleep(380)
  }

  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: viewportWidth < 768 })
  await send('Page.navigate', { url })
  await sleep(700)
  const coverReady = await evaluate(`(() => {
    const name = document.querySelector('#student-name')
    const room = document.querySelector('#class-room')
    if (!name || !room) return false
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setValue.call(name, 'QA Player')
    name.dispatchEvent(new Event('input', { bubbles: true }))
    setValue.call(room, 'QA Room')
    room.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!coverReady) throw new Error('Cover identity fields were not found')
  await clickText('START')

  const assessmentReady = await evaluate(`(() => {
    const radios = [...document.querySelectorAll('input[type="radio"]')]
    const firstByQuestion = new Map()
    for (const radio of radios) if (!firstByQuestion.has(radio.name)) firstByQuestion.set(radio.name, radio)
    for (const radio of firstByQuestion.values()) radio.click()
    return firstByQuestion.size === 10
  })()`)
  if (!assessmentReady) throw new Error('Pre-assessment questions were not ready')
  await clickText('บันทึกและไปต่อ')
  await clickText('เข้าใจแล้ว ไปต่อ')
  await clickText('ไม่ยินยอม แต่เล่นเกมต่อ')
  await clickText('เลือกตัวละครนี้')
  await clickText('ดูเงินที่ได้รับในบทนี้')
  await clickText('เริ่มจัดพอร์ตบทนี้')

  const allocated = await evaluate(`(() => { const buttons = [...document.querySelectorAll('[data-allocation-field="bond"]')]; const add = buttons.at(-1); if (!add) return false; for (let i = 0; i < 20; i += 1) add.click(); return true })()`)
  if (!allocated) throw new Error('Bond allocation controls were not found')
  await sleep(200)
  await clickText('ทบทวน')
  await clickText('ยืนยันพอร์ต')

  for (let guard = 0; guard < 12; guard += 1) {
    const transitionVisible = await evaluate(`document.body.textContent.includes('เส้นทางชีวิตกำลังพาคุณเข้าสู่บทที่ 2')`)
    if (transitionVisible) break
    const hasScam = await evaluate(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('ปฏิเสธ'))`)
    if (hasScam) await clickText('ปฏิเสธ')
    const needsBehavior = await evaluate(`document.body.textContent.includes('ถือต่อ') && [...document.querySelectorAll('button')].some((b) => b.textContent.includes('ถือต่อ'))`)
    if (needsBehavior) { await clickText('ถือต่อ'); await clickText('ยืนยันการเลือก') }
    const advanced = await evaluate(`(() => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent.includes('ต่อไป') || b.textContent.includes('ไปบทถัดไป')) && !b.disabled); if (!el) return false; el.click(); return true })()`)
    if (!advanced) {
      const snapshot = await evaluate(`({ body: document.body.innerText.slice(0, 1200), buttons: [...document.querySelectorAll('button')].map((b) => ({ text: b.innerText, disabled: b.disabled })) })`)
      throw new Error(`Could not advance stage at guard ${guard}: ${JSON.stringify(snapshot)}`)
    }
    await sleep(420)
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const ready = await evaluate(`(() => { const image = document.querySelector('[role="dialog"] img'); return Boolean(image?.complete && image.naturalWidth > 0) })()`)
    if (ready) break
    await sleep(200)
  }

  const evidence = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]')
    const image = dialog?.querySelector('img')
    const action = [...(dialog?.querySelectorAll('button') ?? [])].find((button) =>
      button.textContent.includes('ดูเงินที่ได้รับในบทนี้') || button.textContent.includes('เริ่มจัดพอร์ตบทนี้')
    )
    const rect = action?.getBoundingClientRect()
    return {
      dialogVisible: Boolean(dialog),
      title: dialog?.getAttribute('aria-label') ?? null,
      hasExplanation: dialog?.textContent.includes('ไม่ใช่กำไรจากตลาดทั้งหมด') ?? false,
      hasStartValue: dialog?.textContent.includes('เงินเริ่มบทนี้') ?? false,
      mapLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      actionVisible: Boolean(rect && rect.top >= 0 && rect.bottom <= innerHeight),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      focusedRole: document.activeElement?.getAttribute('role') ?? document.activeElement?.tagName,
      mapRequests: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('chapter-transition')).map((entry) => entry.name),
    }
  })()`)

  if (!evidence.dialogVisible || !evidence.hasExplanation || !evidence.hasStartValue || !evidence.mapLoaded || !evidence.actionVisible || evidence.horizontalOverflow) {
    throw new Error(`Vertical-slice evidence failed: ${JSON.stringify({ evidence, browserErrors })}`)
  }
  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(' | ')}`)
  console.log(JSON.stringify({ ok: true, viewport: `${viewportWidth}x${viewportHeight}`, evidence, browserErrors }, null, 2))
} finally {
  ws?.close()
  chrome.kill()
  await Promise.race([
    new Promise((resolve) => chrome.once('exit', resolve)),
    sleep(1500),
  ])
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { await rm(profile, { recursive: true, force: true }); break } catch (error) {
      if (attempt === 4) console.warn(`Could not remove temporary Chrome profile: ${error.code}`)
      else await sleep(250)
    }
  }
}
