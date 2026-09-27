/**
 * Draws Kadence's app icons as PNG for the web app manifest
 * (src/app/manifest.ts), from the same three bars as src/app/icon.svg,
 * with Node's own zlib and nothing else — no image library (CLAUDE.md:
 * ask before a dependency). Run again after changing the mark:
 *
 *   pnpm script scripts/icons.ts
 *
 * Writes public/icon-192.png, public/icon-512.png (rounded paper tile,
 * purpose "any") and public/icon-maskable-512.png (full-bleed paper, the
 * bars inside the maskable safe zone).
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

type Rgb = [number, number, number];
type RoundRect = { x: number; y: number; w: number; h: number; r: number; color: Rgb };

const PAPER: Rgb = [0xf7, 0xf5, 0xf1];
/** The mark in src/app/icon.svg: viewBox 38 × 34, three bars. */
const MARK = { width: 38, height: 34 };
const BARS: RoundRect[] = [
  { x: 0, y: 0, w: 38, h: 8, r: 2.5, color: [0x4a, 0x6b, 0x53] },
  { x: 0, y: 13, w: 25, h: 8, r: 2.5, color: [0x7a, 0x9a, 0x80] },
  { x: 0, y: 26, w: 31, h: 8, r: 2.5, color: [0xc9, 0xc2, 0xb6] },
];
const SAMPLES = 4;

function inside(px: number, py: number, rect: RoundRect): boolean {
  if (px < rect.x || py < rect.y || px > rect.x + rect.w || py > rect.y + rect.h) return false;
  const dx = Math.max(rect.x + rect.r - px, 0, px - (rect.x + rect.w - rect.r));
  const dy = Math.max(rect.y + rect.r - py, 0, py - (rect.y + rect.h - rect.r));
  return dx * dx + dy * dy <= rect.r * rect.r;
}

/** RGBA pixels: a paper tile (rounded or full) with the mark centred at `markShare` of the width. */
function draw(size: number, tileRadius: number, markShare: number): Uint8Array {
  const scale = (size * markShare) / MARK.width;
  const offsetX = (size - MARK.width * scale) / 2;
  const offsetY = (size - MARK.height * scale) / 2;
  const bars = BARS.map((b) => ({
    ...b,
    x: offsetX + b.x * scale,
    y: offsetY + b.y * scale,
    w: b.w * scale,
    h: b.h * scale,
    r: b.r * scale,
  }));
  const tile: RoundRect = { x: 0, y: 0, w: size, h: size, r: tileRadius, color: PAPER };
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (!inside(px, py, tile)) continue;
          const bar = bars.find((candidate) => inside(px, py, candidate));
          const color = bar ? bar.color : PAPER;
          r += color[0];
          g += color[1];
          b += color[2];
          a += 1;
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        pixels[i] = Math.round(r / a);
        pixels[i + 1] = Math.round(g / a);
        pixels[i + 2] = Math.round(b / a);
      }
      pixels[i + 3] = Math.round((a / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function png(size: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(rows, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size, draw(size, size * 0.22, 0.58)));
}
// Maskable: full bleed, the mark well inside the 80 % safe circle.
writeFileSync("public/icon-maskable-512.png", png(512, draw(512, 0, 0.5)));
writeFileSync("public/apple-touch-icon.png", png(180, draw(180, 0, 0.56)));
console.log("icons written to public/");
