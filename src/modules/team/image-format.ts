/**
 * What an uploaded club image is, read from its own bytes rather than
 * from a name or a header the browser sent (docs/adr/0048). PNG, JPEG and
 * WebP are accepted; SVG never is, because an SVG can carry script. The
 * width and height are read too, so the database's limits can be kept.
 *
 * Pure: imports nothing from the database.
 */

export type ImageKind = "logo" | "cover";
export const IMAGE_KINDS: readonly ImageKind[] = ["logo", "cover"];

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

/** The largest file and the longest side the browser scales each kind to. */
export const IMAGE_LIMITS: Record<ImageKind, { bytes: number; side: number }> = {
  logo: { bytes: 300 * 1024, side: 512 },
  cover: { bytes: 2 * 1024 * 1024, side: 1600 },
};

/** Beyond what the browser sends, so a camera's own file is refused, not stored. */
const MAX_DIMENSION = 4096;

export type ImageInfo = { mime: ImageMime; width: number; height: number };

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32be = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) >>> 0) + ((b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

function png(b: Uint8Array): ImageInfo | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || signature.some((v, i) => b[i] !== v) || ascii(b, 12, 4) !== "IHDR")
    return null;
  return { mime: "image/png", width: u32be(b, 16), height: u32be(b, 20) };
}

/** Start-of-frame markers carry the size; C4, C8 and CC are other things. */
function jpeg(b: Uint8Array): ImageInfo | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    const length = u16be(b, i + 2);
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { mime: "image/jpeg", height: u16be(b, i + 5), width: u16be(b, i + 7) };
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function webp(b: Uint8Array): ImageInfo | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { mime: "image/webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { mime: "image/webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

/** The image's type and size, or null when it is none of the three. */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  return png(bytes) ?? jpeg(bytes) ?? webp(bytes);
}

export type Acceptance =
  { ok: true; info: ImageInfo } | { ok: false; reason: "format" | "tooLarge" | "dimensions" };

/** Whether this file may be stored as the club's logo or picture. */
export function acceptImage(kind: ImageKind, bytes: Uint8Array): Acceptance {
  if (bytes.length > IMAGE_LIMITS[kind].bytes) return { ok: false, reason: "tooLarge" };
  const info = inspectImage(bytes);
  if (!info) return { ok: false, reason: "format" };
  if (
    info.width < 1 ||
    info.height < 1 ||
    info.width > MAX_DIMENSION ||
    info.height > MAX_DIMENSION
  )
    return { ok: false, reason: "dimensions" };
  return { ok: true, info };
}

export function isImageKind(value: string): value is ImageKind {
  return (IMAGE_KINDS as readonly string[]).includes(value);
}
