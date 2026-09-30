import { RouteError, type RouteFile } from "./gpx-route";

/**
 * A route made rideable: the file's points laid on a flat plane in
 * metres, turned into a loop, and resampled every few metres so that any
 * distance along it has a place, a height and a slope.
 *
 * - **A loop.** A session lasts as long as it lasts, not as long as the
 *   road, so the rider goes round. A file whose start and end meet is a
 *   loop already; one that ends somewhere else is ridden out and back the
 *   same way, which is what a rider on that road would do.
 * - **Heights.** A height model samples the ground beside the road as
 *   well as the road, and a planner's heights jump where the model's
 *   cells do. They are averaged over `eleSmoothM` either side, and a slope
 *   is taken to be no steeper than `maxGrade`: what is left is the hill,
 *   not the model's noise. The heights are then rebuilt from the slopes,
 *   so the slope the physics rides and the height the landscape draws are
 *   the same road, and the last metre of a lap meets the first.
 * - **The line.** Corners in the file are rounded over `lineSmoothM`, so
 *   a camera following the road turns rather than jerks.
 *
 * The plane is a local one (equirectangular around the route's middle):
 * a few metres out over tens of kilometres, which nobody riding a trainer
 * will notice. Pure: no browser, no database.
 */

export const COURSE = {
  /** Metres between samples; the loop is divided evenly, so it is about this. */
  step: 10,
  /** Start and end further apart than this make a route out and back. */
  closeGapM: 150,
  eleSmoothM: 70,
  lineSmoothM: 20,
  maxGrade: 0.15,
  minLengthM: 500,
  maxLengthM: 400_000,
} as const;

export type Course = {
  name: string;
  /** One lap, metres. */
  length: number;
  /** Metres between samples: `length / x.length`. */
  step: number;
  /** The plane, metres from the route's middle: x east, y north. */
  x: number[];
  y: number[];
  /** Metres above sea level, smoothed. */
  ele: number[];
  /** The slope from each sample to the next, rise over run. */
  grade: number[];
  ascent: number;
  minEle: number;
  maxEle: number;
  /** The file ended away from its start, and the course rides back the way it came. */
  outAndBack: boolean;
  /** The plane's middle, where x and y are 0: what lays the land around the route on it (ADR 0035). */
  origin: { lat: number; lon: number };
};

export type CoursePoint = {
  x: number;
  y: number;
  ele: number;
  grade: number;
  /** Direction of travel, radians counter-clockwise from east. */
  heading: number;
  /** Laps completed before this point. */
  lap: number;
  /** Metres into the current lap. */
  along: number;
};

const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;

type Flat = { x: number; y: number; ele: number };

/** A place on the plane of a course whose middle is `origin`: metres east (x) and north (y). */
export function toPlane(origin: { lat: number; lon: number }, lat: number, lon: number) {
  const kx = EARTH_M * Math.cos(origin.lat * RAD) * RAD;
  return { x: (lon - origin.lon) * kx, y: (lat - origin.lat) * EARTH_M * RAD };
}

