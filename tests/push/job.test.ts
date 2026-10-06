import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { runReminders } from "@/modules/push/job";
import { latestFor } from "@/modules/push/latest";
import { adminPool } from "../helpers/db";
import { at, EVENING, MORNING, pushTeam } from "./push-team";

/**
 * The reminder run (docs/adr/0060) against the database, with the push
 * services replaced by a stand-in: the suite never reaches the network.
 * The check-in once a day, nothing in the quiet hours, one push per person
 * per run, the mark written so a second run — or one at the same time —
 * sends nothing twice, a browser that has gone forgotten, and a push that
 * failed for a moment tried again. News, the plan and the week are in
 * job-news.test.ts.
 */

let admin: Pool;
let team: ReturnType<typeof pushTeam>;

beforeAll(async () => {
  admin = adminPool();
  team = pushTeam(admin, "pj");
  await team.seed();
  // The job is handed its own fetch; the global one must never be reached.
  vi.stubGlobal("fetch", () => {
    throw new Error("the reminder job must not use the global fetch in tests");
  });
});

beforeEach(async () => {
  await team.clear();
});

afterAll(async () => {
  await team.clear();
  vi.unstubAllGlobals();
  await admin.end();
});

describe("the evening check-in", () => {
  it("goes once, as an empty push signed for the push service", async () => {
    await team.subscribe("rider", team.RIDER);
    await runReminders(team.config, EVENING);
    expect(team.pushed()).toEqual(["rider"]);
    const { init } = team.calls.find((c) => c.url.endsWith("-rider"))!;
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(init?.body ?? null).toBeNull();
    expect(headers.get("authorization")).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    expect(headers.get("ttl")).toBe("21600");
    expect(headers.get("urgency")).toBe("normal");
    expect((await team.row("rider"))?.checkin).toBe("2026-10-06");
    expect(await latestFor(team.RIDER.userId)).toEqual({ kind: "checkin", path: "/today" });

    await runReminders(team.config, at("2026-10-06T17:15:00Z"));
    expect(team.pushed()).toEqual(["rider"]);
  });

  it("is not sent to a rider who has checked in, or in the quiet hours", async () => {
    await team.subscribe("rider", team.RIDER);
    await team.subscribe("rider2", team.RIDER2);
    await team.insert("checkins", {
      org_id: team.ORG,
      rider_id: team.riders.second,
      on_date: "2026-10-06",
      energy: 4,
    });
    const quiet = await runReminders(team.config, at("2026-10-06T20:00:00Z"));
    expect(quiet.quiet).toBe(true);
    expect(team.pushed()).toEqual([]);
    await runReminders(team.config, EVENING);
    expect(team.pushed()).toEqual(["rider"]);
  });

  it("goes once when two runs meet", async () => {
    await team.subscribe("rider", team.RIDER);
    await Promise.all([runReminders(team.config, EVENING), runReminders(team.config, EVENING)]);
    expect(team.pushed()).toEqual(["rider"]);
  });
});

describe("one push per person per run", () => {
  it("takes one team per run when the person is due on two", async () => {
    // One phone, two teams: the same address on each.
    const onB = { orgId: team.ORG_B, userId: team.RIDER.userId };
    await team.subscribe("a", team.RIDER, { address: "phone" });
    await team.subscribe("b", onB, { address: "phone" });
    await runReminders(team.config, EVENING);
    expect(team.pushed()).toEqual(["phone"]);
    await runReminders(team.config, at("2026-10-06T17:15:00Z"));
    expect(team.pushed()).toEqual(["phone", "phone"]);
    await runReminders(team.config, at("2026-10-06T17:25:00Z"));
    expect(team.pushed()).toHaveLength(2);
  });

  it("tells news first, moves told_up_to to the run, and the check-in comes next", async () => {
    const { RIDER, COACH } = team;
    const first = team.riders.first;
    await team.subscribe("rider", RIDER);
    await team.session("s_pj", first, "2026-10-07", COACH.userId, MORNING);
    await team.comment("c_pj", "s_pj", first, COACH.userId, at("2026-10-06T15:00:00Z"));
    await runReminders(team.config, EVENING);
    expect(team.pushed()).toEqual(["rider"]);
    const told = await team.row("rider");
    expect(told?.told_up_to.getTime()).toBe(EVENING.getTime());
    expect(told?.updated_at.getTime()).toBe(EVENING.getTime());
    expect(told?.checkin).toBeNull();
    expect(await latestFor(RIDER.userId)).toEqual({
      kind: "comment",
      title: "Pas s_pj",
      author: COACH.userId,
      path: "/calendar/session/s_pj",
    });

    await runReminders(team.config, at("2026-10-06T17:15:00Z"));
    expect(team.pushed()).toEqual(["rider", "rider"]);
    expect((await team.row("rider"))?.checkin).toBe("2026-10-06");
    expect(await latestFor(RIDER.userId)).toEqual({ kind: "checkin", path: "/today" });
  });
});

describe("when a push service says no", () => {
  it("forgets a browser that has gone, and tries a busy one again", async () => {
    await team.subscribe("gone", team.RIDER);
    await team.subscribe("busy", team.RIDER2);
    team.answer((url) => (url.endsWith("gone") ? 410 : 503));
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = await runReminders(team.config, EVENING);
    errors.mockRestore();
    expect(report).toMatchObject({ gone: 1, failed: 1 });
    expect(await team.row("gone")).toBeUndefined();
    expect((await team.row("busy"))?.checkin).toBeNull();

    team.answer(() => 201);
    await runReminders(team.config, at("2026-10-06T17:15:00Z"));
    expect(team.pushed()).toEqual(["gone", "busy", "busy"]);
    expect((await team.row("busy"))?.checkin).toBe("2026-10-06");
  });
});
