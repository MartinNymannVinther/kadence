import type { Course } from "@/modules/rulle";

/**
 * The road's samples sorted into squares of `CELL` metres, so the nearest
 * point of the road to a place is found by looking in the squares round
 * it, the nearest ring first, and no further out than the nearest point
 * found so far could be beaten. World coordinates: x east, z south.
 *
 * The distance is to the road's line between its samples, not to the
 * samples themselves: they lie ten metres apart, and a place midway
 * between two of them on the asphalt is five metres from either — far
 * enough, by the samples alone, for a tree.
 */

const CELL = 100;

export type Nearest = { d: number; ele: number; index: number };

export class RoadGrid {
  private readonly i0: number;
  private readonly j0: number;
  private readonly ni: number;
  private readonly nj: number;
  /** For each square, where its samples start in `items`; one more at the end. */
  private readonly start: Int32Array;
  private readonly items: Int32Array;

  constructor(private readonly course: Course) {
    const n = course.x.length;
    let minI = Infinity;
    let maxI = -Infinity;
    let minJ = Infinity;
    let maxJ = -Infinity;
    for (let k = 0; k < n; k++) {
      const i = Math.floor(course.x[k]! / CELL);
      const j = Math.floor(-course.y[k]! / CELL);
      minI = Math.min(minI, i);
      maxI = Math.max(maxI, i);
      minJ = Math.min(minJ, j);
      maxJ = Math.max(maxJ, j);
    }
    this.i0 = minI;
    this.j0 = minJ;
    this.ni = maxI - minI + 1;
    this.nj = maxJ - minJ + 1;
    const cellOf = new Int32Array(n);
    const start = new Int32Array(this.ni * this.nj + 1);
    for (let k = 0; k < n; k++) {
      const c =
        (Math.floor(-course.y[k]! / CELL) - this.j0) * this.ni +
        (Math.floor(course.x[k]! / CELL) - this.i0);
      cellOf[k] = c;
      start[c + 1]!++;
    }
    for (let c = 0; c < this.ni * this.nj; c++) start[c + 1]! += start[c]!;
    const fill = start.slice(0, -1);
    this.items = new Int32Array(n);
    for (let k = 0; k < n; k++) this.items[fill[cellOf[k]!]!++] = k;
    this.start = start;
  }

  /**
   * The nearest point of the road's line within about `reach` metres: how
   * far, how high the road is there, and the sample nearest it. Further
   * than that, a distance of Infinity.
   */
  nearest(x: number, z: number, reach: number): Nearest {
    const ci = Math.floor(x / CELL) - this.i0;
    const cj = Math.floor(z / CELL) - this.j0;
    const rings = Math.ceil(reach / CELL);
    // A sample further than the best line found by a sample's length cannot lead to a nearer one.
    const step = this.course.step;
    const found: Nearest = { d: Infinity, ele: 0, index: -1 };
    for (let r = 0; r <= rings; r++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || i >= this.ni) continue;
        // The ring's top and bottom rows whole, its sides only at their ends.
        const edge = i === ci - r || i === ci + r;
        for (let j = cj - r; j <= cj + r; j += edge || r === 0 ? 1 : 2 * r) {
          if (j < 0 || j >= this.nj) continue;
          const c = j * this.ni + i;
          for (let k = this.start[c]!; k < this.start[c + 1]!; k++) {
            const p = this.items[k]!;
            const dx = this.course.x[p]! - x;
            const dz = -this.course.y[p]! - z;
            if (dx * dx + dz * dz < (found.d + step) ** 2) this.toLine(p, x, z, found);
          }
        }
      }
      // Whatever lies in the next ring out is at least r squares away, and its line a sample nearer.
      if (found.d <= r * CELL - step) break;
    }
    return found;
  }

  /** The stretches of road either side of sample `p`: the nearer of them, if nearer than `found`. */
  private toLine(p: number, x: number, z: number, found: Nearest): void {
    const { x: cx, y: cy, ele } = this.course;
    const n = cx.length;
    for (const [a, b] of [
      [(p - 1 + n) % n, p],
      [p, (p + 1) % n],
    ] as const) {
      const ax = cx[a]!;
      const az = -cy[a]!;
      const ux = cx[b]! - ax;
      const uz = -cy[b]! - az;
      const len2 = ux * ux + uz * uz;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / len2)) : 0;
      const d = Math.hypot(ax + ux * t - x, az + uz * t - z);
      if (d >= found.d) continue;
      found.d = d;
      found.ele = ele[a]! + (ele[b]! - ele[a]!) * t;
      found.index = t < 0.5 ? a : b;
    }
  }
}
