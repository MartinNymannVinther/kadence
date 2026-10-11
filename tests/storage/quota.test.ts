import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { setFileQuota } from "@/core/admin/file-quota";
import { platformOverview } from "@/core/admin/overview";
import { env } from "@/core/env";
import { resetRateLimits } from "@/core/rate-limit";
import { importFit } from "@/modules/devices/import";
import { saveLink } from "@/modules/devices/links";
import { handleWebhook } from "@/modules/devices/webhooks";
import { fileQuota } from "@/modules/storage/quota";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import { bytes, fakeFetch, WEBHOOK_TOKEN, withProviderKeys } from "../devices/fake-fetch";
import { ride, seedIngestTeam, send, type IngestTeam } from "../devices/ingest-fixture";
import { rideOn, seedStorageTeam, type StorageTeam } from "./fixture";

/**
 * Quotas (docs/adr/0087): a workspace holds so much file and no more, by
 * the installation's default for its kind unless the owner set its own;
 * every door a file comes in by refuses the one that would pass it with
 * the same word, and the device job gives up rather than try again; only
 * the installation's owner moves a quota, and the database says so.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
const { POST: upload } = await import("@/app/api/activities/upload/route");

let admin: Pool;
let team: StorageTeam;
let ingest: IngestTeam;
let restoreKeys: () => void;
const OWNER = "user_quota_owner";

beforeAll(async () => {
  admin = adminPool();
  restoreKeys = withProviderKeys();
  team = await seedStorageTeam(admin, "quota");
  ingest = await seedIngestTeam(admin, "quotain");
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'quota-owner@example.com', 'owner') on conflict do nothing`,
    [OWNER],
  );
  await clearJobs();
});

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restoreKeys();
  await admin.end();
});

describe("what a workspace may hold", () => {
  it("is the installation's default for its kind until the owner sets its own", async () => {
    expect(await fileQuota(team.coach)).toMatchObject({
      usedBytes: 0,
      quotaBytes: env.FILES_QUOTA_CLUB_BYTES,
      kind: "club",
      own: false,
    });
    expect(env.FILES_QUOTA_CLUB_BYTES).toBe(20_000_000_000);
    expect(env.FILES_QUOTA_PERSONAL_BYTES).toBe(2_000_000_000);

    expect(await setFileQuota(OWNER, team.orgId, 5_000)).toBe("ok");
    expect(await fileQuota(team.rider)).toMatchObject({ quotaBytes: 5_000, own: true });
    const overview = await platformOverview(OWNER);
    expect(overview?.find((c) => c.orgId === team.orgId)?.fileQuotaBytes).toBe(5_000);

    expect(await setFileQuota(OWNER, team.orgId, null)).toBe("ok");
    expect(await fileQuota(team.rider)).toMatchObject({
      quotaBytes: env.FILES_QUOTA_CLUB_BYTES,
      own: false,
    });
  });

  it("is nobody else's to move, not even a coach's with the run of team_settings", async () => {
    expect(await setFileQuota(team.coach.userId, team.orgId, 1)).toBe("unauthorized");
    const app = await appClient();
    try {
      expect(
        await expectSqlError(
          asApp(app, team.coach, (c) => c.query(`select set_file_quota($1, 1)`, [team.orgId])),
        ),
      ).toBe("42501");
      expect(
        await expectSqlError(
          asApp(app, team.coach, (c) =>
            c.query(
              `insert into team_settings (org_id, file_quota_bytes) values ($1, 1)
               on conflict (org_id) do update set file_quota_bytes = 1`,
              [team.orgId],
            ),
          ),
        ),
      ).toBe("42501");
    } finally {
      await app.end();
    }
  });
});

describe("a file that would pass the quota", () => {
  it("is refused by the import and leaves no ride, and fits again when the quota is raised", async () => {
    const first = rideOn(0);
    await setFileQuota(OWNER, team.orgId, first.byteLength + 10);
    const imported = await importFit(team.rider, team.riderId, "a.fit", first);
    expect(imported.activityId).toBeTruthy();
    expect((await fileQuota(team.coach)).usedBytes).toBe(first.byteLength);

    await expect(importFit(team.rider, team.riderId, "b.fit", rideOn(1))).rejects.toMatchObject({
      name: "Refused",
      code: "invalid",
      detail: "quota",
    });
    const rides = await admin.query(
      `select count(*)::int as n from activities where rider_id = $1`,
      [team.riderId],
    );
    expect(rides.rows[0].n).toBe(1);

    await setFileQuota(OWNER, team.orgId, null);
    await importFit(team.rider, team.riderId, "b.fit", rideOn(1));
  });

  it("is answered with the word on the upload route", async () => {
    await setFileQuota(OWNER, team.orgId, 1);
    session.ctx = team.rider;
    const form = new FormData();
    form.append("riderId", team.riderId);
    form.append("file", new File([new Uint8Array(rideOn(2))], "c.fit"));
    const response = await upload(
      new Request("http://localhost:3000/api/activities/upload", { method: "POST", body: form }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [{ name: "c.fit", ok: false, error: "quota" }],
    });
    await setFileQuota(OWNER, team.orgId, null);
  });

  it("is answered 507 at the upload key's door, and the key says so", async () => {
    await setFileQuota(OWNER, ingest.coach.orgId, 1);
    const response = await send(ingest.idaKey, ride, { name: "morgen.fit" });
    expect(response.status).toBe(507);
    expect(await response.json()).toEqual({ status: "refused", reason: "quota" });
    const key = await admin.query(`select last_error from upload_keys where id = $1`, [
      ingest.idaKeyId,
    ]);
    expect(key.rows[0].last_error).toBe("quota");
    await setFileQuota(OWNER, ingest.coach.orgId, null);
  });

  it("makes the device job give up, with the link saying why", async () => {
    await setFileQuota(OWNER, team.orgId, 1);
    await saveLink(team.rider, "wahoo", "77001", {
      accessToken: "w-q",
      refreshToken: null,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const FILE_URL = "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/q.fit";
    fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(rideOn(3)) });
    const response = await handleWebhook(
      "wahoo",
      new Request("http://localhost:3000/api/devices/wahoo/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "workout_summary",
          webhook_token: WEBHOOK_TOKEN,
          user: { id: 77001 },
          workout_summary: { id: 9101, file: { url: FILE_URL }, workout: { name: "Tur" } },
        }),
      }),
    );
    expect(response.status).toBe(200);
    const runs = await drainJobs(["device.fetch"]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ outcome: "failed", error: "quota" });
    const link = await admin.query(
      `select last_error from device_links where rider_id = $1 and provider = 'wahoo'`,
      [team.riderId],
    );
    expect(link.rows[0].last_error).toBe("quota");
    await setFileQuota(OWNER, team.orgId, null);
  });
});
