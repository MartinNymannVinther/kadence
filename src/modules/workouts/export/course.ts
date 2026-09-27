import { flattenSteps, type BikeStructure } from "@/modules/workouts/structure";
import { asciiText } from "./names";
import { powerPct, zoneMidpointPct } from "./targets";

/**
 * ERG and MRC, the course files CompuTrainer's software introduced and
 * trainer apps still read (TrainerRoad, Golden Cheetah, PerfPRO, Wahoo's
 * and Garmin's importers):
 *
 *     [COURSE HEADER]
 *     VERSION = 2
 *     UNITS = ENGLISH
 *     DESCRIPTION = Threshold 3x10
 *     FILE NAME = threshold-3x10.erg
 *     FTP = 250                      (ERG only)
 *     MINUTES WATTS                  (MRC: MINUTES PERCENT)
 *     [END COURSE HEADER]
 *     [COURSE DATA]
 *     0.00	164
 *     10.00	164
 *     10.00	245
 *     …
 *     [END COURSE DATA]
 *
 * The data are minute/value pairs, tab-separated, tracing power over time.
 * Each step is two points — its start and its end at the same value — so a
 * step is flat and the change between steps is vertical. Minutes are
 * written from the step's start in whole seconds, so rounding never
 * accumulates. Lines end in CRLF, as the format's Windows origin expects;
 * readers that split on LF alone read it too. Header text is ASCII.
 *
 * Neither format can say "no target", so a step with no power (RPE or
 * open) is written at the middle of zone 2 (`FREE_STEP_PCT`): an easy
 * endurance load an ERG trainer can hold and the rider can leave by
 * switching ERG off.
 */

export const FREE_STEP_PCT = zoneMidpointPct(2);

/** [seconds, percent of FTP] points, two per step, repeats unrolled. */
export function coursePoints(structure: BikeStructure): [number, number][] {
  const points: [number, number][] = [];
  let at = 0;
  for (const step of flattenSteps(structure)) {
    const pct = powerPct(step.target) ?? FREE_STEP_PCT;
    points.push([at, pct], [at + step.seconds, pct]);
    at += step.seconds;
  }
  return points;
}

export interface CourseFile {
  units: "MINUTES WATTS" | "MINUTES PERCENT";
  description: string;
  fileName: string;
  ftp?: number;
  /** [seconds, value] with the value already in the file's unit. */
  points: [number, number][];
}

export function courseFile(file: CourseFile): string {
  const lines = [
    "[COURSE HEADER]",
    "VERSION = 2",
    "UNITS = ENGLISH",
    `DESCRIPTION = ${asciiText(file.description)}`,
    `FILE NAME = ${asciiText(file.fileName)}`,
    ...(file.ftp !== undefined ? [`FTP = ${Math.round(file.ftp)}`] : []),
    file.units,
    "[END COURSE HEADER]",
    "[COURSE DATA]",
    ...file.points.map(([seconds, value]) => `${(seconds / 60).toFixed(2)}\t${number(value)}`),
    "[END COURSE DATA]",
    "",
  ];
  return lines.join("\r\n");
}

/** At most one decimal, none when it is whole: 245, 27.5. */
function number(value: number): string {
  return String(Math.round(value * 10) / 10);
}
