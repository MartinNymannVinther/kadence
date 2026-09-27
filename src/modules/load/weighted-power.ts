/**
 * Weighted power and best efforts from a ride's 1 Hz power stream.
 *
 * Weighted power answers "what steady wattage would have cost the same":
 * a ride of surges costs more than its average says, because the body's
 * strain grows much faster than linearly with power. The algorithm is the
 * widely published one — smooth the stream with a 30-second rolling mean,
 * raise each smoothed second to the fourth power, average those, and take
 * the fourth root — under Kadence's own name.
 *
 * A null sample is a second the head unit recorded without power; on a
 * ride that is almost always coasting, so it counts as 0 W, as does a
 * negative or non-finite reading from a confused sensor.
 *
 * Pure: imports nothing from the database.
 */

/** The rolling window the stream is smoothed over, in seconds. */
export const WEIGHTED_POWER_WINDOW = 30;

/** The durations Kadence keeps a best effort for: 5 s, 1, 5, 20 and 60 min. */
export const BEST_POWER_SECONDS = [5, 60, 300, 1200, 3600] as const;
export type BestPowerSeconds = (typeof BEST_POWER_SECONDS)[number];

function clean(power1hz: readonly (number | null)[]): number[] {
  return power1hz.map((w) => (w !== null && Number.isFinite(w) && w > 0 ? w : 0));
}

/** Running sums, so every window's mean costs one subtraction. */
function prefixSums(watts: readonly number[]): number[] {
  const sums = [0];
  for (const w of watts) sums.push(sums[sums.length - 1]! + w);
  return sums;
}

/**
 * Weighted power in watts, unrounded; null for an empty stream. A ride
 * shorter than the 30-second window has nothing to smooth, so its
 * weighted power is its average.
 */
export function weightedPower(power1hz: readonly (number | null)[]): number | null {
  const watts = clean(power1hz);
  if (watts.length === 0) return null;
  const sums = prefixSums(watts);
  if (watts.length < WEIGHTED_POWER_WINDOW) return sums[watts.length]! / watts.length;

  let fourthPowers = 0;
  let count = 0;
  for (let end = WEIGHTED_POWER_WINDOW; end <= watts.length; end++) {
    const mean = (sums[end]! - sums[end - WEIGHTED_POWER_WINDOW]!) / WEIGHTED_POWER_WINDOW;
    fourthPowers += mean ** 4;
    count++;
  }
  return (fourthPowers / count) ** 0.25;
}

/**
 * The highest average power held over any `seconds` in a row, in watts,
 * unrounded; null when the ride is shorter than the duration.
 */
export function bestMeanPower(
  power1hz: readonly (number | null)[],
  seconds: number,
): number | null {
  const window = Math.floor(seconds);
  if (window < 1 || power1hz.length < window) return null;
  const sums = prefixSums(clean(power1hz));
  let best = 0;
  for (let end = window; end < sums.length; end++) {
    best = Math.max(best, sums[end]! - sums[end - window]!);
  }
  return best / window;
}

/**
 * The best efforts an activity keeps (`best_powers`), in whole watts:
 * one entry per duration in `BEST_POWER_SECONDS` the ride was long enough
 * to hold.
 */
export function bestMeanPowers(
  power1hz: readonly (number | null)[],
): Partial<Record<BestPowerSeconds, number>> {
  const out: Partial<Record<BestPowerSeconds, number>> = {};
  for (const seconds of BEST_POWER_SECONDS) {
    const best = bestMeanPower(power1hz, seconds);
    if (best !== null) out[seconds] = Math.round(best);
  }
  return out;
}
