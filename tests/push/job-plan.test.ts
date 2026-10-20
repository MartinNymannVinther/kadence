import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { runReminders } from "@/modules/push/job";
import { latestFor } from "@/modules/push/latest";
import { adminPool } from "../helpers/db";
import { at, MORNING, NOON, pushTeam } from "./push-team";

/**
 * "Planen er ændret" is about somebody else's change (docs/adr/0060,
 * backlog P2-12): a session in the rider's next seven days that somebody
 * other than the rider laid, changed or deleted. Who last wrote a session
 * is `updated_by`, stamped by the database; a deleted one is read from
 * `planned_session_deletions`, which each run sweeps after seven days.
 * The push services are a stand-in; the suite never reaches the network.
 */

let admin: Pool;
let team: ReturnType<typeof pushTeam>;
const PLAN = { kinds: ["plan"] };
const NOTE = { kind: "plan", path: "/calendar" };

beforeAll(async () => {
  admin = adminPool();
  team = pushTeam(admin, "pp");
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

/** A change written as `who`, at `when`, as the database stamps it. */
async function change(sessionId: string, who: string, when: Date) {
  await admin.query(
    "update planned_sessions set title = title || '.', updated_by = $1, updated_at = $2 where id = $3",
    [who, when, sessionId],
  );
}

describe("a change to a session", () => {
  it("is told when somebody else made it, to a session the rider laid", async () => {
    const { RIDER, COACH } = team;
    await team.subscribe("rider", RIDER, PLAN);
    await team.session("s_own", team.riders.first, "2026-10-08", RIDER.userId, MORNING);
    await runReminders(team.config, NOON);
    expect(team.pushed()).toEqual([]);

    await change("s_own", COACH.userId, at("2026-10-06T10:05:00Z"));
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed()).toEqual(["rider"]);
    expect(await latestFor(RIDER.userId)).toEqual(NOTE);
  });

  it("is not told when the rider made it, to a session the coach laid", async () => {
    const { RIDER, COACH } = team;
    await team.subscribe("rider", RIDER, PLAN);
    const laid = at("2026-10-06T08:00:00Z");
    await team.session("s_coach", team.riders.first, "2026-10-08", COACH.userId, laid);
    await runReminders(team.config, at("2026-10-06T09:00:00Z"));
    expect(team.pushed()).toEqual(["rider"]);

    await change("s_coach", RIDER.userId, at("2026-10-06T10:05:00Z"));
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed()).toEqual(["rider"]);
  });
});

describe("a deleted session", () => {
  // A deletion is swept by the database's own clock once it is seven days
  // old (drizzle/0037), so these runs are dated from today rather than from
  // the fixed week the rest of the file uses: dated 6 October, they began
  // to fail on 13 October, when the sweep took the rows before the run
  // read them.
  const TODAY = new Date().toISOString().slice(0, 10);
  const day = (offset: number) => {
    const d = new Date(`${TODAY}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const on = (offset: number, time: string) => at(`${day(offset)}T${time}Z`);

  it("is told when somebody else deleted it in the next seven days, and only then", async () => {
    const { RIDER, COACH } = team;
    const first = team.riders.first;
    await team.subscribe("rider", RIDER, PLAN);
    await team.deletion(first, day(2), RIDER.userId, on(0, "09:00:00"));
    await team.deletion(first, day(14), COACH.userId, on(0, "09:00:00"));
    await team.deletion(team.riders.second, day(2), COACH.userId, on(0, "09:00:00"));
    await runReminders(team.config, on(0, "10:00:00"));
    expect(team.pushed()).toEqual([]);

    await team.deletion(first, day(6), COACH.userId, on(0, "10:05:00"));
    await runReminders(team.config, on(0, "10:10:00"));
    expect(team.pushed()).toEqual(["rider"]);
    expect(await latestFor(RIDER.userId)).toEqual(NOTE);

    // Told once.
    await runReminders(team.config, on(0, "10:20:00"));
    expect(team.pushed()).toEqual(["rider"]);
  });

  it("waits through the quiet hours like any other change", async () => {
    const { RIDER, COACH } = team;
    await team.subscribe("rider", RIDER, PLAN);
    // Deleted late in the evening for the seventh day after; by the morning
    // it is in the week. 21.00 and 06.10 UTC are inside and just outside the
    // quiet hours (21.30–7.00 in Copenhagen) in summer and in winter time.
    await team.deletion(team.riders.first, day(7), COACH.userId, on(0, "21:00:00"));
    await runReminders(team.config, on(0, "21:10:00"));
    expect(team.pushed()).toEqual([]);
    await runReminders(team.config, on(1, "06:10:00")); // 8.10 or 7.10
    expect(team.pushed()).toEqual(["rider"]);
  });

  it("is swept by the run once it is seven days old", async () => {
    const { COACH } = team;
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recent = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await team.deletion(team.riders.first, "2026-10-08", COACH.userId, old);
    await team.deletion(team.riders.first, "2026-10-09", COACH.userId, recent);
    await runReminders(team.config, NOON);
    const left = await admin.query(
      "select on_date::text as day from planned_session_deletions where org_id = $1",
      [team.ORG],
    );
    expect(left.rows).toEqual([{ day: "2026-10-09" }]);
  });
});
