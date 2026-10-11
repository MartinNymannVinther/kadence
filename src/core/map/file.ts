import { open, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { env } from "@/core/env";

/**
 * The map file behind routes (ADR 0023): a PMTiles archive of
 * OpenStreetMap data that Kadence serves itself, by byte ranges, so the
 * browser's map reads only the tiles a route needs and no request leaves
 * the installation. `MAP_FILE` names it; without it, or with a path that
 * holds no file, there is no map and routes are drawn alone.
 */

// The file lives outside the build (a volume in production), so every
// path here is marked turbopackIgnore: without it the build cannot tell
// which file is meant and traces the whole project into the server.
export function mapPath(): string | null {
  const file = env.MAP_FILE;
  if (!file) return null;
  return isAbsolute(file) ? file : resolve(/* turbopackIgnore: true */ process.cwd(), file);
}

/** The file's size, or null when there is no map. */
export async function mapSize(): Promise<number | null> {
  const path = mapPath();
  if (!path) return null;
  try {
    const info = await stat(/* turbopackIgnore: true */ path);
    return info.isFile() && info.size > 0 ? info.size : null;
  } catch {
    return null;
  }
}

export async function mapAvailable(): Promise<boolean> {
  return (await mapSize()) !== null;
}

/** A single byte range, "bytes=a-b" or "bytes=a-", checked against the size. */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const match = header ? /^bytes=(\d{1,15})-(\d{0,15})$/.exec(header.trim()) : null;
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

/** Most a single request may read: a PMTiles client asks for a tile or a directory at a time. */
export const MAX_RANGE_BYTES = 4 * 1024 * 1024;

export async function readRange(start: number, end: number): Promise<Uint8Array> {
  const handle = await open(/* turbopackIgnore: true */ mapPath()!, "r");
  try {
    const length = end - start + 1;
    const buffer = new Uint8Array(length);
    await handle.read(buffer, 0, length, start);
    return buffer;
  } finally {
    await handle.close();
  }
}
