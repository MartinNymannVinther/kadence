import type { BikeStructure } from "@/modules/workouts/structure";
import { toErg } from "./erg";
import { toFitWorkout } from "./fit-workout";
import { toMrc } from "./mrc";
import { datedFileBase, dayLabel, slugify } from "./names";
import { toZwo } from "./zwo";

/**
 * A bike session as a file a rider can load on a trainer or a head unit:
 * .zwo for Zwift and most trainer apps, .erg and .mrc for the older ones,
 * FIT for Garmin and Wahoo devices. Pure: the caller reads the session and
 * the rider and sends the file; nothing here touches the database.
 *
 * ERG is in watts and needs the rider's FTP; without one the export is MRC,
 * the same file in percent, and `format` says which was written.
 *
 * With the session's day, the file is named by it ("2026-09-29-tempo.fit")
 * and a FIT workout's name begins with it ("29.09 Tempo"), so a week of
 * files neither overwrites itself in a folder nor on a Garmin, which tells
 * workouts apart by their first 15 characters (ADR 0031).
 */

export const WORKOUT_FORMATS = ["zwo", "erg", "mrc", "fit"] as const;
export type WorkoutFormat = (typeof WORKOUT_FORMATS)[number];

export interface ExportRider {
  ftp?: number | null;
  thresholdHr?: number | null;
}

export interface ExportOptions {
  description?: string;
  /** The FIT file's creation time; now unless given. */
  createdAt?: Date;
  /** The session's day, YYYY-MM-DD, and which of the rider's bike sessions that day it is (1 for the first). */
  onDate?: string;
  dayIndex?: number;
  /** This version of the session, for the FIT file's serial number (`versionSerial`). */
  serial?: number;
}

export interface WorkoutFile {
  /** The format written: "mrc" when "erg" was asked for without an FTP. */
  format: WorkoutFormat;
  fileName: string;
  mime: string;
  body: string | Uint8Array;
}

const MIME: Record<WorkoutFormat, string> = {
  zwo: "application/xml; charset=utf-8",
  erg: "text/plain; charset=utf-8",
  mrc: "text/plain; charset=utf-8",
  fit: "application/vnd.ant.fit",
};

/** An FTP that can turn percent into watts: a positive, finite number. */
function usableFtp(ftp: number | null | undefined): number | null {
  return typeof ftp === "number" && Number.isFinite(ftp) && ftp > 0 ? ftp : null;
}

export function exportWorkout(
  format: WorkoutFormat,
  structure: BikeStructure,
  rider: ExportRider,
  name: string,
  options: ExportOptions = {},
): WorkoutFile {
  const ftp = usableFtp(rider.ftp);
  const written: WorkoutFormat = format === "erg" && ftp === null ? "mrc" : format;
  const base = options.onDate
    ? datedFileBase(options.onDate, options.dayIndex ?? 1, name)
    : slugify(name);
  const fileName = `${base}.${written}`;
  const description = options.description ?? name;

  let body: string | Uint8Array;
  switch (written) {
    case "zwo":
      body = toZwo(structure, name, options.description ?? "");
      break;
    case "erg":
      body = toErg(structure, ftp ?? 0, { fileName, description });
      break;
    case "mrc":
      body = toMrc(structure, { fileName, description });
      break;
    case "fit":
      body = toFitWorkout(
        structure,
        rider,
        options.onDate ? `${dayLabel(options.onDate, options.dayIndex ?? 1)} ${name}` : name,
        options.createdAt,
        { serial: options.serial, description: options.description },
      );
      break;
  }
  return { format: written, fileName, mime: MIME[written], body };
}

export { toErg } from "./erg";
export { toFitWorkout, versionSerial } from "./fit-workout";
export { toMrc } from "./mrc";
export { asciiText, datedFileBase, dayLabel, slugify } from "./names";
export { cadenceOf, powerBand, powerPct, zoneMidpointPct, zoneOfHrPct } from "./targets";
export { toZwo, xml } from "./zwo";
export { FREE_STEP_PCT } from "./course";
