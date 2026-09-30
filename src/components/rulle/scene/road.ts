import * as THREE from "three";
import type { Course } from "@/modules/rulle";
import { ROAD_HALF, sink, STREET, VERGE } from "./ground";
import { PALETTE } from "./palette";

/**
 * The road itself, the whole route at once: asphalt six metres wide on
 * its grass verges — or in a city (ADR 0036) its kerbs, cycle tracks and
 * pavements — white edge lines, and a dashed middle line whose dashes run
 * under the wheel: the road's own sense of speed. A route ridden out and
 * back is one road, drawn once. Built in kilometre lengths, so what is
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

export function buildRoad(course: Course, city = false): THREE.Group {
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
      for (const side of [1, -1] as const) {
        if (city) builder.street(s, t, side);
        else builder.verge(s, t, side);
      }
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
