/**
 * Metres climbed, from an altitude trace, for files whose session does not
 * say. Barometric and GPS altitude both wander by a metre or so while
 * standing still; summing every uptick would count that wander as climbing.
 *
 * So the trace is first smoothed (a trailing average of
 * `ASCENT_SMOOTHING_SAMPLES` values), then read with hysteresis: a climb
 * starts once the smoothed altitude is `ASCENT_HYSTERESIS_M` above the
 * lowest point before it, and counts from that low point; while climbing,
 * every new high adds to it; the climb ends once the altitude falls that
 * far below its high. Wander smaller than the hysteresis never counts, and a
 * real hill counts in full, from its foot to its top.
 *
 * Nulls (pauses, missing altitude) are skipped, not treated as sea level.
 */

export const ASCENT_SMOOTHING_SAMPLES = 5;
export const ASCENT_HYSTERESIS_M = 2;

export function ascentFromAltitude(altitude: readonly (number | null)[]): number | undefined {
  const window: number[] = [];
  let windowSum = 0;
  let count = 0;
  let climbing = false;
  let low = 0;
  let high = 0;
  let ascent = 0;

  for (const value of altitude) {
    if (value === null) continue;
    window.push(value);
    windowSum += value;
    if (window.length > ASCENT_SMOOTHING_SAMPLES) windowSum -= window.shift() ?? 0;
    const smooth = windowSum / window.length;

    if (count++ === 0) {
      low = smooth;
      high = smooth;
    } else if (climbing) {
      if (smooth > high) {
        ascent += smooth - high;
        high = smooth;
      } else if (smooth <= high - ASCENT_HYSTERESIS_M) {
        climbing = false;
        low = smooth;
      }
    } else if (smooth < low) {
      low = smooth;
    } else if (smooth >= low + ASCENT_HYSTERESIS_M) {
      climbing = true;
      ascent += smooth - low;
      high = smooth;
    }
  }
  return count >= 2 ? ascent : undefined;
}
