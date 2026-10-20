import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/**
 * Which map files Kadence looks for (ADR 0023, 0099), as pure logic so it
 * is tested alone. There are two: the detail file (`MAP_FILE`, Denmark and
 * the training camps at full zoom) and the world file (`MAP_WORLD_FILE`,
 * every country at low zoom). Either may be missing; the map draws what is
 * there, and with neither the route is drawn on plain paper.
 */

export type MapName = "detail" | "world";

/** What the page tells the browser: a token per file that is there, which changes when the file does. */
export type MapVersions = { detail: string | null; world: string | null };

/**
 * The file a map was fetched to before ADR 0099. An installation that
 * fetched Denmark alone has it beside the new detail file until the new
 * fetch has run, and goes on showing it in the meantime.
 */
export const LEGACY_DETAIL_FILE = "denmark.pmtiles";

/** The paths to try for a map, in order: the configured one, then (for the detail file) the old Denmark file beside it. */
export function mapCandidates(
  name: MapName,
  files: { MAP_FILE?: string; MAP_WORLD_FILE?: string },
  cwd: string,
): string[] {
  const configured = name === "detail" ? files.MAP_FILE : files.MAP_WORLD_FILE;
  if (!configured) return [];
  const path = isAbsolute(configured) ? configured : resolve(cwd, configured);
  if (name === "world" || basename(path) === LEGACY_DETAIL_FILE) return [path];
  return [path, join(dirname(path), LEGACY_DETAIL_FILE)];
}

/** A short token for a file's size and time, so a new file gets a new address and no stale cached range is read. */
export function mapVersion(size: number, mtimeMs: number): string {
  return `${size.toString(36)}-${Math.floor(mtimeMs).toString(36)}`;
}
