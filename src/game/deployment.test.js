import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

test('GitHub Pages build receives the public Supabase configuration and fails closed when missing', async () => {
  const workflow = await readFile(fileURLToPath(new URL('../../.github/workflows/deploy.yml', import.meta.url)), 'utf8')
  assert.match(workflow, /VITE_SUPABASE_URL:\s*\$\{\{ vars\.VITE_SUPABASE_URL \}\}/)
  assert.match(workflow, /VITE_SUPABASE_ANON_KEY:\s*\$\{\{ vars\.VITE_SUPABASE_ANON_KEY \}\}/)
  assert.match(workflow, /if \[ -z "\$VITE_SUPABASE_URL" \] \|\| \[ -z "\$VITE_SUPABASE_ANON_KEY" \]/)
  assert.doesNotMatch(workflow, /VITE_SUPABASE_(?:SERVICE_ROLE|SECRET)/i)
})

test('research consent discloses every identifying field that the analytics payload sends', async () => {
  const screen = await readFile(fileURLToPath(new URL('../components/LearningScreens.jsx', import.meta.url)), 'utf8')
  assert.match(screen, /ชื่อหรือนามแฝง ห้องเรียน/)
  assert.match(screen, /การจัดพอร์ต การตัดสินใจ ผลลัพธ์ และเวลาเล่น/)
  assert.doesNotMatch(screen, /ไม่มีชื่อ อีเมล หรือข้อมูลส่วนบุคคล/)
})
