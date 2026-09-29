import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { POST } from "@/app/api/ingest/route";
import { resetRateLimits } from "@/core/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { newUploadKey } from "@/modules/devices/upload-keys";
import { listSessions } from "@/modules/training/sessions";
import { adminPool } from "../helpers/db";
import { bytesOf, gpx, zip } from "../files/fixtures";
import {
  body,
  check,
  DAY,
  ride,
  rideOn,
  seedIngestTeam,
  send,
  sendForm,
  URL,
  type IngestTeam,
} from "./ingest-fixture";

/**
 * A ride handed over with an upload key and nobody signed in
 * (docs/adr/0029): refused without a key Kadence knows, before the body
 * is read; imported as the rider the key belongs to and nobody else, onto
 * the planned session it fulfilled; answered with a status a helper can
 * act on, and with nothing about the rider. The limits are in
 * ingest-limits.test.ts.
 */

let admin: Pool;
let team: IngestTeam;

const activitiesOf = (riderId: string) =>
  admin.query(
    "select id, title, source, created_by, upload_key_id, started_at from activities where rider_id = $1 order by started_at",
    [riderId],
  );
const keyRow = async (id: string) =>
  (await admin.query("select last_used_at, last_error from upload_keys where id = $1", [id]))
    .rows[0] as { last_used_at: Date | null; last_error: string };

beforeAll(async () => {
  admin = adminPool();
  team = await seedIngestTeam(admin, "in");
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await admin.end();
});

describe("without a key Kadence knows", () => {
  it("answers 401 and keeps nothing", async () => {
    for (const key of [null, "", "not-a-key", newUploadKey().key, team.idaKey.slice(0, -1)]) {
      const response = await send(key, ride, { name: "morgen.fit" });
      expect(response.status, String(key)).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Bearer");
      expect(await response.json()).toEqual({ status: "refused", reason: "unauthorized" });
    }
    expect((await activitiesOf(team.idaRider)).rows).toEqual([]);
  });

  it("takes the key from the Authorization header and nowhere else", async () => {
    const inQuery = await POST(
      new Request(`${URL}?key=${team.idaKey}&token=${team.idaKey}`, {
        method: "POST",
        body: body(ride),
      }),
    );
    expect(inQuery.status).toBe(401);
    const basic = await send(null, ride, { headers: { Authorization: `Basic ${team.idaKey}` } });
    expect(basic.status).toBe(401);
  });
});

