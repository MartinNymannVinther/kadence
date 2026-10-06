import { COURSE, type Course } from "./course";

/**
 * The road under a session ridden alone (docs/adr/0056): when the
 * installation has Rulle's world off, there is no route to choose and no
 * land to fetch, and the engine still needs somewhere to turn watts into
 * a speed. A flat loop, made here in memory: every slope nought, every
 * height nought, so the speed and distance written into the ride are a
 * flat road's, from the same physics as any route. Nobody sees the loop;
 * it has no land round it and no marks on it. Pure.
 */

/** One lap of the flat road, metres. */
export const FLAT_LAP_M = 20_000;

export function flatCourse(name = ""): Course {
  const n = Math.round(FLAT_LAP_M / COURSE.step);
  const step = FLAT_LAP_M / n;
  const radius = FLAT_LAP_M / (2 * Math.PI);
  const angle = (i: number) => (i / n) * 2 * Math.PI;
  return {
    name,
    length: FLAT_LAP_M,
    step,
    x: Array.from({ length: n }, (_, i) => radius * Math.cos(angle(i))),
    y: Array.from({ length: n }, (_, i) => radius * Math.sin(angle(i))),
    ele: new Array<number>(n).fill(0),
    grade: new Array<number>(n).fill(0),
    ascent: 0,
    minEle: 0,
    maxEle: 0,
    outAndBack: false,
    origin: { lat: 0, lon: 0 },
    marks: [],
  };
}
