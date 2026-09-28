import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { buildCoachBrief } from "@/modules/assist/coach-brief";
import { draftFlagKinds } from "@/modules/assist/week-draft";
import { coachTips } from "@/modules/coach";
import { attentionScore, getInsights } from "@/modules/insight/service";
import { ResolveInput, resolveFlag, unresolveFlag } from "@/modules/insight/resolutions";
import { FLAG_KINDS, TRAINING_KINDS } from "@/modules/load";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A coach's "afklaret" on a guardrail flag (ADR 0026), through the
 * services and the database: the flag leaves the list for the week and
 * comes back when it gets worse, only a coach can press it, the week and
 * the severity are the server's, and the AI's brief and the tips see only
 * what is open while the week draft sees all.
 */

const ORG = "org_resolve";
const COACH = { orgId: ORG, userId: "user_resolve_coach" };
const RIDER = { orgId: ORG, userId: "user_resolve_rider" };
const PARENT = { orgId: ORG, userId: "user_resolve_parent" };

const TODAY = "2026-11-05"; // a Thursday
const MONDAY = "2026-11-02";
const NEXT = "2026-11-12";

let admin: Pool;
let app: Client;
let id: string;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const rows = () =>
  admin
    .query(
      `select id, kind, severity, seen, week_monday::text as week_monday, resolved_by
       from flag_resolutions where rider_id = 'res_r' and week_monday = $1 order by kind`,
      [MONDAY],
    )
    .then((r) => r.rows);

const insightOf = async (today: string) =>
  (await getInsights(COACH, { today })).find((i) => i.riderId === "res_r")!;
