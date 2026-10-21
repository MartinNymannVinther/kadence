import type { Course, Overpass, StructureKind } from "@/modules/rulle";
import { ROAD_HALF, type Ground } from "./ground";
import { acrossRoad, arcAt, densify, pastTheRoad, type Pt } from "./overpass-line";
import { roadPoint } from "./road-point";

/**
 * An overpass's deck (ADR 0037), for drawing it (`overpasses.ts`) and for
 * what runs along it (`bridge-traffic.ts`): its line in the world, a point
 * every few metres; how wide and deep it is; and how high its top stands
 * anywhere along it — the land's at its two ends, raised where the road
 * passes under to leave room over the road, level over the road and
 * easing down again, never steeper than what it carries climbs: a railway
 * gently. A railway or a motorway is drawn a good way past the road, so
 * what runs on it is seen coming.
 */

export type DeckLine = {
  kind: StructureKind;
  line: Pt[];
  /** Metres along the line to each of its points, and all of it. */
  arc: number[];
  length: number;
  width: number;
  thick: number;
  /** The deck's top `s` metres along it. */
  top: (s: number) => number;
  /** Where the road passes under it: metres along it, the road's turn from it, and how far either side it is level. */
  lifts: { s: number; angle: number; hold: number }[];
};

type Span = { width: number; thick: number; clear: number; reach: number; ramp: number };

/**
 * By what it carries: metres across where the map gives one way, the
 * deck's depth, the room it leaves over the road, how far past the road's
 * middle it is drawn at least, and the steepest it slopes down from over
 * the road.
 */
export const SPAN: Record<StructureKind, Span> = {
  motorway: { width: 26, thick: 1.8, clear: 5.2, reach: 200, ramp: 0.05 },
  road: { width: 10, thick: 1.3, clear: 5, reach: 40, ramp: 0.06 },
  rail: { width: 6, thick: 1.5, clear: 5.4, reach: 260, ramp: 0.035 },
  path: { width: 3.5, thick: 0.6, clear: 4.6, reach: ROAD_HALF + 9, ramp: 0.08 },
  green: { width: 20, thick: 1.6, clear: 4.8, reach: ROAD_HALF + 9, ramp: 0.06 },
  water: { width: 6, thick: 1.3, clear: 4.6, reach: ROAD_HALF + 9, ramp: 0.06 },
};

/** Metres between the deck's points. */
const EVERY = 6;
/** Metres from the asphalt's edge to the wall either side of the road under a deck. */
export const WALL_FROM_EDGE = 3.2;

/**
 * How far along a deck either side of the road it lies level, and its
 * walls stand: far enough that the whole road is under the level part,
 * and that the wall's nearest corner — a deck `width` wide, crossing the
 * road at `angle` (π/2 straight across) — is `WALL_FROM_EDGE` from the
 * asphalt. A skewed wide deck reaches across the road with its corners;
 * measured along its middle line alone, its wall stood on the road (ADR 0108).
 */
export function holdOver(width: number, angle: number): number {
  const across = ROAD_HALF + WALL_FROM_EDGE + (width / 2) * Math.abs(Math.cos(angle));
  return across / Math.max(0.3, Math.sin(angle));
}

/** One deck for each line, lifted over every place the road passes under it. */
export function deckLines(
  course: Course,
  ground: Ground,
  overpasses: readonly Overpass[],
): DeckLine[] {
  const lines = new Map<object, Overpass[]>();
  for (const o of overpasses) {
    const key = o.points.length > 0 ? o.points : o;
    lines.set(key, [...(lines.get(key) ?? []), o]);
  }
  return [...lines.values()]
    .map((list) => deckLine(course, ground, list))
    .filter((d): d is DeckLine => d !== null);
}

function deckLine(course: Course, ground: Ground, list: Overpass[]): DeckLine | null {
  const o = list[0]!;
  const span = SPAN[o.kind];
  // Its line in the world: the map's, or one across the road for a tunnel's roof.
  const raw: Pt[] =
    o.points.length > 0 ? o.points.map((p) => ({ x: p.x, z: -p.y })) : acrossRoad(course, o.along);
  const line = densify(pastTheRoad(course, raw, list, span.reach), EVERY);
  const arc = [0];
  for (let k = 1; k < line.length; k++)
    arc.push(arc[k - 1]! + Math.hypot(line[k]!.x - line[k - 1]!.x, line[k]!.z - line[k - 1]!.z));
  const length = arc.at(-1)!;
  if (length < 1) return null;
  // The land at its two ends, and room over the road wherever it passes over.
  const land = (p: Pt) => ground.land?.heightAt(p.x, -p.z) ?? ground.height(p.x, p.z);
  const h0 = land(line[0]!);
  const h1 = land(line.at(-1)!);
  const base = (s: number) => h0 + ((h1 - h0) * s) / length;
  const width = Math.max(span.width, Math.min(90, o.wide * Math.sin(o.angle)));
  const lifts = list.map((c) => {
    const road = roadPoint(course, c.along, 0);
    const s = arcAt(line, arc, road.x, road.z);
    const lift = road.y + span.clear + span.thick - base(s);
    return {
      s,
      angle: c.angle,
      hold: holdOver(width, c.angle),
      lift,
      ease: (1.5 * lift) / span.ramp,
    };
  });
  return {
    kind: o.kind,
    line,
    arc,
    length,
    width,
    thick: span.thick,
    top: (s) => {
      let lift = 0;
      for (const l of lifts) {
        if (l.lift <= 0) continue;
        // A smoothstep down: no kink at either end, its steepest the ramp's.
        const t = Math.min(1, Math.max(0, (Math.abs(s - l.s) - l.hold) / l.ease));
        lift = Math.max(lift, l.lift * (1 - t * t * (3 - 2 * t)));
      }
      return base(s) + lift;
    },
    lifts: lifts.map(({ s, angle, hold }) => ({ s, angle, hold })),
  };
}
