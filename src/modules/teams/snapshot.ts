import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { env } from "@/core/env";
import { EMPTY_SNAPSHOT, type TeamsSnapshot } from "./types";

/**
 * The teams page's snapshot on disk (ADR 0072): what the sources last
 * answered, as one JSON file in `TEAMS_DIR` (`./data/teams` unless set;
 * a volume in production, beside the map). Not a table: the sources are
 * public and the same for every team in the installation, so a row with
 * an `org_id` would be a lie and a table without one would break the
 * rule every table keeps. Written whole and renamed into place, so a
 * reader never sees half a file.
 */

const FILE = "snapshot.json";

export function teamsDir(): string {
  const dir = env.TEAMS_DIR ?? "./data/teams";
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

export async function readSnapshot(dir = teamsDir()): Promise<TeamsSnapshot> {
  try {
    const parsed = JSON.parse(await readFile(join(dir, FILE), "utf8")) as unknown;
    return isSnapshot(parsed) ? parsed : EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export async function writeSnapshot(snapshot: TeamsSnapshot, dir = teamsDir()): Promise<void> {
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `${FILE}.${process.pid}.tmp`);
  await writeFile(tmp, JSON.stringify(snapshot), "utf8");
  await rename(tmp, join(dir, FILE));
}

function isSnapshot(value: unknown): value is TeamsSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.version === 1 && typeof v.uci === "object" && typeof v.dcu === "object";
}
