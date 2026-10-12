import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { z } from "zod";
import { withOrgContext } from "@/core/db/tenant";
import { resetRateLimits } from "@/core/rate-limit";
import { PlanExpired, reserveAiCall } from "@/modules/ai/limits";
import { workspacePlan } from "@/modules/billing/plan";
import { importFit } from "@/modules/devices/import";
import { GOAL_KINDS } from "@/modules/load/goals";
import { saveLink } from "@/modules/devices/links";
import { handleWebhook } from "@/modules/devices/webhooks";
import { buildOrgExport } from "@/modules/export/service";
import { adminPool } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import { bytes, fakeFetch, WEBHOOK_TOKEN, withProviderKeys } from "../devices/fake-fetch";
import { ride, seedIngestTeam, send, type IngestTeam } from "../devices/ingest-fixture";
import { rideOn, seedStorageTeam, type StorageTeam } from "../storage/fixture";
import { setPlan, withBilling } from "./fixture";

/**
 * Read and export (docs/adr/0090): a workspace whose trial or payment ran
 * out takes nothing new in by any door — a server action, the upload, an
 * upload key, a device's job, a model call — and is refused with one word,
 * "planExpired", which the pages say plainly. What it holds can still be
 * read, exported, taken away and deleted, and the few actions that do
 * that, or leave, pass.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
const { runAction, STILL_ALLOWED } = await import("@/core/action");
const { POST: upload } = await import("@/app/api/activities/upload/route");
const { searchIndexAction } = await import("@/modules/search/actions");
const { addGoalAction } = await import("@/modules/training/goal-actions");
const { inviteMemberAction } = await import("@/core/team/actions");
const { saveModelSettingsAction } =
  await import("@/app/[locale]/(app)/(narrow)/settings/ai/actions");

let admin: Pool;
let team: StorageTeam;
let ingest: IngestTeam;
let restoreBilling: () => void;
let restoreKeys: () => void;
const GOAL_KIND = GOAL_KINDS[0];
const refused = { ok: false, error: "forbidden", detail: "planExpired" };

beforeAll(async () => {
  admin = adminPool();
  restoreBilling = withBilling("on");
  restoreKeys = withProviderKeys();
  team = await seedStorageTeam(admin, "expired");
  ingest = await seedIngestTeam(admin, "expiredin");
  await setPlan(admin, team.orgId, "expired", { trial: "-2 days" });
  await setPlan(admin, ingest.coach.orgId, "expired", { trial: "-2 days" });
  await clearJobs();
});

beforeEach(async () => {
  await resetRateLimits();
  session.ctx = team.coach;
});

afterAll(async () => {
  restoreKeys();
  restoreBilling();
  vi.unstubAllGlobals();
  await admin.end();
});

describe("a server action", () => {
  it("is refused with the plan's word, and writes nothing", async () => {
    let ran = false;
    const result = await runAction({}, z.object({}), async () => {
      ran = true;
    });
    expect(result).toEqual(refused);
    expect(ran).toBe(false);
    const goal = await addGoalAction({
      riderId: team.riderId,
      title: "Ti ture",
      kind: GOAL_KIND,
      target: 10,
      startsOn: "2026-11-01",
      endsOn: "2026-12-31",
    });
    expect(goal).toEqual(refused);
    const goals = await admin.query(
      "select count(*)::int as n from rider_goals where rider_id = $1",
      [team.riderId],
    );
    expect(goals.rows[0].n).toBe(0);
  });

  it("runs when it is one that reads, leaves or takes away", async () => {
    expect(await runAction({}, z.object({}), async () => "read", [], STILL_ALLOWED)).toEqual({
      ok: true,
      data: "read",
    });
    expect(await searchIndexAction({})).toMatchObject({ ok: true });
  });

  it("outside runAction is refused too: inviting a member, a model setting", async () => {
    expect(await inviteMemberAction({ email: "ny@example.com", role: "member" })).toEqual(refused);
    expect(await saveModelSettingsAction({ provider: "inherit", apiKey: "keep" })).toEqual({
      ok: false,
      error: "planExpired",
    });
  });

  it("runs for a workspace that is not read only", async () => {
    const other = await seedStorageTeam(admin, "expiredok");
    await setPlan(admin, other.orgId, "trial", { trial: "+10 days" });
    session.ctx = other.coach;
    expect(await runAction({}, z.object({}), async () => "written")).toEqual({
      ok: true,
      data: "written",
    });
  });
});

describe("a ride", () => {
  it("is refused by the import, whatever door it came by", async () => {
    await expect(importFit(team.rider, team.riderId, "a.fit", rideOn(0))).rejects.toMatchObject({
      name: "Refused",
      code: "forbidden",
      detail: "planExpired",
    });
    const rides = await admin.query(
      "select count(*)::int as n from activities where rider_id = $1",
      [team.riderId],
    );
    expect(rides.rows[0].n).toBe(0);
  });

  it("is answered with the word on the upload route", async () => {
    session.ctx = team.rider;
    const form = new FormData();
    form.append("riderId", team.riderId);
    form.append("file", new File([new Uint8Array(rideOn(2))], "c.fit"));
    const response = await upload(
      new Request("http://localhost:3000/api/activities/upload", { method: "POST", body: form }),
    );
    expect(await response.json()).toEqual({
      results: [{ name: "c.fit", ok: false, error: "planExpired" }],
    });
  });

  it("is answered 402 at the upload key's door, and the key says so", async () => {
    const response = await send(ingest.idaKey, ride, { name: "morgen.fit" });
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ status: "refused", reason: "planExpired" });
    const key = await admin.query("select last_error from upload_keys where id = $1", [
      ingest.idaKeyId,
    ]);
    expect(key.rows[0].last_error).toBe("planExpired");
  });

  it("makes the device job give up, with the link saying why", async () => {
    await saveLink(team.rider, "wahoo", "77901", {
      accessToken: "w-x",
      refreshToken: null,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const FILE_URL = "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/x.fit";
    fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(rideOn(3)) });
    const response = await handleWebhook(
      "wahoo",
      new Request("http://localhost:3000/api/devices/wahoo/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "workout_summary",
          webhook_token: WEBHOOK_TOKEN,
          user: { id: 77901 },
          workout_summary: { id: 9901, file: { url: FILE_URL }, workout: { name: "Tur" } },
        }),
      }),
    );
    expect(response.status).toBe(200);
    const runs = await drainJobs(["device.fetch"]);
    expect(runs[0]).toMatchObject({ outcome: "failed", error: "planExpired" });
    const link = await admin.query(
      "select last_error from device_links where rider_id = $1 and provider = 'wahoo'",
      [team.riderId],
    );
    expect(link.rows[0].last_error).toBe("planExpired");
  });
});

describe("the AI", () => {
  it("is not asked, and nothing is counted", async () => {
    await expect(
      withOrgContext(team.coach, (tx) => reserveAiCall(tx, team.coach, "test", "test")),
    ).rejects.toBeInstanceOf(PlanExpired);
    const calls = await admin.query("select count(*)::int as n from ai_calls where org_id = $1", [
      team.orgId,
    ]);
    expect(calls.rows[0].n).toBe(0);
  });
});

describe("what still works", () => {
  it("reads the plan and the workspace", async () => {
    expect((await workspacePlan(team.coach)).plan).toBe("expired");
    const riders = await withOrgContext(team.rider, (tx) =>
      tx.execute("select id from riders" as never),
    );
    expect(riders.rows.length).toBeGreaterThan(0);
  });

  it("exports everything", async () => {
    const data = await buildOrgExport(team.coach);
    const sheet = data.sections.find((s) => s.sheet === "Ryttere");
    expect(sheet?.rows.length).toBe(1);
  });

  it("deletes the workspace when its owner asks", async () => {
    const gone = await seedStorageTeam(admin, "expiredgone");
    await setPlan(admin, gone.orgId, "expired", { trial: "-1 day" });
    await withOrgContext(gone.coach, (tx) =>
      tx.execute(`select delete_workspace('${gone.orgId}')` as never),
    );
    const left = await admin.query("select count(*)::int as n from organizations where id = $1", [
      gone.orgId,
    ]);
    expect(left.rows[0].n).toBe(0);
  });
});
