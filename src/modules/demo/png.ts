import { deflateSync } from "node:zlib";

/**
 * A PNG from a function of the pixel, for the demo club's logo and
 * picture (docs/adr/0054): drawn by code, so the demo needs no image
 * files and no library. Truecolour with alpha, eight bits a channel, each
 * row filtered against the one above ("Up"), which turns smooth skies and
 * flat colour into the zeros deflate packs well (PNG specification,
 * sections 9.2 and 11.2.2).
 *
 * Pure: imports nothing from the database.
 */

export type Rgba = readonly [number, number, number, number];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Encodes `width` × `height` pixels, each asked of `pixel(x, y)`. */
export function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Rgba,
): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(stride);
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      row.set([clamp(r), clamp(g), clamp(b), clamp(a)], x * 4);
    }
    const at = y * (stride + 1);
    raw[at] = 2; // Up
    for (let i = 0; i < stride; i++) raw[at + 1 + i] = (row[i]! - previous[i]!) & 0xff;
    previous = row;
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, deflate, filtering, no interlace
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Linear blend from `a` to `b`, `t` from 0 to 1. */
export function mix(a: Rgba, b: Rgba, t: number): Rgba {
  const u = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
    a[3] + (b[3] - a[3]) * u,
  ];
}

/** 0 inside an edge, 1 outside, over about a pixel: soft edges without supersampling. */
export function edge(distance: number): number {
  return Math.max(0, Math.min(1, distance + 0.5));
}
