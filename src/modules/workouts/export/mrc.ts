import type { BikeStructure } from "@/modules/workouts/structure";
import { courseFile, coursePoints } from "./course";

/**
 * A session as an MRC file: the course format (`course.ts`) in percent of
 * FTP, so it needs no FTP of its own — the trainer app applies the rider's.
 */
export function toMrc(
  structure: BikeStructure,
  meta: { fileName: string; description: string },
): string {
  return courseFile({
    units: "MINUTES PERCENT",
    description: meta.description,
    fileName: meta.fileName,
    points: coursePoints(structure),
  });
}
