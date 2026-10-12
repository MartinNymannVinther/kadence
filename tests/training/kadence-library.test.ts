import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { libraryCatalogue } from "@/modules/exercises/library";
import {
  SENIOR_BIKE_SESSIONS,
  SENIOR_STRENGTH_PROGRAMMES,
  SENIOR_WEEKS,
  seniorWeek,
  seniorWeeklyCorridor,
} from "@/modules/paradigms";
import { rulleStart } from "@/modules/rulle/service";
import { hasSeniorRider } from "@/modules/season/seniors";
import { whoAmI } from "@/modules/team/access";
import { setTrainingProfile } from "@/modules/team/training-profile";
import { applyBlock, previewBlock } from "@/modules/training/block-apply";
import { getBlock, listBlocks, updateBlock } from "@/modules/training/blocks";
import { blockItemInput } from "@/modules/training/block-items";
import { installKadenceContent } from "@/modules/training/kadence-library";
import { listSessions } from "@/modules/training/sessions";
import { listTemplates } from "@/modules/training/templates";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Hent motionistpas" (docs/adr/0092) through the service and the
 * database: Kadence's sessions, strength programmes and ready weeks land
 * in a workspace with an adult as `source = 'kadence'` templates and keyed
 * blocks; fetching again updates the same rows; a changed week becomes the
 * coach's own; a youth team is neither offered nor given them; another
 * workspace never sees them; a ready week is laid into the week as any
 * forløb, against the profile's corridor; Rulle offers the adult their
 * profile's sessions and a U19 rider none.
 */

const ADULT = "org_kadence_adult";
const YOUTH = "org_kadence_youth";
const LARS = { orgId: ADULT, userId: "user_kls_lars" };
const MEMBER = { orgId: ADULT, userId: "user_kls_member" };
const COACH = { orgId: YOUTH, userId: "user_kls_coach" };
const IDA = { orgId: YOUTH, userId: "user_kls_ida" };
const TODAY = "2026-11-03";

const TEMPLATES = SENIOR_BIKE_SESSIONS.length + Object.keys(SENIOR_STRENGTH_PROGRAMMES).length;
const ALL = TEMPLATES + SENIOR_WEEKS.length;

let admin: Pool;

async function rider(orgId: string, id: string, birthYear: number, userId: string | null) {
  const q = insertSql("riders", {
    org_id: orgId,
    id,
    user_id: userId,
    name: id,
    birth_year: birthYear,
  });
  await admin.query(q.text, q.values);
}

const rows = async (orgId: string) =>
  (
    await admin.query(
      `select id, source, source_key, sport from workout_templates
       where org_id = $1 and source = 'kadence' order by source_key`,
      [orgId],
    )
  ).rows;

const blocks = async (orgId: string) =>
  (
    await admin.query(
      `select id, source_key, (select count(*)::int from training_block_items i where i.block_id = b.id) as items
       from training_blocks b where org_id = $1 order by source_key nulls last, id`,
      [orgId],
    )
  ).rows;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ADULT, LARS.userId, "owner");
  await seedPerson(admin, ADULT, MEMBER.userId, "member");
  await seedPerson(admin, YOUTH, COACH.userId, "owner");
  await seedPerson(admin, YOUTH, IDA.userId, "member");
  await rider(ADULT, "kls_lars", 1984, LARS.userId);
  await rider(ADULT, "kls_kim", 1990, MEMBER.userId);
  await rider(YOUTH, "kls_ida", 2009, IDA.userId); // U19 in 2026/27
});

afterAll(async () => {
  await admin.end();
});