const kindsOf = (flags: { kind: string }[]) => flags.map((f) => f.kind);

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Resolve");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, ORG, PARENT.userId, "member");
  await seed("riders", { id: "res_r", user_id: RIDER.userId, name: "Lea Holm", birth_year: 2010 });
  await seed("guardians", {
    id: "g_res",
    rider_id: "res_r",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  // Pain 2 alone puts the day in the yellow zone: `pain` (warn) and
  // `wellbeing_talk` (warn) both fire; the empty week may add more.
  await seed("checkins", { rider_id: "res_r", on_date: TODAY, pain: 2 });
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("afklaret on a flag", () => {
  it("raises the flags, and afklaret takes one off the list", async () => {
    const before = await insightOf(TODAY);
    expect(kindsOf(before.flags)).toEqual(expect.arrayContaining(["pain", "wellbeing_talk"]));
    expect(before.resolved).toEqual([]);

    ({ id } = await resolveFlag(COACH, { riderId: "res_r", kind: "pain" }, TODAY));
    const after = await insightOf(TODAY);
    expect(kindsOf(after.flags)).not.toContain("pain");
    expect(kindsOf(after.flags)).toContain("wellbeing_talk");
    expect(after.resolved).toMatchObject([
      {
        flag: { kind: "pain", severity: "warn" },
        resolution: { id, severity: "warn", seen: [{ pain: 2 }] },
      },
    ]);
    expect(attentionScore(after)).toBeLessThan(attentionScore(before));
    expect(await rows()).toMatchObject([
      { id, kind: "pain", week_monday: MONDAY, resolved_by: COACH.userId },
    ]);
  });

  it("takes the week, the severity and the snapshot from the server, never the client", async () => {
    const parsed = ResolveInput.parse({
      riderId: "res_r",
      kind: "pain",
      weekMonday: "2027-01-04",
      severity: "info",
    });
    expect(Object.keys(parsed)).toEqual(["riderId", "kind"]);
    await expect(
      resolveFlag(COACH, { riderId: "res_r", kind: "ramp" }, TODAY),
    ).rejects.toMatchObject({ code: "notFound", detail: "flagGone" });
    expect(await rows()).toHaveLength(1);
  });

  it("refuses a rider, a parent, and a stranger's rider", async () => {
    await expect(
      resolveFlag(RIDER, { riderId: "res_r", kind: "pain" }, TODAY),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      resolveFlag(PARENT, { riderId: "res_r", kind: "pain" }, TODAY),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(unresolveFlag(RIDER, id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      resolveFlag(COACH, { riderId: "nope", kind: "pain" }, TODAY),
    ).rejects.toMatchObject({ code: "notFound" });
  });

  it("comes back when it gets more serious, and a re-press holds the new level", async () => {
    await seed("checkins", { rider_id: "res_r", on_date: "2026-11-06", pain: 3 });
    const worse = await insightOf("2026-11-06");
    expect(worse.flags).toContainEqual(
      expect.objectContaining({ kind: "pain", severity: "alert" }),
    );
    expect(kindsOf(worse.flags)).toContain("wellbeing_help");
    expect(worse.resolved).toEqual([]);

    const again = await resolveFlag(COACH, { riderId: "res_r", kind: "pain" }, "2026-11-06");
    expect(again.id).toBe(id);
    expect(await rows()).toMatchObject([{ id, severity: "alert", seen: [{ pain: 3 }] }]);
    expect(kindsOf((await insightOf("2026-11-06")).flags)).not.toContain("pain");

    await admin.query(`delete from checkins where rider_id = 'res_r' and on_date = '2026-11-06'`);
    // Pain 2 against a resolution that saw pain 3 is not worse: still held.
    expect(kindsOf((await insightOf(TODAY)).flags)).not.toContain("pain");
  });

  it("is undone with Fortryd", async () => {
    await unresolveFlag(COACH, id);
    const insight = await insightOf(TODAY);
    expect(kindsOf(insight.flags)).toContain("pain");
    expect(insight.resolved).toEqual([]);
    await expect(unresolveFlag(COACH, "missing")).rejects.toMatchObject({ code: "notFound" });
  });

  it("does not carry into next week", async () => {
    ({ id } = await resolveFlag(COACH, { riderId: "res_r", kind: "pain" }, TODAY));
    const next = await insightOf(NEXT);
    expect(kindsOf(next.flags)).toContain("pain");
    expect(next.resolved).toEqual([]);
  });

  it("hides from the brief and the tips, shows to the week draft, and leaves the chip", async () => {
    const tipsFor = async () =>
      coachTips({
        today: TODAY,
        riders: [],
        events: [],
        flagKinds: (await getInsights(COACH, { today: TODAY })).flatMap((i) => kindsOf(i.flags)),
        allowYouthWeight: false,
      }).map((t) => t.id);
    const briefFor = async () =>
      (await buildCoachBrief(COACH, "da", { withSummary: false, today: TODAY })).proposal.riders;

    const brief = await briefFor();
    const lea = brief.find((r) => r.riderId === "res_r")!;
    expect(kindsOf(lea.flags)).toContain("wellbeing_talk");
    expect(kindsOf(lea.flags)).not.toContain("pain");
    expect(await tipsFor()).toContain("wellbeing");

    await resolveFlag(COACH, { riderId: "res_r", kind: "wellbeing_talk" }, TODAY);
    for (const r of await briefFor()) {
      expect(kindsOf(r.flags)).not.toContain("pain");
      expect(kindsOf(r.flags)).not.toContain("wellbeing_talk");
    }
    expect(await tipsFor()).not.toContain("wellbeing");
    const insight = await insightOf(TODAY);
    expect(draftFlagKinds(insight)).toEqual(expect.arrayContaining(["pain", "wellbeing_talk"]));
    expect(kindsOf(insight.flags)).not.toContain("wellbeing_talk");
    expect(insight.wellbeing?.action).toBe("talk");
  });

  it("only keys a week on a Monday", async () => {
    const q = insertSql("flag_resolutions", {
      org_id: ORG,
      rider_id: "res_r",
      kind: "ramp",
      severity: "warn",
      week_monday: "2026-11-03",
    });
    expect(await expectSqlError(admin.query(q.text, q.values))).toBe("23514");
  });

  it("fits every kind the rules know, and a parent reads only the training ones", async () => {
    const WEEK = "2026-10-26";
    for (const kind of FLAG_KINDS)
      await seed("flag_resolutions", {
        rider_id: "res_r",
        kind,
        severity: "info",
        week_monday: WEEK,
      });
    const kindsAs = (ctx: typeof COACH) =>
      asApp(app, ctx, (c) =>
        c.query(`select kind from flag_resolutions where week_monday = $1`, [WEEK]),
      ).then((r) => r.rows.map((x) => x.kind as string).sort());

    expect(await kindsAs(PARENT)).toEqual([...TRAINING_KINDS].sort());
    await admin.query(`update riders set share_wellbeing = true where id = 'res_r'`);
    expect(await kindsAs(PARENT)).toEqual([...FLAG_KINDS].sort());
    await admin.query(`update riders set share_wellbeing = false where id = 'res_r'`);
    expect(await kindsAs(COACH)).toEqual([...FLAG_KINDS].sort());
    expect(await kindsAs(RIDER)).toEqual([...FLAG_KINDS].sort());
    await admin.query(`delete from flag_resolutions where week_monday = $1`, [WEEK]);
  });
});
