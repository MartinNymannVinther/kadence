import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { runReminders } from "@/modules/push/job";
import { latestFor } from "@/modules/push/latest";
import { adminPool } from "../helpers/db";
import { at, MORNING, NOON, pushTeam } from "./push-team";

/**
 * What the reminder run tells besides the check-in (docs/adr/0059): a new
 * comment to everyone who can read the thread but its writer — a coach
 * hears riders and parents, not the other coaches — a session the coach
 * laid in the rider's next seven days, and the parents' week on Sunday
 * evening, each only when the person chose it. What the service worker
 * then shows is read back as the person (`latestFor`).
 */

let admin: Pool;
let team: ReturnType<typeof pushTeam>;

beforeAll(async () => {
  admin = adminPool();
  team = pushTeam(admin, "pn");
  await team.seed();
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

describe("comments", () => {
  it("reach everyone who can read the thread but the writer; a coach hears riders, not coaches", async () => {
    const { RIDER, RIDER2, COACH, COACH2, PARENT } = team;
    for (const [name, who] of [
      ["rider", RIDER],
      ["rider2", RIDER2],
      ["coach", COACH],
      ["coach2", COACH2],
      ["parent", PARENT],
    ] as const)
      await team.subscribe(name, who);
    const first = team.riders.first;
    await team.session("s_pn", first, "2026-10-06", COACH.userId, MORNING);
    await team.comment("c_rider", "s_pn", first, RIDER.userId, at("2026-10-06T09:00:00Z"));
    await runReminders(team.config, NOON);
    expect(team.pushed().sort()).toEqual(["coach", "coach2", "parent"]);

    team.calls.length = 0;
    await team.comment("c_coach2", "s_pn", first, COACH2.userId, at("2026-10-06T10:05:00Z"));
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed().sort()).toEqual(["parent", "rider"]);
    expect(await latestFor(PARENT.userId)).toEqual({
      kind: "comment",
      title: "Pas s_pn",
      author: COACH2.userId,
      path: "/calendar/session/s_pn",
    });
  });

  it("respect what the person chose", async () => {
    await team.subscribe("parent", team.PARENT, { kinds: ["week"] });
    await team.session("s_pn", team.riders.first, "2026-10-06", team.COACH.userId, MORNING);
    await team.comment(
      "c_coach",
      "s_pn",
      team.riders.first,
      team.COACH.userId,
      at("2026-10-06T09:00:00Z"),
    );
    await runReminders(team.config, NOON);
    expect(team.pushed()).toEqual([]);
  });
});

describe("the plan", () => {
  it("tells a rider about a session the coach laid in the next seven days, and only that", async () => {
    const { RIDER, COACH } = team;
    const first = team.riders.first;
    await team.subscribe("rider", RIDER, { kinds: ["plan"] });
    await team.session("s_own", first, "2026-10-08", RIDER.userId, at("2026-10-06T09:00:00Z"));
    await team.session("s_far", first, "2026-10-20", COACH.userId, at("2026-10-06T09:00:00Z"));
    await runReminders(team.config, NOON);
    expect(team.pushed()).toEqual([]);

    await team.session("s_near", first, "2026-10-08", COACH.userId, at("2026-10-06T10:05:00Z"));
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed()).toEqual(["rider"]);
    expect(await latestFor(RIDER.userId)).toEqual({ kind: "plan", path: "/calendar" });
  });
});

describe("the parents' week", () => {
  it("goes on Sunday evening with the child's name", async () => {
    await team.subscribe("parent", team.PARENT, { toldUpTo: at("2026-11-01T06:00:00Z") });
    await runReminders(team.config, at("2026-11-01T16:30:00Z")); // 17.30
    expect(team.pushed()).toEqual([]);
    await runReminders(team.config, at("2026-11-01T17:30:00Z")); // 18.30
    expect(team.pushed()).toEqual(["parent"]);
    expect((await team.row("parent"))?.week).toBe("2026-10-26");
    expect(await latestFor(team.PARENT.userId)).toEqual({
      kind: "week",
      children: ["Emma Holm"],
      path: "/parents",
    });
  });
});
