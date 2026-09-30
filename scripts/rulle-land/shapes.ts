/**
 * The geometry the land script needs, on points in metres (x east, y
 * north): rings joined from the ways of a multipolygon, lines made
 * simpler, rings cut to a box, and a building's footprint as the smallest
 * rectangle round it.
 */

export type P = { x: number; y: number };
export type Box = { minX: number; minY: number; maxX: number; maxY: number };

const same = (a: P, b: P) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

/** Closed rings from the ways of a multipolygon's outer or inner members, joined end to end. */
export function joinRings(ways: P[][]): P[][] {
  const open = ways.filter((w) => w.length > 1).map((w) => [...w]);
  const rings: P[][] = [];
  while (open.length > 0) {
    const ring = open.shift()!;
    for (let grew = true; grew && !same(ring[0]!, ring.at(-1)!);) {
      grew = false;
      for (let i = 0; i < open.length; i++) {
        const way = open[i]!;
        const end = ring.at(-1)!;
        if (same(way[0]!, end)) ring.push(...way.slice(1));
        else if (same(way.at(-1)!, end)) ring.push(...way.reverse().slice(1));
        else continue;
        open.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && same(ring[0]!, ring.at(-1)!)) rings.push(ring);
  }
  return rings;
}

/** Douglas–Peucker: the points of a line that matter to within `tolerance` metres. */
export function simplify(points: P[], tolerance: number): P[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    const pa = points[a]!;
    const pb = points[b]!;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy);
    let far = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const p = points[i]!;
      // A closed ring starts and ends on one point: then the distance is to that point.
      const d =
        len > 0
          ? Math.abs((p.x - pa.x) * dy - (p.y - pa.y) * dx) / len
          : Math.hypot(p.x - pa.x, p.y - pa.y);
      if (d > far) {
        far = d;
        at = i;
      }
    }
    if (far > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** A ring cut to a box (Sutherland–Hodgman): what of it lies inside. */
export function clip(ring: P[], box: Box): P[] {
  const edges: [(p: P) => boolean, (a: P, b: P) => P][] = [
    [(p) => p.x >= box.minX, (a, b) => cut(a, b, (a.x - box.minX) / (a.x - b.x))],
    [(p) => p.x <= box.maxX, (a, b) => cut(a, b, (a.x - box.maxX) / (a.x - b.x))],
    [(p) => p.y >= box.minY, (a, b) => cut(a, b, (a.y - box.minY) / (a.y - b.y))],
    [(p) => p.y <= box.maxY, (a, b) => cut(a, b, (a.y - box.maxY) / (a.y - b.y))],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i]!;
      const b = input[(i + 1) % input.length]!;
      if (inside(b)) {
        if (!inside(a)) out.push(cross(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cross(a, b));
    }
    if (out.length === 0) return out;
  }
  return out;
}

const cut = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function area(ring: P[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** The smallest rectangle round a footprint: its middle, its two sides, and the turn of the first. */
export function footprint(points: P[]) {
  const hull = convexHull(points);
  let best = { area: Infinity, x: 0, y: 0, w: 0, d: 0, angle: 0 };
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = p.x * c + p.y * s;
      const v = -p.x * s + p.y * c;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const found = (maxU - minU) * (maxV - minV);
    if (found < best.area) {
      const u = (minU + maxU) / 2;
      const v = (minV + maxV) / 2;
      best = {
        area: found,
        x: u * c - v * s,
        y: u * s + v * c,
        w: maxU - minU,
        d: maxV - minV,
        angle,
      };
    }
  }
  return best;
}

function convexHull(points: P[]): P[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: P[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: P[] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A line with a point at least every `every` metres along it. */
export function densify(line: P[], every: number): P[] {
  const out: P[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / every));
    for (let k = 0; k < n; k++)
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(line.at(-1)!);
  return out;
}
