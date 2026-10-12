/**
 * Critical power from a rider's best efforts: the two-parameter model of
 * Monod & Scherrer (1965), power = CP + W′ / t, fitted by least squares
 * on power against 1/t — the form Karsten et al. (2021) found to fit
 * best, and the one Leo et al. (2020) used on U23 riders' own training
 * and racing files. CP is the power the rider could hold for a long
 * time, W′ the work they can do above it before they must slow down.
 *
 * The model holds between about 2 and 20 minutes (Karsten et al. 2021),
 * so the points are the best 3, 5, 10, 15 and 20 minutes. A fit is used
 * only when it is good and W′ is in the range seen in trained riders;
 * the numbers are in docs/research/taerskler-fra-turene.md.
 *
 * Pure: imports nothing from the database.
 */

/** The durations the model is fitted through, in seconds. */
export const CP_SECONDS = [180, 300, 600, 900, 1200] as const;
/** The least fit Kadence accepts, as R² of power against 1/t. Kadence's judgement. */
export const CP_MIN_R2 = 0.95;
/** W′ outside this range, in joules, says the efforts were not all-out. Kadence's judgement. */
export const W_PRIME_RANGE = { low: 4_000, high: 40_000 } as const;

export type PowerPoint = { seconds: number; watts: number };
export type CriticalPowerFit = { cp: number; wPrime: number; r2: number };

/** Least squares of power on 1/t; null with fewer than three distinct durations. */
export function fitCriticalPower(points: readonly PowerPoint[]): CriticalPowerFit | null {
  const usable = points.filter((p) => p.seconds > 0 && p.watts > 0);
  if (new Set(usable.map((p) => p.seconds)).size < 3) return null;
  const xs = usable.map((p) => 1 / p.seconds);
  const ys = usable.map((p) => p.watts);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  if (sxx === 0) return null;
  const wPrime = sxy / sxx;
  const cp = my - wPrime * mx;
  // All points on one power: a flat line explains nothing, and says nothing either.
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { cp, wPrime, r2 };
}

/**
 * Whether a fit can be believed: good enough, W′ in range, CP above zero
 * and below the best 20 minutes it came from.
 */
export function plausibleFit(fit: CriticalPowerFit, best20: number): boolean {
  return (
    fit.r2 >= CP_MIN_R2 &&
    fit.wPrime >= W_PRIME_RANGE.low &&
    fit.wPrime <= W_PRIME_RANGE.high &&
    fit.cp > 0 &&
    fit.cp < best20
  );
}
