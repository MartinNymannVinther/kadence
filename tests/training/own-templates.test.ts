import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { scheduleTemplate } from "@/modules/training/group";
import {
  adoptTemplate,
  createTemplate,
  listOwnTemplates,
  listTemplates,
  updateTemplate,
} from "@/modules/training/templates";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A rider's own sessions (drizzle/0021, docs/adr/0050): the rider writes
 * them, the coaches and a sharing parent read them, a teammate and another
 * team see nothing, and a coach takes one into the library as a copy.
 */

const ORG = "org_own";
const COACH = { orgId: ORG, userId: "user_own_coach" };
const ANNA = { orgId: ORG, userId: "user_own_anna" };
const BO = { orgId: ORG, userId: "user_own_bo" };
const MOR = { orgId: ORG, userId: "user_own_mor" };
const OTHER = { orgId: "org_own_other", userId: "user_own_other" };

const bike = {
  name: "Annas bakker",
  sport: "bike" as const,
  description: "",
  structure: {
    kind: "bike" as const,
    steps: [
      {
        kind: "step" as const,
        intent: "steady" as const,
        seconds: 3600,
        target: { kind: "zone" as const, zone: 2 },
      },
    ],
  },
  plannedMinutes: 60,
};

let admin: Pool;
let app: Client;
let annaTemplate: string;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER.orgId, OTHER.userId, "owner");
  for (const [id, userId, name] of [
    ["own_anna", ANNA.userId, "Anna"],
    ["own_bo", BO.userId, "Bo"],
  ] as const) {
    const r = insertSql("riders", { org_id: ORG, id, user_id: userId, name, birth_year: 2010 });
    await admin.query(r.text, r.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "own_anna",
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

describe("a rider's own sessions", () => {
  it("the rider builds one for themselves; it stays out of the team's library", async () => {
    annaTemplate = (await createTemplate(ANNA, { ...bike, riderId: "own_anna" })).id;
    expect((await listTemplates(COACH)).some((t) => t.id === annaTemplate)).toBe(false);
    const mine = await listOwnTemplates(ANNA, { riderId: "own_anna" });
    expect(mine.map((t) => t.id)).toEqual([annaTemplate]);
  });

  it("a rider cannot build one for a teammate, nor into the team's library", async () => {
    await expect(createTemplate(BO, { ...bike, riderId: "own_anna" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createTemplate(BO, bike)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("the coach and a sharing parent read it; a teammate and another team do not", async () => {
    expect((await listOwnTemplates(COACH)).map((t) => t.riderName)).toContain("Anna");
    expect((await listOwnTemplates(MOR)).map((t) => t.id)).toContain(annaTemplate);
    expect(await listOwnTemplates(BO)).toEqual([]);
    expect(await listOwnTemplates(OTHER)).toEqual([]);
    await admin.query("update riders set share_training = false where id = 'own_anna'");
    expect(await listOwnTemplates(MOR)).toEqual([]);
    await admin.query("update riders set share_training = true where id = 'own_anna'");
  });

  it("the database keeps a rider from moving it into the library or calling it DCU's", async () => {
    const move = (c: Client) =>
      c.query("update workout_templates set rider_id = null where id = $1", [annaTemplate]);
    expect(await expectSqlError(asApp(app, ANNA, move))).toBe("42501");
    const dcu = (c: Client) =>
      c.query("update workout_templates set source = 'dcu' where id = $1", [annaTemplate]);
    expect(await expectSqlError(asApp(app, ANNA, dcu))).toBe("42501");
    const teammate = await asApp(app, BO, (c) =>
      c.query("update workout_templates set name = 'x' where id = $1", [annaTemplate]),
    );
    expect(teammate.rowCount).toBe(0);
  });

  it("the rider changes it; it goes into their own calendar only", async () => {
    await updateTemplate(ANNA, annaTemplate, { ...bike, name: "Annas lange bakker" });
    const { ids } = await scheduleTemplate(ANNA, annaTemplate, ["own_anna"], "2026-11-10");
    expect(ids).toHaveLength(1);
    await expect(
      scheduleTemplate(COACH, annaTemplate, ["own_bo"], "2026-11-10"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("a coach takes it into the team's library as a copy that remembers whose it was", async () => {
    await expect(adoptTemplate(ANNA, annaTemplate)).rejects.toMatchObject({ code: "forbidden" });
    const { id } = await adoptTemplate(COACH, annaTemplate);
    const library = await listTemplates(BO);
    const copy = library.find((t) => t.id === id);
    expect(copy).toMatchObject({
      name: "Annas lange bakker",
      copiedFrom: annaTemplate,
      riderId: null,
    });
    expect((await listOwnTemplates(ANNA)).map((t) => t.id)).toEqual([annaTemplate]);
  });
});
