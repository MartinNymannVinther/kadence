import { hash } from "./hash";
import { courseAt, type Course } from "./route/course";

/**
 * How the rider on the screen sits on the bike: in the saddle, hands on
 * the hoods, most of the time; out of the saddle on a steep climb, in
 * spells, as a rider does when it bites — more of the time the steeper it
 * is; and low in the drops on a fast descent. Only the picture: the watts
 * are the trainer's, whatever the figure does. Pure.
 */

export type Posture = "seated" | "standing" | "tuck";

export const POSTURE = {
  /** A climb this steep has spells out of the saddle… */
  standFrom: 0.06,
  /** …a share of them, and on one this steep, most. */
  standShare: 0.4,
  standMost: 0.09,
  standMostShare: 0.7,
  /** Metres of one spell, in the saddle or out of it. */
  spell: 50,
  /** Nobody stands without pedalling. */
  minCadence: 40,
  /** A descent this steep, this fast (m/s: 40 km/h), is ridden in a tuck… */
  tuckGrade: -0.025,
  tuckSpeed: 11,
  /** …until it slows this far below that, or the road flattens by this much. */
  tuckKeep: 1,
  tuckKeepGrade: 0.01,
  /** Metres ahead the road is read over, so a dip in a climb is not a sit-down. */
  look: 30,
} as const;

/**
 * The road's slope where the rider is, rise over run: over the ten metres
 * behind and the thirty ahead, as a bike computer reads it — what the
 * legs feel now and in a moment, not the model's every bump. What the
 * screen shows as the climb's or the descent's percent.
 */
export function gradeHere(course: Course, distance: number): number {
  const a = courseAt(course, distance - 10);
  const b = courseAt(course, distance + POSTURE.look);
  return (b.ele - a.ele) / (POSTURE.look + 10);
}

/** The posture at a place, at a speed (m/s) and cadence; `was` holds a tuck through a wobble. */
export function postureAt(
  course: Course,
  distance: number,
  speed: number,
  cadence: number,
  was: Posture = "seated",
): Posture {
  const slope = gradeHere(course, distance);
  const tucked = was === "tuck";
  const fast = speed >= POSTURE.tuckSpeed - (tucked ? POSTURE.tuckKeep : 0);
  const down = slope <= POSTURE.tuckGrade + (tucked ? POSTURE.tuckKeepGrade : 0);
  if (down && fast) return "tuck";
  if (cadence >= POSTURE.minCadence && slope >= POSTURE.standFrom) {
    const share = slope >= POSTURE.standMost ? POSTURE.standMostShare : POSTURE.standShare;
    const spell = Math.floor(distance / POSTURE.spell);
    if (hash(spell, Math.round(course.length), 131) < share) return "standing";
  }
  return "seated";
}
