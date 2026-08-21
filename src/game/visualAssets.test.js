import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

test('chapter transition background stays inside the approved 150–350 KB budget', async () => {
  const path = fileURLToPath(new URL('../assets/worlds/chapter-transition-map.webp', import.meta.url))
  const info = await stat(path)

  assert.ok(info.size >= 150 * 1024, `background is unexpectedly small: ${info.size} bytes`)
  assert.ok(info.size <= 350 * 1024, `background exceeds 350 KB: ${info.size} bytes`)
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
    'game-subtitle-user.webp': 30,
    'play-button-user.webp': 30,
  }
  for (const [name, maxKb] of Object.entries(budgets)) {
    const path = fileURLToPath(new URL(`../assets/ui/${name}`, import.meta.url))
    const info = await stat(path)
    assert.ok(info.size <= maxKb * 1024, `${name} exceeds ${maxKb} KB: ${info.size} bytes`)
  }
})
