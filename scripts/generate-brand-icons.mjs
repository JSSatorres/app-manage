// Genera favicon, apple-icon e iconos PWA a partir del isotipo de SportApp (balón en movimiento).
// El dibujo replica `src/components/shared/BrandMark.tsx`; si cambias uno, cambia el otro.
// Uso: node scripts/generate-brand-icons.mjs   (sharp llega como dependencia de Next.js)
import { mkdir, writeFile } from "node:fs/promises"
import sharp from "sharp"

// Degradado de marca = tokens `chart-1` → `chart-6` del tema claro (src/app/globals.css).
const GRADIENT_FROM = "#6366f1"
const GRADIENT_TO = "#8b5cf6"

const GLYPH = `<circle cx="15" cy="12" r="7"/><path d="M10.4 6.9c2.5 2.8 2.5 7.4 0 10.2M19.6 6.9c-2.5 2.8-2.5 7.4 0 10.2"/><path d="M3 8.5h2.5M1.5 12h3.5M3 15.5h2.5"/>`
// A 16 px las estelas se emborronan: balón solo, centrado y con trazo más grueso.
const GLYPH_COMPACT = `<circle cx="12" cy="12" r="8"/><path d="M6.8 6.5c2.8 3 2.8 8 0 11M17.2 6.5c-2.8 3-2.8 8 0 11"/>`

function tile({ glyph = GLYPH, scale = 0.8, strokeWidth = 2, radius = 5.5 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GRADIENT_FROM}"/><stop offset="1" stop-color="${GRADIENT_TO}"/></linearGradient></defs>
  <rect width="24" height="24" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(12 12) scale(${scale}) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>`
}

function png(svg, size) {
  return sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png().toBuffer()
}

// ICO con imágenes PNG embebidas (soportado por todos los navegadores actuales).
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map(({ data }) => data)])
}

const rounded = tile()
// iOS y los iconos «maskable» recortan ellos mismos: fondo a sangre y dibujo dentro de la zona segura.
const fullBleed = tile({ radius: 0, scale: 0.72 })
const maskable = tile({ radius: 0, scale: 0.6 })

await mkdir("public/icons", { recursive: true })

await writeFile(
  "src/app/favicon.ico",
  ico([
    { size: 16, data: await png(tile({ glyph: GLYPH_COMPACT, scale: 0.82, strokeWidth: 2.4 }), 16) },
    { size: 32, data: await png(rounded, 32) },
    { size: 48, data: await png(rounded, 48) },
  ]),
)
await writeFile("src/app/apple-icon.png", await png(fullBleed, 180))
await writeFile("public/icons/icon-192x192.png", await png(rounded, 192))
await writeFile("public/icons/icon-512x512.png", await png(rounded, 512))
await writeFile("public/icons/icon-maskable-512x512.png", await png(maskable, 512))

console.log("Iconos de marca generados.")
