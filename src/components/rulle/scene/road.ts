import * as THREE from "three";
import type { Course } from "@/modules/rulle";
import { BRIDGE, ROAD_HALF, sink, STREET, VERGE } from "./road-profile";
import { PALETTE } from "./palette";

/**
 * The road itself, the whole route at once: asphalt six metres wide on
 * its grass verges — or in a city (ADR 0036) its kerbs, cycle tracks and
 * pavements — white edge lines, and a dashed middle line whose dashes run
 * under the wheel: the road's own sense of speed — no lines where it is
 * cobbled (`cobbles.ts`). On a bridge (ADR 0037) no verge, but the deck's
 * edge, a parapet, and the deck's face down to its underside. A route
 * ridden out and back is one road, drawn once. Built in kilometre lengths, so what is
 * behind the camera is not drawn.
 */

const SEGMENT = 100;
const DASH = 3;
const DASH_EVERY = 12;

/** A sample of the road: its middle, the way to its right, and how far the land lies below it. */
export type Section = { cx: number; cy: number; cz: number; rx: number; rz: number; sunk: number };

/** Where each sample of the course lies, and which way is right of it. */
export function sections(course: Course): Section[] {
  const n = course.x.length;
  const out: Section[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n;
    const b = (i + 1) % n;
    const dx = course.x[b]! - course.x[a]!;
    const dz = -(course.y[b]! - course.y[a]!);
    const len = Math.hypot(dx, dz) || 1;
    out.push({
      cx: course.x[i]!,
      cy: course.ele[i]!,
      cz: -course.y[i]!,
      rx: -dz / len,
      rz: dx / len,
      sunk: sink(course, i),
    });
  }
  return out;
}

