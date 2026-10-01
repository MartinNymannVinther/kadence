/**
 * An organiser's marks on a route (ADR 0036): the waypoints a race's GPX
 * carries beside its track — an island in the middle of the road, the
 * cobbles, the feed zone, the finish, the team buses' car park, the top of
 * a hill sprint (ADR 0046) — read for
 * what they say, in Danish, English or French, and laid along the course
 * where they are. A mark that says none of these is left alone; so is one
 * too far from the road to belong to it. What a person wrote is only
 * matched against these words, never shown or obeyed. Pure.
 */

export type MarkKind =
  | "obstacle"
  | "cobbles"
  | "hill"
  | "feed"
  | "litter"
  | "finish"
  | "podium"
  | "parking"
  | "bumps"
  | "bend";

/** A waypoint as the file has it. */
export type RouteMark = { lat: number; lon: number; text: string };

/**
 * A mark on the course: how far along the lap and how far off the road,
 * metres, and on which side of it — right (1) or left (-1), going the
 * course's way.
 */
export type CourseMark = { kind: MarkKind; along: number; off: number; side: 1 | -1 };

export const MARK_LIMITS = {
  /** Waypoints read from a file; more are not read. */
  maxMarks: 500,
  /** Characters of a waypoint's words kept to read. */
  maxText: 200,
  /** Farther from the road than this, a mark is not the course's. */
  maxOff: 120,
} as const;

/** The words each kind of mark is written with; the first that fits is the kind. */
const WORDS: readonly [MarkKind, RegExp][] = [
  ["cobbles", /brosten|cobble|\bpav[ée]s?(?![a-z])/i],
  [
    "hill",
    /bakkespurt|bjergspurt|bjergpoint|bjergkonge|king of the mountains?|hill ?sprint|grand prix de la montagne|meilleur grimpeur/i,
  ],
  ["feed", /feed ?zone|ravitaill|langning|forplejning/i],
  ["litter", /litter|affald|déchets?|dechets?|drop ?zone/i],
  ["podium", /podie|podium/i],
  ["parking", /parker|parking|team ?bus|holdbus/i],
  ["bumps", /bump|chikane|ralentisseur|dos d.âne/i],
  ["bend", /sving|\bbend\b|virage|\bturn\b|\bdrej/i],
  ["obstacle", /obstacle|forhindring|hindring|\bhelle\b|traffic island|îlot|\bilot\b|refuge/i],
  ["finish", /finish|målstreg|\bmål\b|arrivée|arrivee|\bfin(ale)?\b/i],
];

export function markKind(text: string): MarkKind | null {
  for (const [kind, words] of WORDS) if (words.test(text)) return kind;
  return null;
}

/**
 * The marks on a course whose samples are `x`, `y` (metres, the course's
 * plane) every `step` metres, the file's marks laid there by `toPlane`.
 * Sorted along the lap.
 */
export function marksOn(
  marks: readonly RouteMark[],
  course: { x: number[]; y: number[]; step: number },
  toPlane: (lat: number, lon: number) => { x: number; y: number },
): CourseMark[] {
  const out: CourseMark[] = [];
  for (const mark of marks.slice(0, MARK_LIMITS.maxMarks)) {
    const kind = markKind(mark.text.slice(0, MARK_LIMITS.maxText));
    if (!kind) continue;
    const p = toPlane(mark.lat, mark.lon);
    let best = Infinity;
    let at = 0;
    for (let i = 0; i < course.x.length; i++) {
      const d = Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y);
      // Out and back, the road is there twice: the first time it is met counts.
      if (d < best - 1) {
        best = d;
        at = i;
      }
    }
    if (best > MARK_LIMITS.maxOff) continue;
    // Which side: the way the road runs there, crossed with the way to the mark.
    const n = course.x.length;
    const a = Math.max(0, at - 1);
    const b = Math.min(n - 1, at + 1);
    const dx = course.x[b]! - course.x[a]!;
    const dy = course.y[b]! - course.y[a]!;
    const cross = dx * (p.y - course.y[at]!) - dy * (p.x - course.x[at]!);
    out.push({ kind, along: at * course.step, off: Math.round(best), side: cross > 0 ? -1 : 1 });
  }
  return out.sort((a, b) => a.along - b.along);
}
