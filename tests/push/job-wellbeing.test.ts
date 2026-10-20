import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { withOrgContext } from "@/core/db/tenant";
import { isRedCheckin, type Checkin } from "@/modules/load/wellbeing";
import { copenhagenClock } from "@/modules/push/due";
import { runReminders } from "@/modules/push/job";
import { latestFor } from "@/modules/push/latest";
import { newestRedCheckin } from "@/modules/push/wellbeing";
import { saveCheckin, type CheckinInputT } from "@/modules/wellbeing/checkins";
import { adminPool } from "../helpers/db";
import { at, MORNING, NOON, pushTeam } from "./push-team";

/**
 * A coach hears when a rider on the team checks in in the red zone
 * (docs/adr/0060, P1-02): once per rider per day, through the quiet
 * hours, decided as the coach under the ordinary policies, and told
 * without a name or an answer. Riders and parents never get it, and a
 * coach on another team hears nothing. The push services are a stand-in;
 * the suite never reaches the network.
 */

let admin: Pool;
let team: ReturnType<typeof pushTeam>;
const WELLBEING = { kinds: ["comment", "wellbeing"] };
const ATTENTION = { kind: "wellbeing", path: "/calendar#opmaerksomhed" };

beforeAll(async () => {
  admin = adminPool();
  team = pushTeam(admin, "pw");
  await team.seed();
  // The second coach rides on the team as well.
  await team.insert("riders", {
    id: "r_pw_coach2",
    org_id: team.ORG,
    user_id: team.COACH2.userId,
    name: "Ida Træner",
    birth_year: 1990,
  });
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

let checkins = 0;
/**
 * A check-in saved at `when`: red with pain 3 unless the answers say
 * otherwise, with `red_since` as the check-in service writes it.
 */
async function checkin(riderId: string, when: Date, answers: Partial<Checkin> = {}) {
  checkins += 1;
  const id = `ck_pw_${checkins}`;
  const values = { energy: 3, pain: 3, ill: 0, ...answers };
  await team.insert("checkins", {
    id,
    org_id: team.ORG,
    rider_id: riderId,
    on_date: "2026-10-06",
    created_at: when,
    updated_at: when,
    red_since: isRedCheckin(values) ? when : null,
    ...values,
  });
  return id;
}

describe("a rider in the red zone", () => {
  it("is told to the team's coaches, once per rider per day, and to nobody else", async () => {
    const { COACH, COACH2, PARENT, RIDER, RIDER2 } = team;
    await team.subscribe("coach", COACH, WELLBEING);
    await team.subscribe("coach2", COACH2, WELLBEING);
    // Written past the reminders card, which never offers it to them.
    await team.subscribe("parent", PARENT, { kinds: ["comment", "week", "wellbeing"] });
    await team.subscribe("rider", RIDER, { kinds: ["checkin", "wellbeing"] });
    await team.subscribe("rider2", RIDER2, { kinds: ["wellbeing"] });
    await team.subscribe("coach_b", { orgId: team.ORG_B, userId: "user_pw_coach_b" }, WELLBEING);

    const first = await checkin(team.riders.first, at("2026-10-06T09:55:00Z"));
    await runReminders(team.config, NOON);
    expect(team.pushed().sort()).toEqual(["coach", "coach2"]);
    expect(await latestFor(COACH.userId)).toEqual(ATTENTION);
    expect(await latestFor(PARENT.userId)).toBeNull();

    // Saved again, still red: the same check-in, not news.
    await admin.query("update checkins set note = 'Knæet', updated_at = $1 where id = $2", [
      at("2026-10-06T10:05:00Z"),
      first,
    ]);
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed()).toHaveLength(2);

    // Another rider, at the bottom of the mood scale.
    await checkin(team.riders.second, at("2026-10-06T10:12:00Z"), { pain: 0, mood: 1 });
    await runReminders(team.config, at("2026-10-06T10:20:00Z"));
    expect(team.pushed().sort()).toEqual(["coach", "coach", "coach2", "coach2"]);
  });

  it("goes in the quiet hours; news written since waits for the morning", async () => {
    const { COACH, RIDER } = team;
    await team.subscribe("coach", COACH, WELLBEING);
    await checkin(team.riders.second, at("2026-10-06T20:50:00Z")); // 22.50
    await team.session("s_pw", team.riders.first, "2026-10-07", COACH.userId, MORNING);
    await team.comment("c_pw", "s_pw", team.riders.first, RIDER.userId, at("2026-10-06T20:55:00Z"));

    const night = await runReminders(team.config, at("2026-10-06T21:00:00Z"));
    expect(night.quiet).toBe(true);
    expect(team.pushed()).toEqual(["coach"]);
    expect((await team.row("coach"))?.told_up_to.getTime()).toBe(
      at("2026-10-06T20:50:00Z").getTime(),
    );
    await runReminders(team.config, at("2026-10-06T21:10:00Z"));
    expect(team.pushed()).toEqual(["coach"]);

    await runReminders(team.config, at("2026-10-07T05:05:00Z")); // 7.05
    expect(team.pushed()).toEqual(["coach", "coach"]);
    expect(await latestFor(COACH.userId)).toMatchObject({
      kind: "comment",
      path: "/calendar/session/s_pw",
    });
  });

  it("is not told for a green check-in, the coach's own, or a rider no longer on the team", async () => {
    const { COACH, COACH2 } = team;
    await team.subscribe("coach", COACH, WELLBEING);
    await team.subscribe("coach2", COACH2, WELLBEING);
    await checkin(team.riders.first, at("2026-10-06T09:00:00Z"), { pain: 1, energy: 4 });
    await runReminders(team.config, NOON);
    expect(team.pushed()).toEqual([]);

    await checkin("r_pw_coach2", at("2026-10-06T10:01:00Z"), { ill: 1, pain: 0 });
    await runReminders(team.config, at("2026-10-06T10:05:00Z"));
    expect(team.pushed()).toEqual(["coach"]);

    await admin.query("update riders set archived = true where id = $1", [team.riders.second]);
    try {
      await checkin(team.riders.second, at("2026-10-06T10:20:00Z"));
      await runReminders(team.config, at("2026-10-06T10:25:00Z"));
      expect(team.pushed()).toEqual(["coach"]);
    } finally {
      await admin.query("update riders set archived = false where id = $1", [team.riders.second]);
    }
  });

  it("is tried again when the push service is busy", async () => {
    await team.subscribe("coach", team.COACH, WELLBEING);
    await checkin(team.riders.first, at("2026-10-06T09:55:00Z"));
    team.answer(() => 503);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = await runReminders(team.config, NOON);
    errors.mockRestore();
    expect(report.failed).toBe(1);
    expect((await team.row("coach"))?.told_up_to.getTime()).toBe(MORNING.getTime());

    team.answer(() => 201);
    await runReminders(team.config, at("2026-10-06T10:10:00Z"));
    expect(team.pushed()).toEqual(["coach", "coach"]);
    expect(await latestFor(team.COACH.userId)).toEqual(ATTENTION);
  });
});

describe("a check-in that turns red later in the day", () => {
  it("is told once, though another reminder went to the coach in between", async () => {
    const { COACH, RIDER } = team;
    await team.subscribe("coach", COACH, WELLBEING);
    const id = await checkin(team.riders.first, at("2026-10-06T09:00:00Z"), { pain: 0 });
    await team.session("s_pw_later", team.riders.first, "2026-10-07", COACH.userId, MORNING);
    await team.comment(
      "c_pw_later",
      "s_pw_later",
      team.riders.first,
      RIDER.userId,
      at("2026-10-06T09:10:00Z"),
    );
    await runReminders(team.config, at("2026-10-06T09:20:00Z"));
    expect(await latestFor(COACH.userId)).toMatchObject({ kind: "comment" });

    // Changed to red after the comment was told; first saved before it.
    const red = at("2026-10-06T09:30:00Z");
    await admin.query(
      "update checkins set pain = 3, red_since = $1, updated_at = $1 where id = $2",
      [red, id],
    );
    await runReminders(team.config, at("2026-10-06T09:40:00Z"));
    expect(team.pushed()).toEqual(["coach", "coach"]);
    expect((await team.row("coach"))?.told_up_to.getTime()).toBe(red.getTime());
    expect(await latestFor(COACH.userId)).toEqual(ATTENTION);

    await runReminders(team.config, at("2026-10-06T09:50:00Z"));
    expect(team.pushed()).toHaveLength(2);
  });

  it("is told through the check-in service, and saving it red again tells nothing", async () => {
    const { COACH, RIDER, RIDER2 } = team;
    // Real time: the service stamps red_since with the database's clock.
    const soon = () => new Date(Date.now() + 2000);
    const today = copenhagenClock(new Date()).date;
    const save = (who: typeof RIDER, riderId: string, answers: Partial<CheckinInputT>) =>
      saveCheckin(who, {
        riderId,
        onDate: today,
        sleepHours: 8,
        sleepQuality: 4,
        energy: 4,
        mood: 4,
        soreness: 4,
        stress: 4,
        pain: 0,
        painWhere: "",
        ill: 0,
        note: "",
        ...answers,
      });
    await team.subscribe("coach", COACH, { ...WELLBEING, toldUpTo: new Date(Date.now() - 60_000) });

    await save(RIDER, team.riders.first, {});
    await runReminders(team.config, soon());
    expect(team.pushed()).toEqual([]);

    // Another rider in the red zone: told, and the mark moves past the first save.
    await save(RIDER2, team.riders.second, { ill: 1 });
    await runReminders(team.config, soon());
    expect(team.pushed()).toEqual(["coach"]);

    // The first rider changes the green check-in to red.
    await save(RIDER, team.riders.first, { pain: 3, painWhere: "Knæ" });
    await runReminders(team.config, soon());
    expect(team.pushed()).toEqual(["coach", "coach"]);
    expect(await latestFor(COACH.userId, soon())).toEqual(ATTENTION);

    // Saved again, still red: the same moment, not news.
    await save(RIDER, team.riders.first, { pain: 3, painWhere: "Knæ og hofte" });
    await runReminders(team.config, soon());
    expect(team.pushed()).toHaveLength(2);
  });
});

describe("another team's coach", () => {
  it("reads no check-in here, even with a context naming this team and a coach's role", async () => {
    await checkin(team.riders.first, at("2026-10-06T09:55:00Z"));
    const stranger = { orgId: team.ORG, userId: "user_pw_coach_b" };
    const forged = { role: "owner" as const, isCoach: true, rider: null, children: [] };
    const seen = await withOrgContext(stranger, (tx) =>
      newestRedCheckin(tx, stranger, forged, "2026-10-06"),
    );
    expect(seen).toBeNull();
    // The team's own coach, the same way, sees it.
    const own = await withOrgContext(team.COACH, (tx) =>
      newestRedCheckin(tx, team.COACH, forged, "2026-10-06"),
    );
    expect(own?.toISOString()).toBe("2026-10-06T09:55:00.000Z");
  });
});
