import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { LlmMessage, LlmProvider } from "@/core/llm";
import { proposeGroupWeek, readGroupWeek } from "@/modules/assist/group-week";
import { adminPool } from "../helpers/db";
import { insertSql } from "../helpers/rows";
import { seedWorkspace } from "../helpers/workspace";

/**
 * "Foreslå ugen" around a race (docs/adr/0101), read from the database.
 * In a personal workspace the person's own race reaches the model as
 * kind, dates, priority and its title (docs/adr/0102) — no sick days —
 * and the proposal shows it back; in a club a rider's event stays out, as
 * before. The race day holds the race itself, named as the calendar names
 * it, and nothing else, whatever the model answers (docs/adr/0103). No
 * test calls a real model: a fake one answers.
 */

const spy = vi.hoisted(() => ({
  provider: null as LlmProvider | null,
  asked: [] as LlmMessage[][],
  answer: "{}",
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
        content: spy.answer,
        model: "mistral-small-latest",
        usage: { inputTokens: 10, outputTokens: 10 },
        finish: "stop",
      };
    }),
    healthCheck: async () => ({ ok: true as const, detail: "" }),
  } as unknown as LlmProvider;
}

const MONDAY = "2026-10-19";
const SATURDAY = "2026-10-24";

/**
 * What the model might answer: an opener on Friday, and on the race day
 * the race, a warm-up as a session of its own and a strength session.
 */
const ANSWER = JSON.stringify({
  sessions: [
    { date: "2026-10-19", sport: "bike", title: "Let grundtur", minutes: 60, workout: "1 t Z2" },
    {
      date: "2026-10-23",
      sport: "bike",
      title: "Kort tur med ryk",
      minutes: 54,
      workout: "40 min Z2, 3x1 min Z5 / 2 min pause, 5 min Z1",
    },
    { date: SATURDAY, sport: "bike", title: "Opvarmning", minutes: 15, workout: "15 min Z2" },
    {
      date: SATURDAY,
      sport: "bike",
      title: "Cross",
      minutes: 70,
      workout: "15 min opvarmning, 45 min RPE 9, 10 min nedkørsel",
    },
    { date: SATURDAY, sport: "strength", title: "Styrke", minutes: 30, workout: "" },
  ],
  note: "Lørdagens cross er ugens hårde indsats.",
});

let admin: Pool;
let CLUB: { orgId: string; userId: string };
let ALONE: { orgId: string; userId: string };

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

async function event(orgId: string, values: Record<string, unknown>) {
  await insert("calendar_events", { org_id: orgId, ends_on: values.starts_on, ...values });
}

beforeAll(async () => {
  admin = adminPool();
  CLUB = await seedWorkspace(admin, "gwr_club");
  await insert("riders", { org_id: CLUB.orgId, id: "gwr_emma", name: "Emma", birth_year: 2009 });
  await event(CLUB.orgId, {
    id: "gwr_c1",
    kind: "race",
    title: "Holdets løb",
    starts_on: SATURDAY,
    priority: "A",
  });
  await event(CLUB.orgId, {
    id: "gwr_c2",
    rider_id: "gwr_emma",
    kind: "exam",
    title: "Emmas eksamen",
    starts_on: "2026-10-21",
  });

  ALONE = await seedWorkspace(admin, "gwr_alone");
  await admin.query("update organizations set kind = 'personal' where id = $1", [ALONE.orgId]);
  await insert("riders", {
    org_id: ALONE.orgId,
    id: "gwr_martin",
    user_id: ALONE.userId,
    name: "Martin",
    birth_year: 1980,
    training_profile: "motionist",
  });
  await event(ALONE.orgId, {
    id: "gwr_a1",
    rider_id: "gwr_martin",
    kind: "race",
    title: "Løb i Hillerød",
    starts_on: SATURDAY,
  });
  await event(ALONE.orgId, {
    id: "gwr_a2",
    rider_id: "gwr_martin",
    kind: "ill",
    title: "Forkølet",
    starts_on: "2026-10-19",
  });
});

beforeEach(() => {
  spy.provider = null;
  spy.asked = [];
  spy.answer = ANSWER;
});

afterAll(async () => {
  // The installation's overview counts personal workspaces; leave none behind.
  await admin.query("delete from organizations where id = any($1)", [[CLUB.orgId, ALONE.orgId]]);
  await admin.end();
});

describe("the calendar a group's week reads", () => {
  it("in a personal workspace: the person's own race with its title, and no sick days", async () => {
    const { events } = await readGroupWeek(ALONE, MONDAY);
    expect(events.prompt).toEqual([
      { kind: "race", title: "Løb i Hillerød", from: SATURDAY, to: SATURDAY, priority: null },
    ]);
    expect(events.shown).toEqual([
      { kind: "race", title: "Løb i Hillerød", from: SATURDAY, to: SATURDAY },
    ]);
  });

  it("in a club: the team's own events, and no rider's", async () => {
    const { events } = await readGroupWeek(CLUB, MONDAY);
    expect(events.prompt).toEqual([
      { kind: "race", title: "Holdets løb", from: SATURDAY, to: SATURDAY, priority: "A" },
    ]);
  });
});

describe("the proposal around a race", () => {
  it("sends the race, keeps the race as the race day's one session and shows it", async () => {
    fakeModel();
    const { proposal } = await proposeGroupWeek(
      ALONE,
      { monday: MONDAY, basis: "senior-motionist", text: "Jeg kører løb lørdag d. 24" },
      "da",
    );
    const sent = spy.asked[0]!.map((m) => m.content).join("\n");
    expect(sent).toContain(
      `{"kind":"race","title":"Løb i Hillerød","from":"${SATURDAY}","to":"${SATURDAY}","priority":null}`,
    );
    expect(sent).toContain("A race or event day holds one session, the race or event itself");
    expect(sent).toContain('Title the opener "Kort tur med ryk".');
    expect(sent).toContain("the race or event is still the week's hard effort");
    expect(sent).not.toContain("Forkølet");
    expect(sent).not.toContain('"ill"');
    expect(proposal.sessions.map((s) => [s.date, s.title, s.minutes])).toEqual([
      ["2026-10-19", "Let grundtur", 60],
      ["2026-10-23", "Kort tur med ryk", 54],
      [SATURDAY, "Løb i Hillerød", 70],
    ]);
    expect(proposal.events.map((e) => e.title)).toEqual(["Løb i Hillerød"]);
    expect(proposal.note).toBe("Lørdagens cross er ugens hårde indsats.");
  });

  it("keeps a club's rider's exam out of what the model reads", async () => {
    fakeModel();
    const { proposal } = await proposeGroupWeek(
      CLUB,
      { monday: MONDAY, basis: "U19-1", text: "" },
      "da",
    );
    const sent = spy.asked[0]!.map((m) => m.content).join("\n");
    expect(sent).toContain("Holdets løb");
    expect(sent).not.toContain("Emmas eksamen");
    expect(proposal.sessions.filter((s) => s.date === SATURDAY).map((s) => s.title)).toEqual([
      "Holdets løb",
    ]);
  });
});
