import type { Course } from "@/modules/rulle";

/**
 * The road's samples sorted into squares of `CELL` metres, so the nearest
 * point of the road to a place is found by looking in the squares round
 * it, the nearest ring first, and no further out than the nearest point
 * found so far could be beaten. World coordinates: x east, z south.
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
   * The nearest point of the road within about `reach` metres: how far,
   * how high the road is there, and which sample it is. Further than
   * that, a distance of Infinity.
   */
  nearest(x: number, z: number, reach: number): Nearest {
    const ci = Math.floor(x / CELL) - this.i0;
    const cj = Math.floor(z / CELL) - this.j0;
    const rings = Math.ceil(reach / CELL);
    let best = Infinity;
    let index = -1;
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
            const d = dx * dx + dz * dz;
            if (d < best) {
              best = d;
              index = p;
            }
          }
        }
      }
      // Whatever lies in the next ring out is at least r squares away.
      if (best <= (r * CELL) ** 2) break;
    }
    return index < 0
      ? { d: Infinity, ele: 0, index: -1 }
      : { d: Math.sqrt(best), ele: this.course.ele[index]!, index };
  }
}
