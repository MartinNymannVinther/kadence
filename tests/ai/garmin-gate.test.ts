import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { withOrgContext } from "@/core/db/tenant";
import type { LlmMessage, LlmProvider } from "@/core/llm";
import { garminAiBlocked, GarminAiNotAllowed } from "@/modules/ai/garmin-gate";
import { classifyAiError, NoModel } from "@/modules/ai/service";
import { buildCoachBrief } from "@/modules/assist/coach-brief";
import { proposeFormStory } from "@/modules/assist/form-story";
import { proposeSessionComment } from "@/modules/assist/session-comment";
import { proposeWeek } from "@/modules/assist/week-draft";
import { withdrawGarminConsents } from "@/modules/consent/garmin";
import {
  giveGarminAiConsent,
  myGarminAiConsent,
  withdrawGarminAiConsent,
} from "@/modules/consent/garmin-ai";
import { adminPool } from "../helpers/db";
import { insertSql } from "../helpers/rows";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * The AI reads a rider's rides from Garmin only with the rider's own yes
 * (docs/adr/0112). Without it, the proposals built on the rider's rides —
 * the session comment on a ride from Garmin, the form story, the week
 * draft — refuse before the model is asked, and Monday's overview leaves
 * the rider out of what the model reads and names them. Only the rider's
 * own standing yes counts: not a coach's row about them, not a withdrawn
 * one, not one seen from another workspace. No test calls a real model.
 */

const spy = vi.hoisted(() => ({
  provider: null as LlmProvider | null,
  asked: [] as LlmMessage[][],
}));

vi.mock("@/modules/ai/model-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/ai/model-settings")>()),
  workspaceLlmProvider: async () => spy.provider,
  workspaceLlm: async () =>
    spy.provider ? { provider: spy.provider, billedTo: "installation" as const } : null,
}));

function fakeModel() {
  spy.provider = {
    id: "mistral",
    label: "mistral",
    model: "mistral-small-latest",
    complete: vi.fn(async (messages: LlmMessage[]) => {
      spy.asked.push(messages);
      return {
        content: '{"comment":"Fin tur.","summary":"Tal med dem først."}',
        model: "mistral-small-latest",
        usage: { inputTokens: 10, outputTokens: 10 },
        finish: "stop",
      };
    }),
    healthCheck: async () => ({ ok: true as const, detail: "" }),
  } as unknown as LlmProvider;
}

let admin: Pool;
let COACH: { orgId: string; userId: string };
let SOFIE: { orgId: string; userId: string };
let OSKAR: { orgId: string; userId: string };
let ELSEWHERE: { orgId: string; userId: string };
const TODAY = "2026-11-02";

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

async function rideOnSession(riderId: string, key: string, source: string) {
  await insert("activities", {
    org_id: COACH.orgId,
    id: `act_${key}`,
    rider_id: riderId,
    started_at: "2026-10-30T15:00:00Z",
    on_date: "2026-10-30",
    sport: "bike",
    title: "Tur",
    source,
    device_name: source === "garmin" ? "Edge 1030 Plus" : null,
    moving_seconds: 3600,
    load: 50,
    rpe: 4,
  });
  await insert("planned_sessions", {
    org_id: COACH.orgId,
    id: `ps_${key}`,
    rider_id: riderId,
    on_date: "2026-10-30",
    sport: "bike",
    title: "Rolig tur",
    planned_minutes: 60,
    planned_load: 45,
    activity_id: `act_${key}`,
  });
}

const blocked = (ctx: { orgId: string; userId: string }, ids: string[]) =>
  withOrgContext(ctx, (tx) => garminAiBlocked(tx, ids));

beforeAll(async () => {
  admin = adminPool();
  COACH = await seedWorkspace(admin, "gg_club");
  SOFIE = await seedMember(admin, COACH.orgId, "gg_sofie");
  OSKAR = await seedMember(admin, COACH.orgId, "gg_oskar");
  for (const [id, user, name] of [
    ["gg_sofie", SOFIE.userId, "Sofie Hansen"],
    ["gg_oskar", OSKAR.userId, "Oskar Lund"],
  ] as const) {
    await insert("riders", { org_id: COACH.orgId, id, user_id: user, name, birth_year: 2009 });
    // A check-in with pain raises a flag, so both riders are on Monday's list.
    await insert("checkins", { org_id: COACH.orgId, rider_id: id, on_date: "2026-11-01", pain: 3 });
  }
  await rideOnSession("gg_sofie", "gg_garmin", "garmin");
  await rideOnSession("gg_sofie", "gg_manual", "manual");
  await rideOnSession("gg_oskar", "gg_oskar", "manual");
  await insert("team_settings", { org_id: COACH.orgId, ai_on_rider_data: true });
  ELSEWHERE = await seedWorkspace(admin, "gg_elsewhere");
});

beforeEach(async () => {
  spy.provider = null;
  spy.asked = [];
  await admin.query("delete from consents where org_id = $1", [COACH.orgId]);
  await admin.query("delete from ai_calls where org_id = $1", [COACH.orgId]);
});

