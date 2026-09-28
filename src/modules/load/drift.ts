/**
 * Heart-rate drift: how much more pulse each watt cost in the second half
 * of a ride than in the first. On a steady ride the ratio of watt to
 * pulse holds while the rider is fresh; heat, dehydration and a base that
 * is not there yet make the pulse creep up at the same watt.
 *
 * The seconds with both a pulse and a power reading (zeros included:
 * coasting is part of the ride) are split into two halves of equal count;
 * drift is the fall in watt per beat from the first half to the second,
 * in per cent of the first. Positive means the pulse drifted up.
 *
 * Only a ride with at least `DRIFT_MIN_SECONDS` of both, and power in both
 * halves, has a drift: a short or sprint-only ride says nothing about it.
 * Nor does an uneven one: intervals in the first half and easy riding in
 * the second would read as a huge "drift" that is only the plan. So the
 * two halves must be ridden at about the same power (`MAX_HALF_RATIO`),
 * or the number is not given. It is shown for what it is; Kadence draws
 * no line for "good".
 *
 * Pure: imports nothing from the database.
 */

export const DRIFT_MIN_SECONDS = 20 * 60;
/** The halves' average power may differ by this much and still be one steady ride. */
export const MAX_HALF_RATIO = 1.15;

export function heartRateDrift(
  power1hz: readonly (number | null)[],
  hr1hz: readonly (number | null)[],
): number | null {
  const pairs: Array<[number, number]> = [];
  const length = Math.min(power1hz.length, hr1hz.length);
  for (let s = 0; s < length; s++) {
    const w = power1hz[s];
    const bpm = hr1hz[s];
    if (w === null || w === undefined || bpm === null || bpm === undefined) continue;
    if (!Number.isFinite(w) || !Number.isFinite(bpm) || bpm <= 0) continue;
    pairs.push([Math.max(0, w), bpm]);
  }
  if (pairs.length < DRIFT_MIN_SECONDS) return null;
  const half = Math.floor(pairs.length / 2);
  const ratio = (from: number, to: number) => {
    let watts = 0;
    let beats = 0;
    for (let i = from; i < to; i++) {
      watts += pairs[i]![0];
      beats += pairs[i]![1];
    }
    return watts > 0 ? watts / beats : null;
  };
  const first = ratio(0, half);
  const second = ratio(half, pairs.length);
  if (first === null || second === null) return null;
  const mean = (from: number, to: number) =>
    pairs.slice(from, to).reduce((sum, [w]) => sum + w, 0) / (to - from);
  const [a, b] = [mean(0, half), mean(half, pairs.length)];
  if (Math.max(a, b) / Math.max(1, Math.min(a, b)) > MAX_HALF_RATIO) return null;
  return Math.round(((first - second) / first) * 1000) / 10;
}
