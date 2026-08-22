import sharp from 'sharp'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT, 'src', 'assets')
const RASTER_EXTENSIONS = new Set(['.webp', '.gif', '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff'])
const HANDCRAFTED_SVG_NAMES = new Set([
  'pre-assessment-answer-option-frame-user.svg',
  'pre-assessment-answer-option-selected-user.svg',
])

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
}

const SOURCE_PRIORITY = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff']

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (RASTER_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path)
  }
  return files
}

const sourceRank = (path) => SOURCE_PRIORITY.indexOf(extname(path).toLowerCase())

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const files = await walk(ASSETS_DIR)
const groups = new Map()

for (const file of files) {
  const output = join(dirname(file), `${basename(file, extname(file))}.svg`)
  if (HANDCRAFTED_SVG_NAMES.has(basename(output))) continue
  const group = groups.get(output) ?? []
  group.push(file)
  groups.set(output, group)
}

let converted = 0
let skippedDuplicates = 0

for (const [output, candidates] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  candidates.sort((a, b) => sourceRank(a) - sourceRank(b))
  const source = candidates[0]
  const sourceExt = extname(source).toLowerCase()
  const input = await readFile(source)
  const metadata = await sharp(input, { animated: true }).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions: ${source}`)
  }

  const width = metadata.width
  const height = metadata.pageHeight ?? metadata.height

  const isAnimated = (metadata.pages ?? 1) > 1
  const encoded = isAnimated ? await sharp(input, { page: 0 }).png({ compressionLevel: 9 }).toBuffer() : await sharp(input).png({ compressionLevel: 9 }).toBuffer()
  const base64 = encoded.toString('base64')
  const imageMime = 'image/png'
  const imageUri = `data:${imageMime};base64,${base64}`
  const label = escapeXml(relative(ROOT, source).replaceAll('\\\\', '/'))
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <image href="${imageUri}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
</svg>
`

  await writeFile(output, svg, 'utf8')
  converted += 1
  skippedDuplicates += candidates.length - 1
  console.log(`${relative(ROOT, output).replaceAll('\\\\', '/')} <= ${relative(ROOT, source).replaceAll('\\\\', '/')}`)
}

console.log(`Generated ${converted} SVG files${skippedDuplicates ? ` (skipped duplicate raster sources: ${skippedDuplicates})` : ''}`)
