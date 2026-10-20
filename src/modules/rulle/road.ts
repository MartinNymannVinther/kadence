/**
 * The road under the trainer's wheel (ADR 0106). When Rulle is not holding
 * the watts — the rider chose to ride the route, turned ERG off, or the
 * block is a free one — the trainer is given the route's slope where the
 * rider is, so that a climb is felt in the pedals and the rider shifts
 * gears to reach the block's watts, as on the road.
 *
 * - The slope is sent at half strength, as the riding apps do by default
 *   (Zwift's "trainer difficulty" at 50 %): a 10 % climb is 5 % on the
 *   trainer. Indoors a full climb asks for gears few trainers' cassettes
 *   have, and a full descent is no resistance at all.
 * - It is rounded to steps of half a per cent, so the trainer is written
 *   to when the road changes and not every second.
 * - FTMS carries no rider weight: the trainer reckons with its own, set in
 *   its maker's app or its default. Kadence keeps no weight (ADR 0013,
 *   0031), and Rulle's screen rides at its standard mass (`physics.ts`).
 *
 * Pure: numbers in, a grade out.
 */
export const ROAD = {
  /** The share of the route's slope the trainer is given. */
  difficulty: 0.5,
  /** The grade is sent in these steps, as rise over run (0.005 is 0.5 %). */
  step: 0.005,
  /** The steepest the trainer is asked for either way, rise over run. */
  most: 0.2,
} as const;

/** The grade to give the trainer where the route is `grade` steep, rise over run. */
export function roadGrade(grade: number, difficulty: number = ROAD.difficulty): number {
  if (!Number.isFinite(grade)) return 0;
  const scaled = Math.max(-ROAD.most, Math.min(ROAD.most, grade * difficulty));
  const stepped = Math.round(scaled / ROAD.step) * ROAD.step;
  // Rounded once more so 0.03 is 0.03, not 0.030000000000000002; and no negative zero.
  return Math.round(stepped * 10000) / 10000 || 0;
}