export function buildRoad(
  course: Course,
  city = false,
  cobbled: (along: number) => boolean = () => false,
  onDeck: (along: number) => boolean = () => false,
): THREE.Group {
  const group = new THREE.Group();
  const all = sections(course);
  const n = all.length;
  // A route out and back is drawn once: the way back is the same road.
  const last = course.outAndBack ? Math.ceil(n / 2) : n;
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (let start = 0; start < last; start += SEGMENT) {
    const end = Math.min(last, start + SEGMENT);
    const builder = new Strip();
    for (let i = start; i < end; i++) {
      const s = all[i]!;
      const t = all[(i + 1) % n]!;
      // Asphalt, then the two verges falling to the land, further where the road is steep.
      builder.band(s, t, -ROAD_HALF, ROAD_HALF, 0.03, 0.03, PALETTE.road);
      const deck = onDeck(i * course.step) || onDeck((i + 1) * course.step);
      for (const side of [1, -1] as const) {
        if (deck) builder.deckSide(s, t, side, city);
        else if (city) builder.street(s, t, side);
        else builder.verge(s, t, side);
      }
      if (deck) builder.underside(s, t, city);
      if (cobbled(i * course.step) || cobbled((i + 1) * course.step)) continue;
      builder.band(s, t, ROAD_HALF - 0.45, ROAD_HALF - 0.3, 0.05, 0.05, PALETTE.line);
      builder.band(s, t, -ROAD_HALF + 0.3, -ROAD_HALF + 0.45, 0.05, 0.05, PALETTE.line);
      // A dash starts every DASH_EVERY metres; this section holds the one that falls in it.
      const offset = (DASH_EVERY - ((i * course.step) % DASH_EVERY)) % DASH_EVERY;
      if (offset < course.step) builder.dash(s, t, offset, course.step);
    }
    const mesh = new THREE.Mesh(builder.geometry(), material);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}

/** Quads between two sections, collected into one geometry. */
class Strip {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];

  /** A band from `from` to `to` metres right of the middle, raised `lift` metres at each side. */
  band(
    s: Section,
    t: Section,
    from: number,
    to: number,
    liftFrom: number,
    liftTo: number,
    color: string,
  ) {
    const p = (q: Section, off: number, lift: number) =>
      [q.cx + q.rx * off, q.cy + lift, q.cz + q.rz * off] as const;
    this.quad(
      p(s, from, liftFrom),
      p(s, to, liftTo),
      p(t, to, liftTo),
      p(t, from, liftFrom),
      color,
    );
  }

  /** A verge on one side (1 right, -1 left), from the asphalt's edge down to the land at each end. */
  verge(s: Section, t: Section, side: 1 | -1) {
    const p = (q: Section, off: number, lift: number) =>
      [q.cx + q.rx * off, q.cy + lift, q.cz + q.rz * off] as const;
    const inner = side * ROAD_HALF;
    const outer = side * (ROAD_HALF + VERGE);
    const [a, b, c, d] =
      side > 0
        ? [p(s, inner, 0.01), p(s, outer, -s.sunk), p(t, outer, -t.sunk), p(t, inner, 0.01)]
        : [p(s, outer, -s.sunk), p(s, inner, 0.01), p(t, inner, 0.01), p(t, outer, -t.sunk)];
    this.quad(a, b, c, d, PALETTE.verge);
  }

  /** A city street's side: kerb, cycle track, kerb, pavement, and down to the land (`STREET`). */
  street(s: Section, t: Section, side: 1 | -1) {
    const S = STREET;
    this.pavements(s, t, side);
    // Beyond the pavement, down to the land.
    const p = (q: Section, off: number, lift: number) =>
      [q.cx + q.rx * off, q.cy + lift, q.cz + q.rz * off] as const;
    const inner = side * (ROAD_HALF + S.pavement);
    const outer = side * (ROAD_HALF + VERGE);
    const up = S.pavementLift;
    const [a, b, c, d] =
      side > 0
        ? [p(s, inner, up), p(s, outer, -s.sunk), p(t, outer, -t.sunk), p(t, inner, up)]
        : [p(s, outer, -s.sunk), p(s, inner, up), p(t, inner, up), p(t, outer, -t.sunk)];
    this.quad(a, b, c, d, PALETTE.pavement);
  }

  /** A city street's kerbs, cycle track and pavement on one side. */
  private pavements(s: Section, t: Section, side: 1 | -1) {
    const S = STREET;
    const bands: [number, number, number, number, string][] = [
      [0, S.kerb, 0, S.trackLift, PALETTE.kerb],
      [S.kerb, S.track, S.trackLift, S.trackLift, PALETTE.cycleTrack],
      [S.track, S.track + S.kerb, S.trackLift, S.pavementLift, PALETTE.kerb],
      [S.track + S.kerb, S.pavement, S.pavementLift, S.pavementLift, PALETTE.pavement],
    ];
    for (const [from, to, liftFrom, liftTo, color] of bands) {
      if (side > 0) this.band(s, t, ROAD_HALF + from, ROAD_HALF + to, liftFrom, liftTo, color);
      else this.band(s, t, -(ROAD_HALF + to), -(ROAD_HALF + from), liftTo, liftFrom, color);
    }
  }

  /**
   * A bridge's side (ADR 0037): the edge beside the asphalt — or a city's
   * pavement — a parapet on it, and the deck's face down to its underside.
   */
  deckSide(s: Section, t: Section, side: 1 | -1, city: boolean) {
    const B = BRIDGE;
    const edge = city ? STREET.pavement : B.edge;
    const lift = city ? STREET.pavementLift : B.kerb;
    if (city) this.pavements(s, t, side);
    else if (side > 0) this.band(s, t, ROAD_HALF, ROAD_HALF + edge, lift, lift, PALETTE.bridge);
    else this.band(s, t, -(ROAD_HALF + edge), -ROAD_HALF, lift, lift, PALETTE.bridge);
    const inner = ROAD_HALF + edge;
    const outer = inner + B.wall;
    const top = lift + B.parapet;
    this.wall(s, t, side * inner, lift, top, PALETTE.bridge);
    if (side > 0) this.band(s, t, inner, outer, top, top, PALETTE.bridge);
    else this.band(s, t, -outer, -inner, top, top, PALETTE.bridge);
    this.wall(s, t, side * outer, -B.depth, top, PALETTE.bridgeShade);
  }

  /** A bridge's underside, from parapet to parapet: seen from the water below. */
  underside(s: Section, t: Section, city: boolean) {
    const out = ROAD_HALF + (city ? STREET.pavement : BRIDGE.edge) + BRIDGE.wall;
    this.wall(s, t, 0, -BRIDGE.depth, -BRIDGE.depth, PALETTE.bridgeShade, out);
  }

  /**
   * A face along the road `off` metres right of its middle, from `bottom`
   * to `top` above the road; or, where `across` is given, a flat one that
   * far either side at `bottom`. Drawn from both sides.
   */
  private wall(
    s: Section,
    t: Section,
    off: number,
    bottom: number,
    top: number,
    color: string,
    across = 0,
  ) {
    const p = (q: Section, o: number, lift: number) =>
      [q.cx + q.rx * o, q.cy + lift, q.cz + q.rz * o] as const;
    const [a, b, c, d] = across
      ? [p(s, -across, bottom), p(t, -across, bottom), p(t, across, top), p(s, across, top)]
      : [p(s, off, bottom), p(t, off, bottom), p(t, off, top), p(s, off, top)];
    this.quad(a, b, c, d, color);
    this.quad(a, d, c, b, color);
  }

  /** A dash of the middle line, starting `offset` metres after `s` (running on past `t` if it must). */
  dash(s: Section, t: Section, offset: number, step: number) {
    const mix = (k: number): Section => {
      const f = k / step;
      return {
        cx: s.cx + (t.cx - s.cx) * f,
        cy: s.cy + (t.cy - s.cy) * f,
        cz: s.cz + (t.cz - s.cz) * f,
        rx: s.rx,
        rz: s.rz,
        sunk: s.sunk,
      };
    };
    const a = mix(offset);
    const b = mix(offset + DASH);
    this.band(a, b, -0.07, 0.07, 0.05, 0.05, PALETTE.line);
  }

  private quad(
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
    d: readonly number[],
    color: string,
  ) {
    const col = new THREE.Color(color);
    // a and b cross the road at the near section, left to right; c and d at the far one,
    // right to left. Wound so, both triangles face up whichever way the road turns.
    for (const v of [a, b, c, a, c, d]) {
      this.positions.push(v[0]!, v[1]!, v[2]!);
      this.colors.push(col.r, col.g, col.b);
    }
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}
