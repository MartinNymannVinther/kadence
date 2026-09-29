/**
 * A folder from a bike computer or a watch, picked in the browser: which
 * of its files are rides worth sending. A Garmin plugged into a phone or
 * a computer is a drive full of .fit files that are not rides — courses,
 * workouts, settings, totals, records — beside the ones that are, in
 * `Garmin/Activities` (`GARMIN/Activity` on a watch). So when the folder
 * has an activities folder anywhere in it, only that is read; a folder
 * without one is taken as it is. Pure: no DOM, no database.
 */

export type FolderEntry = {
  /** The path from the picked folder, its own name first, with forward slashes. */
  path: string;
  size: number;
  /** Milliseconds since the epoch, as the file system has it. */
  modified: number;
};

/** The endings the upload reads (src/modules/files), lower case. */
const ENDINGS = [".fit", ".tcx", ".gpx", ".gz", ".zip"];
const ACTIVITY_FOLDERS = ["activities", "activity"];
/** The upload's own cap (src/modules/devices/import.ts). */
const MAX_BYTES = 25 * 1024 * 1024;
/** No more than this many files are looked at, newest first. */
export const MAX_FOLDER_FILES = 1000;
/** Folders inside the picked one are walked this deep: a device's own layout, and no deeper. */
export const MAX_FOLDER_DEPTH = 4;

const segments = (path: string) => path.split("/").filter(Boolean);

/**
 * A name that may be a ride's: one of the upload's endings, and no dot
 * first. A dot first is a hidden file: macOS leaves a "._ride.fit" beside
 * every file it has touched on a device's drive, and it is not a ride.
 */
export function hasRideName(name: string): boolean {
  if (!name || name.startsWith(".")) return false;
  const lower = name.toLowerCase();
  return ENDINGS.some((ending) => lower.endsWith(ending));
}

/** Folders worth walking into: not hidden, and not deeper than a device's own layout. */
export function isWalkable(folderName: string, depth: number): boolean {
  return depth < MAX_FOLDER_DEPTH && !folderName.startsWith(".");
}

function isRideFile(entry: FolderEntry): boolean {
  const parts = segments(entry.path);
  if (!hasRideName(parts.at(-1) ?? "")) return false;
  if (entry.size <= 0 || entry.size > MAX_BYTES) return false;
  // The folders between the picked one and the file, judged as a walk
  // would judge them: a browser that hands over every file at once has
  // walked into the wastebasket too.
  return parts.slice(1, -1).every((folder, depth) => isWalkable(folder, depth));
}

const inActivityFolder = (entry: FolderEntry) =>
  segments(entry.path)
    .slice(0, -1)
    .some((segment) => ACTIVITY_FOLDERS.includes(segment.toLowerCase()));

/** The rides in a picked folder, newest first, at most `MAX_FOLDER_FILES`. */
export function pickRideFiles<T extends FolderEntry>(entries: readonly T[]): T[] {
  const rides = entries.filter(isRideFile);
  const fromDevice = rides.filter(inActivityFolder);
  return [...(fromDevice.length > 0 ? fromDevice : rides)]
    .sort((a, b) => b.modified - a.modified || a.path.localeCompare(b.path))
    .slice(0, MAX_FOLDER_FILES);
}
