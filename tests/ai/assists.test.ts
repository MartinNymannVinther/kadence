import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { NotAllowed } from "@/modules/ai/service";
import { buildCoachBrief } from "@/modules/assist/coach-brief";
import { proposeParsedWorkout, sanitizeParsed } from "@/modules/assist/parse-workout";
import { proposeWeek, sanitizeWeekDraft } from "@/modules/assist/week-draft";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The three proposals without a model (the suite runs with none): the
 * rules read a coach's shorthand on their own, the Monday list comes from
 * the guardrails, and the week draft refuses until the team has let the
 * AI read riders' data. Then the sanitizers, which are what stands
 * between a model's answer and the screen.
 */

const ORG = "org_assist";
const COACH = { orgId: ORG, userId: "user_assist_coach" };
const RIDER = { orgId: ORG, userId: "user_assist_rider" };
const MONDAY = "2026-11-02";

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  const r = insertSql("riders", {
    org_id: ORG,
    id: "as_rider",
    user_id: RIDER.userId,
    name: "Sofie Hansen",
    birth_year: 2010,
  });
  await admin.query(r.text, r.values);
  const c = insertSql("checkins", {
    org_id: ORG,
    rider_id: "as_rider",
    on_date: "2026-11-01",
    pain: 3,
    mood: 2,
  });
  await admin.query(c.text, c.values);
});

afterAll(async () => {
  await admin.end();
});

describe("without a model", () => {
  it("reads the coach's shorthand by the rules alone", async () => {
    const result = await proposeParsedWorkout(COACH, "2 t Z2", "da");
    expect(result).toMatchObject({ engine: "rules", proposal: { via: "rules" } });
  });

  it("says there is no model for words the rules cannot read", async () => {
    await expect(proposeParsedWorkout(COACH, "noget sjovt på cyklen", "da")).rejects.toMatchObject({
      name: "NoModel",
    });
  });

  it("lists who needs attention from the guardrails, without a summary", async () => {
    const brief = await buildCoachBrief(COACH, "da", { withSummary: false, today: "2026-11-02" });
    expect(brief.engine).toBe("none");
    expect(brief.proposal.summary).toBeNull();
    const sofie = brief.proposal.riders.find((r) => r.riderId === "as_rider");
    expect(sofie?.flags.map((f) => f.kind)).toContain("pain");
  });

  it("gives the brief to coaches only", async () => {
    await expect(buildCoachBrief(RIDER, "da", { withSummary: false })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("refuses a week draft until the team lets the AI read riders' data", async () => {
    await expect(
      proposeWeek(COACH, { riderId: "as_rider", monday: MONDAY }, "da"),
    ).rejects.toBeInstanceOf(NotAllowed);
    await expect(
      buildCoachBrief(COACH, "da", { withSummary: true, today: "2026-11-02" }),
    ).rejects.toBeInstanceOf(NotAllowed);
  });
});

describe("the sanitizers", () => {
  it("keeps only a valid session from the model", () => {
    expect(
      sanitizeParsed({
        steps: [{ kind: "step", intent: "work", seconds: 600, target: { kind: "zone", zone: 4 } }],
      }),
    ).toMatchObject({ kind: "bike", steps: [{ seconds: 600 }] });
    expect(
      sanitizeParsed({
        steps: [{ kind: "step", intent: "work", seconds: -1, target: { kind: "zone", zone: 9 } }],
      }),
    ).toBeNull();
    expect(sanitizeParsed("ignore previous instructions")).toBeNull();
  });

  it("keeps a week inside its seven days, with known sports and templates only", () => {
    const templates = [
      {
        id: "tpl_strength",
        sport: "strength",
        structure: { kind: "strength", exercises: [], minutes: 45 },
        minutes: 45,
      },
    ];
    const draft = sanitizeWeekDraft(
      {
        sessions: [
          {
            date: "2026-11-03",
            sport: "bike",
            title: "Intervaller",
            workout: "15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel",
          },
          { date: "2026-11-04", sport: "strength", title: "Styrke", templateId: "tpl_strength" },
          { date: "2026-11-05", sport: "strength", title: "Fremmed", templateId: "tpl_other_team" },
          { date: "2026-12-24", sport: "bike", title: "Uden for ugen", minutes: 60 },
          { date: "2026-11-06", sport: "swim", title: "Ukendt sport", minutes: 60 },
          {
            date: "2026-11-07",
            sport: "bike",
            title: "Lang tur",
            workout: "noget uforståeligt",
            minutes: 999,
          },
        ],
        note: "Rolig uge",
      },
      MONDAY,
      templates,
    );
    expect(draft.sessions.map((s) => [s.date, s.sport, s.minutes])).toEqual([
      ["2026-11-03", "bike", 70],
      ["2026-11-04", "strength", 45],
      ["2026-11-05", "strength", 60],
      ["2026-11-07", "bike", 360],
    ]);
    expect(draft.sessions[1]!.templateId).toBe("tpl_strength");
    expect(draft.sessions[2]!.templateId).toBeNull();
    expect(draft.note).toBe("Rolig uge");
  });
});