describe("Kadence's sessions for adults in the library", () => {
  it("are offered only where there is an adult, and refused elsewhere", async () => {
    expect(await hasSeniorRider(LARS)).toBe(true);
    expect(await hasSeniorRider(COACH)).toBe(false);
    await expect(installKadenceContent(COACH, "da")).rejects.toMatchObject({ code: "invalid" });
    expect(await rows(YOUTH)).toEqual([]);
  });

  it("are a coach's to fetch, as DCU's are", async () => {
    await expect(installKadenceContent(MEMBER, "da")).rejects.toMatchObject({ code: "forbidden" });
    expect(await rows(ADULT)).toEqual([]);
  });

  it("arrive as Kadence's templates and keyed weeks, never as DCU's", async () => {
    expect(await installKadenceContent(LARS, "da")).toEqual({ installed: ALL, updated: 0 });
    const templates = await rows(ADULT);
    expect(templates).toHaveLength(TEMPLATES);
    expect(templates.every((t) => t.source === "kadence")).toBe(true);
    expect(templates.filter((t) => t.sport === "strength").map((t) => t.source_key)).toEqual([
      "kadence-strength-motionist",
      "kadence-strength-super-motionist",
    ]);
    const dcu = await admin.query(
      `select count(*)::int as n from workout_templates where org_id = $1 and source = 'dcu'`,
      [ADULT],
    );
    expect(dcu.rows[0].n).toBe(0);
    const weeks = await blocks(ADULT);
    expect(weeks.map((b) => b.source_key)).toEqual(SENIOR_WEEKS.map((w) => w.key).sort());
    for (const b of weeks)
      expect(b.items, b.source_key).toBe(
        SENIOR_WEEKS.find((w) => w.key === b.source_key)!.items.length,
      );
    const library = await listTemplates(LARS);
    const vo2 = library.find((t) => t.sourceKey === "kadence-vo2-4x4")!;
    expect(vo2).toMatchObject({ name: "VO2max 4 × 4 min", plannedMinutes: 58, sport: "bike" });
    expect(vo2.description).toContain("Helgerud");
  });

  it("update in place when fetched again", async () => {
    const before = await rows(ADULT);
    const weeksBefore = await blocks(ADULT);
    expect(await installKadenceContent(LARS, "en")).toEqual({ installed: 0, updated: ALL });
    expect((await rows(ADULT)).map((t) => t.id)).toEqual(before.map((t) => t.id));
    expect((await blocks(ADULT)).map((b) => b.id)).toEqual(weeksBefore.map((b) => b.id));
    const names = await listTemplates(LARS);
    expect(names.find((t) => t.sourceKey === "kadence-long-240")?.name).toBe("Long ride 4 hours");
    await installKadenceContent(LARS, "da");
  });

  it("let a coach make a ready week their own, and lay Kadence's beside it next time", async () => {
    const all = await listBlocks(LARS);
    const easy = all.find((b) => b.sourceKey === "kadence-week-motionist-easy")!;
    await updateBlock(LARS, easy.id, {
      name: "Min lette uge",
      description: easy.description,
      weeks: 1,
      items: easy.items.map(blockItemInput),
    });
    expect((await getBlock(LARS, easy.id))?.sourceKey).toBeNull();
    expect(await installKadenceContent(LARS, "da")).toEqual({ installed: 1, updated: ALL - 1 });
    const again = await listBlocks(LARS);
    expect(again.filter((b) => b.sourceKey === "kadence-week-motionist-easy")).toHaveLength(1);
    expect(again.find((b) => b.id === easy.id)?.name).toBe("Min lette uge");
  });

  it("stay in their workspace", async () => {
    expect((await listTemplates(COACH)).filter((t) => t.source === "kadence")).toEqual([]);
    expect(await listBlocks(COACH)).toEqual([]);
  });
});

describe("a ready week laid into the week", () => {
  it("previews against the profile's corridor and lays every session on its day", async () => {
    await setTrainingProfile(LARS, { riderId: "kls_lars", profile: "super-motionist" });
    const week = seniorWeek("super-motionist", "winter");
    const block = (await listBlocks(LARS)).find((b) => b.sourceKey === week.key)!;
    const monday = "2027-01-04";
    const input = { blockId: block.id, riderIds: ["kls_lars"], startMonday: monday };
    const [preview] = await previewBlock(LARS, input);
    expect(preview!.basis).toBe("senior-super-motionist");
    expect(preview!.weeks[0]!.corridor).toEqual(
      seniorWeeklyCorridor("senior-super-motionist", monday),
    );
    expect(preview!.weeks[0]!.bikeHours).toBeCloseTo(7.5, 1);
    expect(await applyBlock(LARS, input)).toEqual({ sessions: week.items.length });
    const sessions = await listSessions(LARS, {
      from: monday,
      to: "2027-01-10",
      riderIds: ["kls_lars"],
    });
    expect(sessions).toHaveLength(week.items.length);
    expect(sessions.filter((s) => s.sport === "strength").map((s) => s.onDate)).toEqual([
      "2027-01-06",
      "2027-01-08",
    ]);
    expect(sessions.find((s) => s.onDate === "2027-01-09")?.title).toBe("Lang tur 2½ time");
  });
});

describe("Kadence's programme for adults among the exercises", () => {
  const t = (key: string) => key;

  it("is listed where there is an adult, and not on a youth team", async () => {
    const refs = async (ctx: typeof LARS) =>
      (await libraryCatalogue(ctx, t, "da")).programs.map((p) => p.ref);
    expect(await refs(LARS)).toContain("builtin:motionistHome");
    expect(await refs(COACH)).not.toContain("builtin:motionistHome");
    expect(await refs(COACH)).toContain("builtin:strengthNoMachines");
  });
});

describe("Rulle's picker", () => {
  it("knows an adult's profile, and none for a U19 rider", async () => {
    const lars = await rulleStart(LARS, await whoAmI(ADULT, LARS.userId), null, TODAY);
    expect(lars.profile).toBe("super-motionist");
    const ida = await rulleStart(IDA, await whoAmI(YOUTH, IDA.userId), null, TODAY);
    expect(ida.profile).toBeNull();
  });
});
