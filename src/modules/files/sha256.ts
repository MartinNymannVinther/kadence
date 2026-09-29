/**
 * SHA-256 (FIPS 180-4) in plain TypeScript, for the pages that have no
 * `crypto.subtle`. A browser gives SubtleCrypto only to a secure context
 * — https, or localhost — and a Kadence run on its own server and reached
 * over http on the local network is neither (dogma 2). Without a hash the
 * browser cannot ask which rides Kadence has, and a device's folder or a
 * Strava archive would send every ride again each time. The digest must
 * be the server's (`node:crypto`) byte for byte: it is the question.
 *
 * Pure: no DOM, no database.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/** One 64-byte block of `data` at `at`, folded into the state `h`. */
function compress(h: Uint32Array, w: Uint32Array, data: Uint8Array, at: number) {
  for (let i = 0; i < 16; i++) {
    const j = at + i * 4;
    w[i] = (data[j]! << 24) | (data[j + 1]! << 16) | (data[j + 2]! << 8) | data[j + 3]!;
  }
  for (let i = 16; i < 64; i++) {
    const x = w[i - 15]!;
    const y = w[i - 2]!;
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
  }
  let a = h[0]!;
  let b = h[1]!;
  let c = h[2]!;
  let d = h[3]!;
  let e = h[4]!;
  let f = h[5]!;
  let g = h[6]!;
  let k = h[7]!;
  for (let i = 0; i < 64; i++) {
    const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (k + s1 + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) | 0;
    const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    k = g;
    g = f;
    f = e;
    e = (d + t1) | 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  h[0] = (h[0]! + a) | 0;
  h[1] = (h[1]! + b) | 0;
  h[2] = (h[2]! + c) | 0;
  h[3] = (h[3]! + d) | 0;
  h[4] = (h[4]! + e) | 0;
  h[5] = (h[5]! + f) | 0;
  h[6] = (h[6]! + g) | 0;
  h[7] = (h[7]! + k) | 0;
}

/** The digest as 64 lower-case hex digits, the way the server writes it. */
export function sha256Hex(data: Uint8Array): string {
  const h = new Uint32Array(INITIAL);
  const w = new Uint32Array(64);
  const whole = data.length - (data.length % 64);
  // The file is read where it lies; only its last, padded blocks are copied.
  for (let at = 0; at < whole; at += 64) compress(h, w, data, at);
  const rest = data.length - whole;
  const tail = new Uint8Array(rest < 56 ? 64 : 128);
  tail.set(data.subarray(whole));
  tail[rest] = 0x80;
  // The length in bits, as a 64-bit big-endian number at the very end.
  const view = new DataView(tail.buffer);
  view.setUint32(tail.length - 8, Math.floor(data.length / 0x20000000));
  view.setUint32(tail.length - 4, (data.length * 8) >>> 0);
  for (let at = 0; at < tail.length; at += 64) compress(h, w, tail, at);
  return Array.from(h, (word) => word.toString(16).padStart(8, "0")).join("");
}

/**
 * The file's SHA-256: the browser's own where it has one, which is
 * faster, and this one where it does not.
 */
export async function hashHex(data: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const digest = await subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // A browser that has the object but will not use it here: the plain one answers the same.
    }
  }
  return sha256Hex(data);
}
