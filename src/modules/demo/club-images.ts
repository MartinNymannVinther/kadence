import { edge, encodePng, mix, type Rgba } from "./png";

/**
 * The demo club's logo and picture (docs/adr/0054, ADR 0048), drawn in
 * Haij's colours: a round badge with a wheel for the logo, and rolling
 * Danish land with a road through it for the picture over "I dag". Both
 * are made-up art belonging to nobody, like the demo's riders.
 *
 * Pure: imports nothing from the database.
 */

const MOSS: Rgba = [74, 107, 83, 255]; // --primary, #4a6b53
const PAPER: Rgba = [247, 245, 241, 255]; // --background, #f7f5f1
const CLEAR: Rgba = [247, 245, 241, 0];

/** A ring of radius `r` and half-width `w`, as coverage 0–1 at distance `d` from its centre. */
const ring = (d: number, r: number, w: number) => 1 - edge(Math.abs(d - r) - w);

/** The logo: 256 px square, a moss badge with a paper ring and a wheel. */
export function demoLogoPng(): Uint8Array {
  const size = 256;
  const c = size / 2;
  return encodePng(size, size, (x, y) => {
    const dx = x + 0.5 - c;
    const dy = y + 0.5 - c;
    const d = Math.hypot(dx, dy);
    const badge = 1 - edge(d - 120);
    if (badge <= 0) return CLEAR;
    let paper = Math.max(ring(d, 102, 3), ring(d, 62, 4.5), 1 - edge(d - 11));
    if (d > 11 && d < 59) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 8;
        const line = Math.abs(dx * Math.sin(a) - dy * Math.cos(a));
        paper = Math.max(paper, 1 - edge(line - 1.6));
      }
    }
    const colour = mix(MOSS, PAPER, paper);
    return [colour[0], colour[1], colour[2], 255 * badge];
  });
}

const SKY_TOP: Rgba = [244, 233, 211, 255];
const SKY_LOW: Rgba = [232, 238, 228, 255];
const SUN: Rgba = [240, 207, 134, 255];
const FAR: Rgba = [163, 185, 157, 255];
const MID: Rgba = [111, 143, 104, 255];
const NEAR: Rgba = MOSS;
const ROAD: Rgba = [217, 210, 195, 255];
const LINE: Rgba = [247, 245, 241, 255];

/** The picture: 1200 × 360, sky and sun, three bands of hills and a road running into them. */
export function demoCoverPng(): Uint8Array {
  const width = 1200;
  const height = 360;
  const far = (x: number) => 200 + 16 * Math.sin(x / 140) + 9 * Math.sin(x / 53 + 1);
  const mid = (x: number) => 240 + 22 * Math.sin(x / 190 + 2) + 7 * Math.sin(x / 70);
  const near = (x: number) => 292 + 14 * Math.sin(x / 260 + 0.5);
  const top = 236;
  return encodePng(width, height, (px, py) => {
    const x = px + 0.5;
    const y = py + 0.5;
    let colour = mix(SKY_TOP, SKY_LOW, y / 220);
    const sun = Math.hypot(x - 905, y - 118);
    colour = mix(colour, SUN, Math.exp(-Math.max(0, sun - 46) / 40) * 0.35);
    colour = mix(colour, SUN, 1 - edge(sun - 46));
    colour = mix(colour, FAR, edge(y - far(x)));
    colour = mix(colour, MID, edge(y - mid(x)));
    colour = mix(colour, NEAR, edge(y - near(x)));
    if (y > top) {
      // The road narrows toward a point on the horizon, bending as it goes.
      const t = (y - top) / (height - top);
      const centre = 700 - 150 * t ** 1.6;
      const half = 3 + 150 * t;
      const across = Math.abs(x - centre);
      const road = (1 - edge(across - half)) * edge(y - mid(x));
      colour = mix(colour, ROAD, road);
      const dash = Math.sin(18 / (t + 0.08)) > 0.2 ? 1 : 0;
      colour = mix(colour, LINE, road * dash * (1 - edge(across - (0.6 + 3 * t))));
    }
    return colour;
  });
}
