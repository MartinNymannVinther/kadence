import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { POST } from "@/app/api/devices/[provider]/webhook/route";
import { appPool } from "@/core/db/client";
import { SPORT } from "@/modules/fit";
import { saveLink } from "@/modules/devices/links";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { adminPool } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { bytes, fakeFetch, WEBHOOK_TOKEN, withProviderKeys } from "./fake-fetch";

/**
 * A ride from Wahoo is a job written before Wahoo gets its 200 (docs/adr/
 * 0085), so a provider that is down for a moment does not cost the ride:
 * the download is tried again after a minute, and imported then. The job
 * holds the provider's ids, the file's address and its name, and none of
 * the notification's other fields. When the queue cannot be written,
 * Wahoo is told 503 and sends the notification again.
 */

const ORG = "org_dev_retry";
const RIDER = { orgId: ORG, userId: "user_dr_rider" };
const FILE_URL = "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/retry.fit";

let admin: Pool;
let restore: () => void;
const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

const notify = () =>
  POST(
    new Request("http://localhost:3000/api/devices/wahoo/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "workout_summary",
        webhook_token: WEBHOOK_TOKEN,
        user: { id: 81001 },
        workout_summary: {
          id: 9101,
          file: { url: FILE_URL },
          heart_rate_avg: 182,
          workout: { name: "Intervaller" },
        },
      }),
    }),
    { params: Promise.resolve({ provider: "wahoo" }) },
  );

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  await seedPerson(admin, ORG, RIDER.userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "dr_rider",
    user_id: RIDER.userId,
    name: "dr_rider",
    birth_year: 2008,
  });
  await admin.query(q.text, q.values);
  await saveLink(RIDER, "wahoo", "81001", {
    accessToken: "w-dr",
    refreshToken: null,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  await clearJobs();
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await admin.end();
});

describe("a ride while Wahoo's file host is down", () => {
  it("is queued with ids and the file's address only, and answered 200", async () => {
    const calls = fakeFetch({});
    expect((await notify()).status).toBe(200);
    expect(calls).toHaveLength(0);
    const { rows } = await admin.query(
      "select payload, org_id from jobs where kind = 'device.fetch'",
    );
    expect(rows).toEqual([
      {
        org_id: null,
        payload: {
          provider: "wahoo",
          event: "activity",
          externalUserId: "81001",
          externalId: "9101",
          url: FILE_URL,
          fileName: "Intervaller.fit",
          key: "wahoo:81001:9101",
        },
      },
    ]);
  });

  it("is tried again a minute later, and imported once the host answers", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fakeFetch({ [`GET ${FILE_URL}`]: () => new Response("busy", { status: 503 }) });
    const [first] = await drainJobs(["device.fetch"]);
    expect(first).toMatchObject({ outcome: "retry", error: "DeviceHttpError:status" });
    const link = await admin.query(
      "select status, last_error from device_links where rider_id = 'dr_rider'",
    );
    expect(link.rows[0]).toEqual({ status: "connected", last_error: "download_status" });
    const waiting = await admin.query(
      "select extract(epoch from run_at - now())::int as due_in from jobs where id = $1",
      [first!.id],
    );
    expect(waiting.rows[0].due_in).toBe(60);

    await admin.query("update jobs set run_at = now() where id = $1", [first!.id]);
    fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(ride) });
    expect(await drainJobs(["device.fetch"])).toMatchObject([
      { id: first!.id, outcome: "done", result: "imported" },
    ]);
    const { rows } = await admin.query(
      "select title, external_id from activities where rider_id = 'dr_rider'",
    );
    expect(rows).toEqual([{ title: "Intervaller", external_id: "9101" }]);
  });
});

describe("a notification when the queue cannot be written", () => {
  it("is answered 503, so the provider sends it again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const query = vi.spyOn(appPool, "query").mockImplementation((async (text: unknown) => {
      if (String(text).includes("insert into jobs")) throw new Error("database away");
      return { rows: [{ count: 1, retry: 60 }], rowCount: 1 };
    }) as never);
    try {
      expect((await notify()).status).toBe(503);
    } finally {
      query.mockRestore();
    }
  });
});
