/**
 * remove-bg.mjs
 * Lee hero-robot.webp, convierte los píxeles blancos/casi-blancos a transparente,
 * y guarda el resultado en el mismo archivo (con canal alfa real).
 *
 * Umbral: píxeles con R,G,B todos >= THRESHOLD se vuelven transparentes.
 * El suavizado (feather) hace que los bordes cercanos al blanco bajen su alfa
 * gradualmente, evitando el "halo blanco" típico del chroma-key manual.
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

const INPUT  = 'static/hero-robot.webp'
const OUTPUT = 'static/hero-robot.webp'

// píxeles con R,G,B >= HARD son 100% transparentes
const HARD = 240
// píxeles con R,G,B >= SOFT empiezan a desvanecerse (feather zone)
const SOFT = 200

const img = sharp(readFileSync(INPUT))
const meta = await img.metadata()
const { width, height } = meta

// Extraer como RGBA raw
const raw = await sharp(readFileSync(INPUT))
  .ensureAlpha()
  .raw()
  .toBuffer()

const pixels = new Uint8Array(raw)

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i]
  const g = pixels[i + 1]
  const b = pixels[i + 2]
  // a = pixels[i + 3]

  const minChannel = Math.min(r, g, b)

  if (minChannel >= HARD) {
    // blanco puro → completamente transparente
    pixels[i + 3] = 0
  } else if (minChannel >= SOFT) {
    // zona de feather: reduce alfa proporcionalmente
    const t = (minChannel - SOFT) / (HARD - SOFT)   // 0 → 1
    const existingAlpha = pixels[i + 3]
    pixels[i + 3] = Math.round(existingAlpha * (1 - t))
  }
  // oscuro → alfa sin cambio
}

// Guardar como webp con alfa
await sharp(Buffer.from(pixels), {
  raw: { width, height, channels: 4 },
})
  .webp({ quality: 92, lossless: false })
  .toFile(OUTPUT + '.tmp.webp')

// reemplazar el original
import { renameSync } from 'fs'
renameSync(OUTPUT + '.tmp.webp', OUTPUT)

console.log(`✓ Fondo blanco removido → ${OUTPUT}`)
console.log(`  ${width}×${height} px`)