export function buildCourse(file: RouteFile): Course {
  const origin = {
    lat: file.points.reduce((s, p) => s + p.lat, 0) / file.points.length,
    lon: file.points.reduce((s, p) => s + p.lon, 0) / file.points.length,
  };
  const flat = dropRepeats(
    file.points.map((p) => ({ ...toPlane(origin, p.lat, p.lon), ele: p.ele })),
  );
  if (flat.length < 2) throw new RouteError("too_short", "The route has no length.");
  const first = flat[0]!;
  const last = flat.at(-1)!;
  const gap = Math.hypot(last.x - first.x, last.y - first.y);
  const outAndBack = gap > COURSE.closeGapM;
  const loop = outAndBack ? [...flat, ...flat.slice(0, -1).reverse()] : flat;

  // Distances along the loop, closing segment included.
  const along = [0];
  for (let i = 1; i <= loop.length; i++) {
    const a = loop[i - 1]!;
    const b = loop[i % loop.length]!;
    along.push(along[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const length = along.at(-1)!;
  if (length < COURSE.minLengthM) throw new RouteError("too_short", "The route is too short.");
  if (length > COURSE.maxLengthM) throw new RouteError("too_large", "The route is too long.");

  const n = Math.max(16, Math.round(length / COURSE.step));
  const step = length / n;
  const raw = resample(loop, along, n, step);
  const x = circularMean(
    raw.map((p) => p.x),
    Math.round(COURSE.lineSmoothM / step),
  );
  const y = circularMean(
    raw.map((p) => p.y),
    Math.round(COURSE.lineSmoothM / step),
  );
  const smooth = circularMean(
    raw.map((p) => p.ele),
    Math.round(COURSE.eleSmoothM / step),
  );
  const { ele, grade } = slopes(smooth, step);

  let ascent = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;
  for (let i = 0; i < n; i++) {
    ascent += Math.max(0, ele[(i + 1) % n]! - ele[i]!);
    minEle = Math.min(minEle, ele[i]!);
    maxEle = Math.max(maxEle, ele[i]!);
  }
  return {
    name: file.name,
    length,
    step,
    x,
    y,
    ele,
    grade,
    ascent,
    minEle,
    maxEle,
    outAndBack,
    origin,
  };
}

/** Where the rider is after `metres`, going round as many laps as it takes. */
export function courseAt(course: Course, metres: number): CoursePoint {
  const n = course.x.length;
  const lap = Math.floor(metres / course.length);
  const along = metres - lap * course.length;
  const f = along / course.step;
  const i = Math.min(n - 1, Math.floor(f));
  const j = (i + 1) % n;
  const t = f - i;
  const lerp = (values: number[]) => values[i]! + (values[j]! - values[i]!) * t;
  return {
    x: lerp(course.x),
    y: lerp(course.y),
    ele: lerp(course.ele),
    grade: course.grade[i]!,
    heading: Math.atan2(course.y[j]! - course.y[i]!, course.x[j]! - course.x[i]!),
    lap,
    along,
  };
}

/** Points closer than half a metre to the one before say nothing new. */
function dropRepeats(points: Flat[]): Flat[] {
  const out: Flat[] = [];
  for (const p of points) {
    const prev = out.at(-1);
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= 0.5) out.push(p);
  }
  return out;
}

/** `n` points evenly `step` apart along the closed polyline. */
function resample(loop: Flat[], along: number[], n: number, step: number): Flat[] {
  const out: Flat[] = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const s = k * step;
    while (seg < loop.length - 1 && along[seg + 1]! < s) seg++;
    const a = loop[seg]!;
    const b = loop[(seg + 1) % loop.length]!;
    const span = along[seg + 1]! - along[seg]!;
    const t = span > 0 ? Math.min(1, Math.max(0, (s - along[seg]!) / span)) : 0;
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      ele: a.ele + (b.ele - a.ele) * t,
    });
  }
  return out;
}

/** The mean over `half` samples either side, round the loop. */
function circularMean(values: number[], half: number): number[] {
  const n = values.length;
  if (half <= 0) return [...values];
  return values.map((_, i) => {
    let sum = 0;
    for (let k = -half; k <= half; k++) sum += values[(((i + k) % n) + n) % n]!;
    return sum / (2 * half + 1);
  });
}

/**
 * Slopes no steeper than `maxGrade`, and heights rebuilt from them: the
 * little a capped slope loses over a lap is spread evenly over it, so the
 * loop closes and every slope is the step between its two heights.
 */
function slopes(smooth: number[], step: number): { ele: number[]; grade: number[] } {
  const n = smooth.length;
  const capped = smooth.map((h, i) => {
    const rise = (smooth[(i + 1) % n]! - h) / step;
    return Math.max(-COURSE.maxGrade, Math.min(COURSE.maxGrade, rise));
  });
  const drift = capped.reduce((s, g) => s + g, 0) / n;
  const grade = capped.map((g) => g - drift);
  const ele = [smooth[0]!];
  for (let i = 1; i < n; i++) ele.push(ele[i - 1]! + grade[i - 1]! * step);
  return { ele, grade };
}
