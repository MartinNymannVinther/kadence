import { open, stat } from "node:fs/promises";
import { mapVersion } from "./paths";

/**
 * The map files behind routes (ADR 0023, 0099): PMTiles archives of
 * OpenStreetMap data that Kadence serves itself, by byte ranges, so the
 * browser's map reads only the tiles a route needs and no request leaves
 * the installation. `MAP_FILE` names the detail file and `MAP_WORLD_FILE`
 * the world at low zoom (src/core/map/installed.ts reads them). Nothing
 * here reads the environment, so it is tested alone.
 */

export type MapFile = { path: string; size: number; version: string };

/** The first of the paths that holds a file with something in it. */
export async function firstMapFile(paths: readonly string[]): Promise<MapFile | null> {
  for (const path of paths) {
    try {
      const info = await stat(path);
      if (info.isFile() && info.size > 0)
        return { path, size: info.size, version: mapVersion(info.size, info.mtimeMs) };
    } catch {
      // Not there; try the next.
    }
  }
  return null;
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

export async function readRange(path: string, start: number, end: number): Promise<Uint8Array> {
  const handle = await open(path, "r");
  try {
    const length = end - start + 1;
    const buffer = new Uint8Array(length);
    await handle.read(buffer, 0, length, start);
    return buffer;
  } finally {
    await handle.close();
  }
}

/** The answer to one range of a file that is there: 206 with the bytes, or 416. */
export async function rangeResponse(header: string | null, file: MapFile): Promise<Response> {
  const range = parseRange(header, file.size);
  if (!range || range.end - range.start + 1 > MAX_RANGE_BYTES)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${file.size}` },
    });
  const bytes = await readRange(file.path, range.start, range.end);
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    status: 206,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Range": `bytes ${range.start}-${range.end}/${file.size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400",
      ETag: `"${file.version}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
