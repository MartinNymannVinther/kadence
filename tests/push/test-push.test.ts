import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { Refused } from "@/core/action";
import type { PushConfig } from "@/modules/push/send";
import { adminPool } from "../helpers/db";
import { at, EVENING, NOON, pushTeam } from "./push-team";

/**
 * "Send en prøve" (docs/adr/0060, P1-05), through the server action as the
 * person and the service behind it: one empty push to the person's own
 * browsers on this team and nobody else's, three an hour, and the text the
 * service worker then fetches — "Sådan ser en påmindelse fra Kadence ud"
 * — until a real reminder goes out after it. The push services are a
 * stand-in; the suite never reaches the network.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
const push = vi.hoisted(() => ({ config: null as PushConfig | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/modules/push/timer", () => ({ pushConfig: () => push.config }));

const { sendTestReminderAction } = await import("@/modules/push/actions");
const { sendTestReminder, TESTS_PER_HOUR } = await import("@/modules/push/test-push");
const { latestFor } = await import("@/modules/push/latest");
const { runReminders } = await import("@/modules/push/job");

let admin: Pool;
let team: ReturnType<typeof pushTeam>;

beforeAll(async () => {
  admin = adminPool();
  team = pushTeam(admin, "pt");
  await team.seed();
  vi.stubGlobal("fetch", () => {
    throw new Error("a test push must not use the global fetch in tests");
  });
});

beforeEach(async () => {
  await team.clear();
  push.config = team.config;
  auth.session = null;
});

afterAll(async () => {
  await team.clear();
  vi.unstubAllGlobals();
  await admin.end();
});

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "none";
  } catch (error) {
    return error instanceof Refused
      ? `${error.code}${error.detail ? `:${error.detail}` : ""}`
      : "other";
  }
}

describe("the action", () => {
  it("sends one empty push to the person's own browsers on this team, and no one else's", async () => {
    const { RIDER, COACH } = team;
    await team.subscribe("phone", RIDER);
    await team.subscribe("laptop", RIDER);
    await team.subscribe("b", { orgId: team.ORG_B, userId: RIDER.userId });
    await team.subscribe("coach", COACH);

    auth.session = RIDER;
    expect(await sendTestReminderAction({})).toEqual({
      ok: true,
      data: { sent: 2, gone: 0, failed: 0 },
    });
    expect(team.pushed().sort()).toEqual(["laptop", "phone"]);
    for (const call of team.calls) expect(call.init?.body ?? null).toBeNull();
    expect(await latestFor(RIDER.userId)).toEqual({ kind: "test", path: "/settings/me" });
    // The coach's browser got nothing, and the coach's text is the coach's own.
    expect(await latestFor(COACH.userId)).toBeNull();
  });

  it("takes no input, and answers someone signed out before anything else", async () => {
    auth.session = team.RIDER2;
    expect(await sendTestReminderAction({ endpoint: "https://fcm.googleapis.com/x" })).toEqual({
      ok: false,
      error: "invalid",
    });
    auth.session = null;
    expect(await sendTestReminderAction({})).toEqual({ ok: false, error: "unauthorized" });
    expect(team.calls).toHaveLength(0);
  });

  it("refuses without the key pair, and without a browser to send to", async () => {
    auth.session = team.PARENT;
    expect(await sendTestReminderAction({})).toEqual({ ok: false, error: "notFound" });
    push.config = null;
    await team.subscribe("parent", team.PARENT);
    expect(await sendTestReminderAction({})).toEqual({ ok: false, error: "notFound" });
    expect(team.calls).toHaveLength(0);
  });
});

describe("three an hour", () => {
  it("are counted per person, and the fourth sends nothing", async () => {
    await team.subscribe("rider2", team.RIDER2);
    auth.session = team.RIDER2;
    for (let i = 0; i < TESTS_PER_HOUR; i += 1)
      expect(await sendTestReminderAction({})).toMatchObject({ ok: true });
    expect(await sendTestReminderAction({})).toEqual({
      ok: false,
      error: "conflict",
      detail: "too_many_test_reminders",
    });
    expect(team.pushed()).toHaveLength(TESTS_PER_HOUR);
  });
});

describe("what the test says, and after it", () => {
  it("gives way to a real reminder that went out after it", async () => {
    const { COACH } = team;
    await team.subscribe("coach", COACH, { kinds: ["comment"] });
    await sendTestReminder(COACH, team.config, NOON);
    expect(await latestFor(COACH.userId, NOON)).toEqual({ kind: "test", path: "/settings/me" });

    await team.session("s_pt", team.riders.first, "2026-10-07", COACH.userId, NOON);
    await team.comment("c_pt", "s_pt", team.riders.first, team.RIDER.userId, NOON);
    await runReminders(team.config, EVENING);
    expect(await latestFor(COACH.userId, EVENING)).toMatchObject({ kind: "comment" });
  });

  it("forgets a browser the push service no longer knows", async () => {
    const { COACH2 } = team;
    await team.subscribe("old", COACH2);
    await team.subscribe("new", COACH2);
    team.answer((url) => (url.endsWith("old") ? 410 : 201));
    expect(await sendTestReminder(COACH2, team.config, at("2026-10-06T10:30:00Z"))).toEqual({
      sent: 1,
      gone: 1,
      failed: 0,
    });
    expect(await team.row("old")).toBeUndefined();
    expect(await team.row("new")).toBeDefined();
  });

  it("is only for someone on the team", async () => {
    const stranger = { orgId: team.ORG, userId: "user_pt_coach_b" };
    expect(await refusal(sendTestReminder(stranger, team.config))).toBe("forbidden");
  });
});
