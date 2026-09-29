import type { Pool } from "pg";
import { GET, POST } from "@/app/api/ingest/route";
import { createUploadKey } from "@/modules/devices/upload-keys";
import { SPORT } from "@/modules/fit";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * What the tests of the upload key's door share (docs/adr/0029): a team
 * with a coach and two riders, each rider with a planned hour on the day
 * of the fixture ride and a key of their own, and the requests a helper
 * would send. The fixture ride starts 1 September 2026 at 07:00 UTC.
 */

export const DAY = "2026-09-01";
export const URL = "https://kadence.test/api/ingest";

export const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

/** The same hour on a later day: another ride. */
export const rideOn = (days: number) =>
  encodeRide(steadyHour().map((sample) => ({ ...sample, s: sample.s + days * 86_400 })));

export const body = (bytes: Uint8Array) => new Uint8Array(bytes) as unknown as BodyInit;

export type IngestTeam = {
  coach: { orgId: string; userId: string };
  ida: { orgId: string; userId: string };
  mikkel: { orgId: string; userId: string };
  /** Rider ids: `<prefix>_ida` and `<prefix>_mikkel`. */
  idaRider: string;
  mikkelRider: string;
  idaKey: string;
  idaKeyId: string;
  mikkelKey: string;
};

export async function seedIngestTeam(admin: Pool, prefix: string): Promise<IngestTeam> {
  const orgId = `org_${prefix}`;
  const coach = { orgId, userId: `user_${prefix}_coach` };
  const ida = { orgId, userId: `user_${prefix}_ida` };
  const mikkel = { orgId, userId: `user_${prefix}_mikkel` };
  await seedPerson(admin, orgId, coach.userId, "owner");
  for (const p of [ida, mikkel]) await seedPerson(admin, orgId, p.userId, "member");
  for (const [id, uid] of [
    [`${prefix}_ida`, ida.userId],
    [`${prefix}_mikkel`, mikkel.userId],
  ] as const) {
    const q = insertSql("riders", {
      org_id: orgId,
      id,
      user_id: uid,
      name: id,
      birth_year: 2008,
      ftp_watts: 250,
    });
    await admin.query(q.text, q.values);
    const s = insertSql("planned_sessions", {
      org_id: orgId,
      id: `${id}_session`,
      rider_id: id,
      on_date: DAY,
      sport: "bike",
      title: "Grundtur",
      planned_minutes: 60,
    });
    await admin.query(s.text, s.values);
  }
  const made = await createUploadKey(ida, "Fars computer");
  return {
    coach,
    ida,
    mikkel,
    idaRider: `${prefix}_ida`,
    mikkelRider: `${prefix}_mikkel`,
    idaKey: made.key,
    idaKeyId: made.id,
    mikkelKey: (await createUploadKey(mikkel, "Telefon")).key,
  };
}

/** A ride as a bare body, the way `curl --data-binary` sends one. */
export function send(
  key: string | null,
  bytes: Uint8Array,
  options: { name?: string; headers?: Record<string, string> } = {},
) {
  const url = options.name ? `${URL}?name=${encodeURIComponent(options.name)}` : URL;
  return POST(
    new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        ...options.headers,
      },
      body: body(bytes),
    }),
  );
}

/** Rides as the `file` fields of a form. */
export function sendForm(key: string, files: Array<{ name: string; bytes: Uint8Array }>) {
  const form = new FormData();
  for (const file of files) form.append("file", new File([new Uint8Array(file.bytes)], file.name));
  return POST(
    new Request(URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form }),
  );
}

/** A helper asking whether its key works. */
export const check = (key: string | null, headers: Record<string, string> = {}) =>
  GET(
    new Request(URL, {
      headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...headers },
    }),
  );
