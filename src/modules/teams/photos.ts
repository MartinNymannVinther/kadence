import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { errorName, log } from "@/core/log";
import { readLimited } from "@/modules/devices/http";
import { getJson, SourceError, type FetchLike } from "./http";
import { REGISTRY } from "./registry";
import { teamsDir } from "./snapshot";
import type { TeamPhoto } from "./types";

/**
 * Photographs of teams from Wikimedia Commons (ADR 0072), named file by
 * file in the registry by a person who looked at the photo and its
 * licence. On refresh each is asked for once through Commons' API — the
 * 640-pixel rendering, the photographer and the licence — and the
 * rendering is copied to `TEAMS_DIR/photos/<id>.jpg`, from where Kadence
 * serves it itself (src/app/api/teams/photo). Nothing is loaded from
 * Commons by a reader's browser, and a photo whose licence is not one
 * that allows showing it with credit is left where it is.
 */

const API = "https://commons.wikimedia.org/w/api.php";
const WIDTH = 640;
const MAX_BYTES = 2 * 1024 * 1024;
/** The licences Commons uses that allow a copy with credit; anything else is refused. */
const ALLOWED = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+)$/i;
/** A photo is asked for again after this long, in case the file was replaced. */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === "object" && v !== null ? (v as Rec) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Commons writes the artist as HTML; the credit line wants the words. */
export function plainArtist(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** What Commons says about a file: the rendering's address, the photographer, the licence. Pure. */
export function readImageInfo(data: unknown): {
  thumb: string;
  artist: string;
  licence: string;
  pageUrl: string;
  width: number;
  height: number;
} | null {
  const pages = rec(rec(rec(data).query).pages);
  const page = rec(Object.values(pages)[0]);
  const info = rec((Array.isArray(page.imageinfo) ? page.imageinfo[0] : null) as unknown);
  const meta = rec(info.extmetadata);
  const thumb = str(info.thumburl);
  const licence = str(rec(meta.LicenseShortName).value);
  if (!thumb || !ALLOWED.test(licence)) return null;
  return {
    thumb,
    artist: plainArtist(str(rec(meta.Artist).value)),
    licence,
    pageUrl: str(info.descriptionurl),
    width: typeof info.thumbwidth === "number" ? info.thumbwidth : WIDTH,
    height: typeof info.thumbheight === "number" ? info.thumbheight : 0,
  };
}

export function photoPath(id: string, dir = teamsDir()): string {
  return join(dir, "photos", `${id}.jpg`);
}

async function copyPhoto(
  fetchFn: FetchLike,
  id: string,
  file: string,
  now: Date,
): Promise<TeamPhoto> {
  const q = new URLSearchParams({
    action: "query",
    titles: file,
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: String(WIDTH),
    format: "json",
  });
  const info = readImageInfo(await getJson(fetchFn, `${API}?${q.toString()}`));
  if (!info) throw new SourceError("invalid_response");
  const response = await fetchFn(info.thumb, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "image/jpeg,image/png" },
  });
  if (!response.ok) throw new SourceError("status", response.status);
  const bytes = await readLimited(response.body, MAX_BYTES, response.headers.get("content-length"));
  const dir = join(teamsDir(), "photos");
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `${id}.${process.pid}.tmp`);
  await writeFile(tmp, bytes);
  await rename(tmp, photoPath(id));
  return {
    file,
    artist: info.artist,
    licence: info.licence,
    pageUrl: info.pageUrl,
    fetchedAt: now.toISOString(),
    width: info.width,
    height: info.height,
  };
}

/** Every registry photo not yet copied, or copied long ago; the rest are kept as they are. */
export async function refreshPhotos(
  fetchFn: FetchLike,
  previous: Record<string, TeamPhoto>,
  now: Date,
): Promise<Record<string, TeamPhoto>> {
  const next: Record<string, TeamPhoto> = {};
  for (const team of REGISTRY) {
    if (!team.photo) continue;
    const had = previous[team.id];
    const fresh =
      had && had.file === team.photo && now.getTime() - Date.parse(had.fetchedAt) < KEEP_MS;
    if (fresh && (await exists(photoPath(team.id)))) {
      next[team.id] = had;
      continue;
    }
    try {
      next[team.id] = await copyPhoto(fetchFn, team.id, team.photo, now);
    } catch (error) {
      await log.warn("teams: photo not copied", { teamId: team.id, error: errorName(error) });
      if (had) next[team.id] = had;
    }
  }
  return next;
}

async function exists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** The copied rendering, for the route; null when there is none. */
export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(id)) return null;
  try {
    return await readFile(photoPath(id));
  } catch {
    return null;
  }
}
