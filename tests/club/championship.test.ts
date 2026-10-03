import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { addChampion, crownChampions } from "@/modules/club/champions";
import {
  addRound,
  createChampionship,
  getChampionship,
  listChampions,
  listChampionships,
  saveRoundEntries,
} from "@/modules/club/service";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The club championship (drizzle/0022, docs/adr/0051): off until the club
 * turns it on; then everyone in the club reads it and only a coach writes
 * it; another club sees nothing; and the season's winners go on the roll
 * of honour.
 */

const ORG = "org_cm";
const COACH = { orgId: ORG, userId: "user_cm_coach" };
const ANNA = { orgId: ORG, userId: "user_cm_anna" };
const MOR = { orgId: ORG, userId: "user_cm_mor" };
const OTHER = { orgId: "org_cm_other", userId: "user_cm_other" };

let admin: Pool;
let app: Client;
let championshipId: string;
let roundId: string;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER.orgId, OTHER.userId, "owner");
  for (const [id, userId, name] of [
    ["cm_anna", ANNA.userId, "Anna"],
    ["cm_bo", null, "Bo"],
  ] as const) {
    const r = insertSql("riders", { org_id: ORG, id, user_id: userId, name, birth_year: 2010 });
    await admin.query(r.text, r.values);
  }
  const other = insertSql("riders", {
    org_id: OTHER.orgId,
    id: "cm_far",
    name: "Fjern",
    birth_year: 2010,
  });
  await admin.query(other.text, other.values);
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "cm_anna",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("the club championship", () => {
  it("is nothing until the club turns it on", async () => {
    expect(await listChampionships(COACH)).toBeNull();
    await expect(
      createChampionship(COACH, { season: 2027, title: "KM 2027" }),
    ).rejects.toMatchObject({
      code: "notFound",
    });
    const s = insertSql("team_settings", { org_id: ORG, club_championship: true });
    await admin.query(s.text, s.values);
  });

  it("a coach creates a season, a round and its results", async () => {
    championshipId = (await createChampionship(COACH, { season: 2027, title: "KM 2027" })).id;
    roundId = (
      await addRound(COACH, {
        championshipId,
        heldOn: "2027-05-01",
        kind: "tt",
        title: "Klubbens enkeltstart",
        measure: "time",
      })
    ).id;
    await saveRoundEntries(COACH, roundId, [
      {
        riderId: "cm_anna",
        name: "Anna",
        class: "U19",
        timeMs: 1_190_000,
        place: null,
        status: "finished",
      },
      {
        riderId: "cm_bo",
        name: "Bo",
        class: "U19",
        timeMs: 1_200_000,
        place: null,
        status: "finished",
      },
      {
        riderId: null,
        name: "Gæst",
        class: "open",
        timeMs: 1_250_000,
        place: null,
        status: "finished",
      },
    ]);
    const view = (await getChampionship(COACH, championshipId))!;
    expect(view.standings.U19.map((s) => [s.name, s.points])).toEqual([
      ["Anna", 10],
      ["Bo", 8],
    ]);
  });

  it("everyone in the club reads it: the rider and the parent too", async () => {
    expect((await getChampionship(ANNA, championshipId))?.standings.U19).toHaveLength(2);
    expect((await getChampionship(MOR, championshipId))?.rounds).toHaveLength(1);
  });

  it("only a coach writes it", async () => {
    await expect(
      createChampionship(ANNA, { season: 2027, title: "Min egen" }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(saveRoundEntries(ANNA, roundId, [])).rejects.toMatchObject({ code: "forbidden" });
    const write = (c: Client) =>
      c.query("update club_championships set title = 'x' where id = $1", [championshipId]);
    const rows = await asApp(app, ANNA, write);
    expect(rows.rowCount).toBe(0);
  });

  it("another club sees nothing and cannot name this club's riders", async () => {
    const count = (c: Client) =>
      c.query("select count(*)::int as n from club_championship_entries");
    expect((await asApp(app, OTHER, count)).rows[0].n).toBe(0);
    const foreign = (c: Client) =>
      c.query(
        `insert into club_championship_entries (org_id, round_id, rider_id, name, class, status)
         values ($1, $2, 'cm_far', 'Fjern', 'U19', 'finished')`,
        [ORG, roundId],
      );
    expect(await expectSqlError(asApp(app, COACH, foreign))).toBe("42501");
  });

  it("the season's winners go on the roll of honour, once", async () => {
    expect(await crownChampions(COACH, championshipId, "Klubmester")).toEqual({ crowned: 2 });
    expect(await crownChampions(COACH, championshipId, "Klubmester")).toEqual({ crowned: 0 });
    await addChampion(COACH, {
      year: 2019,
      class: "open",
      title: "Klubmester",
      name: "Ole fra før",
    });
    const roll = await listChampions(ANNA);
    expect(roll.map((c) => [c.year, c.name])).toEqual([
      [2027, "Anna"],
      [2027, "Gæst"],
      [2019, "Ole fra før"],
    ]);
  });
});