describe("a ride with a key", () => {
  it("is imported as the rider and lands on the planned session", async () => {
    const response = await send(team.idaKey, ride, { name: "morgen.fit" });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    // Nothing comes out with a key: not the ride's id, not the session it landed on.
    const answer = await response.text();
    expect(JSON.parse(answer)).toEqual({ status: "imported" });
    expect(answer).not.toContain("Grundtur");

    const [session] = await listSessions(team.coach, {
      from: DAY,
      to: DAY,
      riderIds: [team.idaRider],
    });
    expect(session).toMatchObject({ title: "Grundtur" });
    expect(session!.activity).toMatchObject({ source: "fit", loadMethod: "power" });
    const { rows } = await activitiesOf(team.idaRider);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(session!.activity!.id);
    expect(rows[0]).toMatchObject({
      title: "morgen",
      source: "fit",
      created_by: team.ida.userId,
      // Which key brought the ride, for the day a key has gone astray.
      upload_key_id: team.idaKeyId,
    });
    const [mikkels] = await listSessions(team.coach, {
      from: DAY,
      to: DAY,
      riderIds: [team.mikkelRider],
    });
    expect(mikkels!.activity).toBeNull();

    const key = await keyRow(team.idaKeyId);
    expect(key.last_used_at).not.toBeNull();
    expect(key.last_error).toBe("");
  });

  it("is answered 200 the second time, and changes nothing", async () => {
    const response = await send(team.idaKey, ride, { name: "igen.fit" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "duplicate" });
    expect((await activitiesOf(team.idaRider)).rows).toHaveLength(1);
  });

  it("is the same ride with a byte added, by its start", async () => {
    const padded = new Uint8Array(ride.byteLength + 1);
    padded.set(ride);
    const response = await send(team.idaKey, padded, { name: "polstret.fit" });
    // Refused as unreadable or recognised as the same ride; never a second one.
    expect([200, 422]).toContain(response.status);
    expect((await activitiesOf(team.idaRider)).rows).toHaveLength(1);
  });

  it("goes to the rider the key belongs to, whatever the request says", async () => {
    const response = await POST(
      new Request(`${URL}?name=min.fit&riderId=${team.idaRider}&rider_id=${team.idaRider}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${team.mikkelKey}`, "X-Rider-Id": team.idaRider },
        body: body(ride),
      }),
    );
    expect(response.status).toBe(201);
    expect((await activitiesOf(team.idaRider)).rows).toHaveLength(1);
    const { rows } = await activitiesOf(team.mikkelRider);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ created_by: team.mikkel.userId });
  });

  it("comes as a form with one file as well", async () => {
    const response = await sendForm(team.idaKey, [
      { name: "Hørsholm.gpx", bytes: bytesOf(gpx(900)) },
    ]);
    expect(response.status).toBe(201);
    const { rows } = await activitiesOf(team.idaRider);
    expect(rows.map((r) => r.title)).toContain("Hørsholm & omegn");
  });

  it("is one ride a request", async () => {
    const two = await sendForm(team.idaKey, [
      { name: "a.fit", bytes: rideOn(3) },
      { name: "b.fit", bytes: rideOn(4) },
    ]);
    expect(two.status).toBe(400);
    expect(await two.json()).toEqual({ status: "refused", reason: "too_many_files" });
    const none = await POST(
      new Request(URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${team.idaKey}` },
        body: new FormData(),
      }),
    );
    expect(none.status).toBe(400);
    const empty = await send(team.idaKey, new Uint8Array(0));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ status: "refused", reason: "no_file" });
    expect((await activitiesOf(team.idaRider)).rows).toHaveLength(2);
  });

  it("keeps a ride without a name under what it is, with no title made up", async () => {
    const before = (await activitiesOf(team.idaRider)).rows.map((r) => r.id as string);
    const response = await send(team.idaKey, rideOn(5));
    expect(response.status).toBe(201);
    const { rows } = await admin.query(
      `select a.title, f.file_name from activities a join activity_files f on f.activity_id = a.id
       where a.rider_id = $1 and not (a.id = any($2::text[]))`,
      [team.idaRider, before],
    );
    expect(rows).toEqual([{ title: "", file_name: "activity.fit" }]);
  });
});

describe("a file Kadence cannot take", () => {
  it("that is no ride is answered 422 with the reader's reason, and noted on the key", async () => {
    const response = await send(team.idaKey, bytesOf("not a ride at all"), { name: "x.fit" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ status: "refused", reason: "unknown_format" });
    expect((await keyRow(team.idaKeyId)).last_error).toBe("invalid_file");

    const archive = await send(team.idaKey, zip([{ name: "læsmig.txt", bytes: bytesOf("hej") }]));
    expect(archive.status).toBe(422);
    expect((await archive.json()).reason).toBe("no_activity");
  });

  it("that is over the cap is answered 413", async () => {
    const response = await send(team.idaKey, new Uint8Array(MAX_UPLOAD_BYTES + 1), {
      name: "stor.fit",
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ status: "refused", reason: "too_large" });
  });

  it("is forgotten on the key by the next ride that comes in", async () => {
    expect((await keyRow(team.idaKeyId)).last_error).toBe("invalid_file");
    expect((await send(team.idaKey, rideOn(6), { name: "god.fit" })).status).toBe(201);
    expect((await keyRow(team.idaKeyId)).last_error).toBe("");
  });
});

describe("asking whether a key works", () => {
  it("answers 200 to the key and 401 without, and says nothing about the rider", async () => {
    const yes = await check(team.idaKey);
    expect(yes.status).toBe(200);
    expect(await yes.json()).toEqual({ status: "ok" });
    expect((await check(null)).status).toBe(401);
  });
});
