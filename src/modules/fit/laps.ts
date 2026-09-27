import { ascentFromAltitude } from "./ascent";
import { metresBetween } from "./along";
import { pedalling, rounded, stats } from "./stats";
import type { Timeline } from "./timeline";
import type { FitLap } from "./types";

/**
 * The laps the rider pressed (or the device took by itself, every 5 km or
 * so), each measured on the ride's own one-second timeline so a lap's
 * numbers add up the same way the ride's do:
 *
 * - a lap runs from its `startTime` to its own timestamp, or to its start
 *   plus its elapsed time, and never past the next lap's start;
 * - its distance is the device's own when it wrote a plausible one, else
 *   the metres along the timeline;
 * - power averages over seconds with a value, zeros included; cadence
 *   leaves zeros out; speed is distance over moving time.
 *
 * A ride of one lap has nothing to split, and gives none. Laps that fall
 * outside the timeline or last no time are dropped, and a file cannot
 * make Kadence keep more than `MAX_LAPS`.
 */

export const MAX_LAPS = 200;
const MAX_LAP_DISTANCE_M = 2_000_000;

export interface LapSummary {
  /** Seconds since the ride's start. */
  startS: number;
  elapsedSeconds: number;
  movingSeconds: number;
  distanceM?: number;
  /** m/s over the moving seconds. */
  avgSpeed?: number;
  avgPower?: number;
  maxPower?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  ascentM?: number;
}

type Span = { start: number; end: number; lap: FitLap };

function spans(laps: readonly FitLap[], line: Timeline): Span[] {
  const length = line.moving.length;
  const found: Span[] = [];
  for (const lap of laps) {
    if (lap.startTime === undefined) continue;
    const start = Math.round((lap.startTime - line.startMs) / 1000);
    const endMs =
      lap.t ??
      (lap.elapsedSeconds !== undefined ? lap.startTime + lap.elapsedSeconds * 1000 : undefined);
    if (endMs === undefined) continue;
    const end = Math.min(length, Math.round((endMs - line.startMs) / 1000));
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const from = Math.max(0, start);
    if (end > from) found.push({ start: from, end, lap });
  }
  found.sort((a, b) => a.start - b.start);
  for (let i = 0; i < found.length - 1; i++) {
    const next = found[i + 1]!;
    if (found[i]!.end > next.start) found[i]!.end = next.start;
  }
  return found.filter((s) => s.end > s.start).slice(0, MAX_LAPS);
}

export function summarizeLaps(
  laps: readonly FitLap[],
  line: Timeline,
  along: readonly number[],
): LapSummary[] {
  const found = spans(laps, line);
  if (found.length < 2) return [];
  const hasPower = line.power.some((p) => p !== null);

  return found.map(({ start, end, lap }) => {
    const slice = <T>(values: readonly T[]) => values.slice(start, end);
    const moving = slice(line.moving).filter(Boolean).length;
    const own = lap.distanceM;
    const distance =
      own !== undefined && own > 0 && own <= MAX_LAP_DISTANCE_M
        ? own
        : metresBetween(along, start, end);
    const power = stats(slice(line.power));
    const hr = stats(slice(line.hr));
    const cadence = stats(pedalling(slice(line.cadence)));
    return {
      startS: start,
      elapsedSeconds: end - start,
      movingSeconds: moving,
      distanceM: distance > 0 ? Math.round(distance) : undefined,
      avgSpeed: distance > 0 && moving > 0 ? rounded(distance / moving, 2) : undefined,
      avgPower: hasPower ? rounded(power.avg, 0) : undefined,
      maxPower: hasPower ? power.max : undefined,
      avgHr: rounded(hr.avg, 0),
      maxHr: hr.max,
      avgCadence: rounded(cadence.avg, 0),
      ascentM: rounded(ascentFromAltitude(slice(line.alt)), 0),
    };
  });
}
