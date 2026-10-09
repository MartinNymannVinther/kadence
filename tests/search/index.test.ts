import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Søg's index under RLS (ADR 0011): what the palette may find beyond the
 * menu, read as each person through the server action and the service
 * behind it. A coach finds every rider on the team and the library; a
 * rider only themselves; a parent only the children who have confirmed
 * the link and share their training, and no library, as their menu has
 * none. Nobody finds another team's riders or sessions, an archived
 * rider or template, or a rider's own sessions.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { searchIndexAction } = await import("@/modules/search/actions");
const { searchIndex } = await import("@/modules/search/service");

const ORG = "org_search";
const COACH = { orgId: ORG, userId: "user_search_coach" };
const EMMA = { orgId: ORG, userId: "user_search_emma" };
const OSKAR = { orgId: ORG, userId: "user_search_oskar" };
const MOR = { orgId: ORG, userId: "user_search_mor" };
const WAITING = { orgId: ORG, userId: "user_search_waiting" };
const MEMBER = { orgId: ORG, userId: "user_search_member" };
const ELSEWHERE = { orgId: "org_search_other", userId: "user_search_elsewhere" };

const structure = { kind: "bike", steps: [] };

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [EMMA, OSKAR, MOR, WAITING, MEMBER])
    await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, ELSEWHERE.orgId, ELSEWHERE.userId, "owner");

  const rider = (id: string, name: string, extra: Record<string, unknown> = {}) =>
    insert("riders", { org_id: ORG, id, name, birth_year: 2009, ...extra });
  await rider("srch_emma", "Emma Holm", { user_id: EMMA.userId });
  await rider("srch_oskar", "Oskar Lund", { user_id: OSKAR.userId });
  await rider("srch_lukket", "Lukas Lukket", { share_training: false });
  await rider("srch_gammel", "Gammel Rytter", { archived: true });
  await insert("riders", {
    org_id: ELSEWHERE.orgId,
    id: "srch_fremmed",
    name: "Fremmed Rytter",
    birth_year: 2009,
  });

  const guardian = (id: string, riderId: string, userId: string, confirmed: boolean) =>
    insert("guardians", {
      org_id: ORG,
      id,
      rider_id: riderId,
      user_id: userId,
      name: "Forælder",
      ...(confirmed ? { confirmed_at: new Date() } : {}),
    });
  await guardian("srch_g_emma", "srch_emma", MOR.userId, true);
  await guardian("srch_g_lukket", "srch_lukket", MOR.userId, true);
  await guardian("srch_g_oskar", "srch_oskar", WAITING.userId, false);

  const template = (id: string, name: string, extra: Record<string, unknown> = {}) =>
    insert("workout_templates", {
      org_id: ORG,
      id,
      name,
      sport: "bike",
      structure,
      planned_minutes: 75,
      ...extra,
    });
  await template("srch_tempo", "Tempo");
  await template("srch_styrke", "Styrke for U19", {
    sport: "strength",
    planned_minutes: 45,
    source: "dcu",
  });
  await template("srch_arkiv", "Gammelt pas", { archived: true });
  await template("srch_eget", "Emmas bakker", { rider_id: "srch_emma" });
  await insert("workout_templates", {
    org_id: ELSEWHERE.orgId,
    id: "srch_fremmed_pas",
    name: "Fremmed pas",
    sport: "bike",
    structure,
  });
});

afterAll(async () => {
  await admin?.end();
});

const LIBRARY = [
  { id: "srch_tempo", name: "Tempo", sport: "bike", plannedMinutes: 75 },
  { id: "srch_styrke", name: "Styrke for U19", sport: "strength", plannedMinutes: 45 },
];

const names = (index: { riders: Array<{ name: string }> }) => index.riders.map((r) => r.name);

describe("what Søg can find, as each person", () => {
  it("a coach finds every rider on the team and the library", async () => {
    const index = await searchIndex(COACH);
    expect(names(index)).toEqual(["Emma Holm", "Lukas Lukket", "Oskar Lund"]);
    expect(index.templates).toEqual(LIBRARY);
  });

  it("a rider finds only themselves, and the library", async () => {
    const index = await searchIndex(EMMA);
    expect(index.riders).toEqual([{ id: "srch_emma", name: "Emma Holm" }]);
    expect(index.templates).toEqual(LIBRARY);
  });

  it("a parent finds only a confirmed child who shares their training, and no library", async () => {
    const index = await searchIndex(MOR);
    expect(index.riders).toEqual([{ id: "srch_emma", name: "Emma Holm" }]);
    expect(index.templates).toEqual([]);
  });

  it("a parent whose link is not confirmed yet finds no rider", async () => {
    const index = await searchIndex(WAITING);
    expect(index).toEqual({ riders: [], templates: [] });
  });

  it("a member who is neither coach, rider nor parent finds nothing beyond the menu", async () => {
    expect(await searchIndex(MEMBER)).toEqual({ riders: [], templates: [] });
  });

  it("another team's coach finds only their own team", async () => {
    const index = await searchIndex(ELSEWHERE);
    expect(names(index)).toEqual(["Fremmed Rytter"]);
    expect(index.templates.map((t) => t.name)).toEqual(["Fremmed pas"]);
  });

  it("holds names and the few fields a row shows, nothing more", async () => {
    const index = await searchIndex(COACH);
    for (const rider of index.riders) expect(Object.keys(rider).sort()).toEqual(["id", "name"]);
    for (const template of index.templates)
      expect(Object.keys(template).sort()).toEqual(["id", "name", "plannedMinutes", "sport"]);
  });

  it("refuses someone who is not on the team", async () => {
    await expect(searchIndex({ orgId: ORG, userId: ELSEWHERE.userId })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("the server action", () => {
  it("answers as the signed-in person, with the same index", async () => {
    auth.session = COACH;
    const result = await searchIndexAction({});
    expect(result).toEqual({ ok: true, data: await searchIndex(COACH) });
    auth.session = MOR;
    const mine = await searchIndexAction({});
    expect(mine.ok && mine.data.riders.map((r) => r.id)).toEqual(["srch_emma"]);
  });

  it("takes nothing from the browser: anything sent along is refused", async () => {
    auth.session = COACH;
    expect(await searchIndexAction({ orgId: ELSEWHERE.orgId })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await searchIndexAction(null)).toEqual({ ok: false, error: "invalid" });
  });

  it("answers nobody without a session", async () => {
    auth.session = null;
    expect(await searchIndexAction({})).toEqual({ ok: false, error: "unauthorized" });
  });
});
