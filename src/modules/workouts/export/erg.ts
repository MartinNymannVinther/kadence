import type { BikeStructure } from "@/modules/workouts/structure";
import { courseFile, coursePoints } from "./course";

/**
 * A session as an ERG file: the course format (`course.ts`) in watts,
 * worked out from the rider's FTP, which the header names. Without an FTP
 * there are no watts to write; `exportWorkout` then writes MRC instead,
 * which carries percent and lets the trainer app apply its own FTP.
 */
export function toErg(
  structure: BikeStructure,
  ftp: number,
  meta: { fileName: string; description: string },
): string {
  return courseFile({
    units: "MINUTES WATTS",
    description: meta.description,
    fileName: meta.fileName,
    ftp,
    points: coursePoints(structure).map(([seconds, pct]) => [
      seconds,
      Math.round((pct / 100) * ftp),
    ]),
  });
}