afterAll(async () => {
  await admin.query("delete from organizations where id = any($1)", [
    [COACH.orgId, ELSEWHERE.orgId],
  ]);
  await admin.end();
});

describe("without the rider's yes", () => {
  it("counts a rider with rides from Garmin as blocked, for the coach and for herself", async () => {
    expect(await blocked(COACH, ["gg_sofie", "gg_oskar"])).toEqual(new Set(["gg_sofie"]));
    expect(await blocked(SOFIE, ["gg_sofie"])).toEqual(new Set(["gg_sofie"]));
  });

  it("refuses a comment on a ride from Garmin before the model is asked", async () => {
    fakeModel();
    const asking = proposeSessionComment(COACH, { sessionId: "ps_gg_garmin" }, "da");
    await expect(asking).rejects.toBeInstanceOf(GarminAiNotAllowed);
    expect(spy.asked).toHaveLength(0);
    expect(classifyAiError(new GarminAiNotAllowed())).toBe("garminAi");
  });

  it("still comments on the same rider's ride that did not come from Garmin", async () => {
    fakeModel();
    const answer = await proposeSessionComment(COACH, { sessionId: "ps_gg_manual" }, "da");
    expect(answer?.proposal.comment).toBeTruthy();
    expect(spy.asked).toHaveLength(1);
  });

  it("refuses the form story and the week draft, to the coach and to the rider", async () => {
    fakeModel();
    await expect(proposeFormStory(COACH, { riderId: "gg_sofie" }, "da")).rejects.toBeInstanceOf(
      GarminAiNotAllowed,
    );
    await expect(proposeFormStory(SOFIE, { riderId: "gg_sofie" }, "da")).rejects.toBeInstanceOf(
      GarminAiNotAllowed,
    );
    await expect(
      proposeWeek(COACH, { riderId: "gg_sofie", monday: TODAY }, "da"),
    ).rejects.toBeInstanceOf(GarminAiNotAllowed);
    expect(spy.asked).toHaveLength(0);
  });

  it("lets a rider without rides from Garmin through to the model", async () => {
    // No model configured: the week draft gets past the gate and stops at the model.
    await expect(
      proposeWeek(COACH, { riderId: "gg_oskar", monday: TODAY }, "da"),
    ).rejects.toBeInstanceOf(NoModel);
  });

  it("leaves the rider out of Monday's overview for the model, and names her", async () => {
    fakeModel();
    const { proposal } = await buildCoachBrief(COACH, "da", { withSummary: true, today: TODAY });
    expect(proposal.riders.map((r) => r.riderId).sort()).toEqual(["gg_oskar", "gg_sofie"]);
    expect(proposal.leftOut).toEqual(["Sofie"]);
    const read = spy.asked[0]?.map((m) => m.content).join("\n") ?? "";
    expect(read).toContain("Oskar");
    expect(read).not.toContain("Sofie");
  });

  it("does not count a yes a coach wrote about the rider", async () => {
    await insert("consents", {
      org_id: COACH.orgId,
      user_id: COACH.userId,
      rider_id: "gg_sofie",
      kind: "garmin_ai",
      version: "2026-10",
    });
    expect(await blocked(COACH, ["gg_sofie"])).toEqual(new Set(["gg_sofie"]));
  });
});

describe("the rider's yes", () => {
  it("is the rider's alone to give", async () => {
    await expect(giveGarminAiConsent(COACH, "da")).rejects.toBeInstanceOf(Refused);
  });

  it("opens the rider's rides to the AI, once, until it is withdrawn", async () => {
    expect(await giveGarminAiConsent(SOFIE, "da")).toBe(true);
    expect(await giveGarminAiConsent(SOFIE, "da")).toBe(false);
    expect(await myGarminAiConsent(SOFIE)).toBe(true);
    expect(await blocked(COACH, ["gg_sofie"])).toEqual(new Set());

    fakeModel();
    await proposeSessionComment(COACH, { sessionId: "ps_gg_garmin" }, "da");
    const { proposal } = await buildCoachBrief(COACH, "da", { withSummary: true, today: TODAY });
    expect(proposal.leftOut).toEqual([]);
    expect(spy.asked).toHaveLength(2);
    expect(spy.asked[1]?.map((m) => m.content).join("\n")).toContain("Sofie");

    expect(await withdrawGarminAiConsent(SOFIE)).toBe(true);
    expect(await myGarminAiConsent(SOFIE)).toBe(false);
    expect(await blocked(COACH, ["gg_sofie"])).toEqual(new Set(["gg_sofie"]));
  });

  it("is withdrawn with the yes to Garmin when the rider disconnects", async () => {
    await giveGarminAiConsent(SOFIE, "da");
    await withOrgContext(SOFIE, (tx) => withdrawGarminConsents(tx, SOFIE));
    expect(await myGarminAiConsent(SOFIE)).toBe(false);
  });

  it("is told to nobody outside the rider's workspace", async () => {
    await giveGarminAiConsent(SOFIE, "da");
    const seen = await withOrgContext(ELSEWHERE, (tx) =>
      tx.execute(sql`select app_garmin_ai_riders(array['gg_sofie']::text[]) as id`),
    );
    expect(seen.rows).toEqual([]);
  });
});
