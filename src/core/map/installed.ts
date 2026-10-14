import { env } from "@/core/env";
import { type MapFile, firstMapFile } from "./file";
import { type MapName, type MapVersions, mapCandidates } from "./paths";

/**
 * The map files this installation has (ADR 0023, 0099), as `MAP_FILE` and
 * `MAP_WORLD_FILE` name them; src/core/map/paths.ts says which paths are
 * tried, and a path that holds no file is no map.
 */

/** The file a map is read from now, or null when there is none. */
export async function mapFile(name: MapName): Promise<MapFile | null> {
  return firstMapFile(mapCandidates(name, env, process.cwd()));
}

/** Which maps there are, for the page; null when there is none at all. */
export async function mapVersions(): Promise<MapVersions | null> {
  const [detail, world] = await Promise.all([mapFile("detail"), mapFile("world")]);
  if (!detail && !world) return null;
  return { detail: detail?.version ?? null, world: world?.version ?? null };
}
