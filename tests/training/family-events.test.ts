import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { deleteEvent, listEvents } from "@/modules/training/events";
import {
  addFamilyEvent,
  deleteFamilyEvent,
  FamilyEventInput,
  listFamilyEvents,
  updateFamilyEvent,
} from "@/modules/training/family-events";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Tilføj til kalenderen" for a parent (docs/adr/0069), through the
 * services: a parent adds the family's days for a child who has confirmed
 * them, the coach sees them marked as a parent's and the child may delete
 * them; a parent cannot write for a child who has not confirmed, for a
 * teammate, a race, or another person's row.
 */

const ORG = "org_family_events";
const COACH = { orgId: ORG, userId: "user_family_coach" };
const ANNA = { orgId: ORG, userId: "user_family_anna" };
const BO = { orgId: ORG, userId: "user_family_bo" };
const MOR = { orgId: ORG, userId: "user_family_mor" };
const FAR = { orgId: ORG, userId: "user_family_far" };
const FROM = "2026-10-12";
const TO = "2026-10-16";

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const holiday = (riderId: string) =>
  FamilyEventInput.parse({
    riderId,
    kind: "holiday",
    title: "Efterårsferie i sommerhuset",
    startsOn: FROM,
    endsOn: TO,
  });

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, MOR, FAR]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", { id: "fe_anna", user_id: ANNA.userId, name: "Anna", birth_year: 2010 });
  await insert("riders", { id: "fe_bo", user_id: BO.userId, name: "Bo", birth_year: 2010 });
  // Mor is Anna's, confirmed; Far is Anna's too, and Anna has not said yes yet.
  await insert("guardians", {
    rider_id: "fe_anna",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await insert("guardians", { rider_id: "fe_anna", user_id: FAR.userId, name: "Far" });
  await insert("calendar_events", {
    id: "fe_exam",
    rider_id: "fe_anna",
    kind: "exam",
    title: "Matematik",
    starts_on: FROM,
    ends_on: FROM,
    created_by: ANNA.userId,
  });
});

afterAll(async () => {
  await admin.end();
});

describe("a parent's family days", () => {
  it("are added for the child, seen by the coach as a parent's, and listed for the parent", async () => {
    const { id } = await addFamilyEvent(MOR, holiday("fe_anna"));
    const coachSees = (await listEvents(COACH, { from: FROM, to: TO })).find((e) => e.id === id);
    expect(coachSees).toMatchObject({ riderId: "fe_anna", kind: "holiday", fromParent: true });
    const examSeen = (await listEvents(COACH, { from: FROM, to: TO })).find(
      (e) => e.id === "fe_exam",
    );
    expect(examSeen?.fromParent).toBe(false);
    expect((await listFamilyEvents(MOR, "fe_anna", FROM)).map((e) => e.id)).toEqual([id]);
    // What is over is not listed.
    expect(await listFamilyEvents(MOR, "fe_anna", "2026-10-17")).toEqual([]);
  });

  it("can be changed and removed by the parent who wrote them", async () => {
    const { id } = await addFamilyEvent(MOR, holiday("fe_anna"));
    await updateFamilyEvent(MOR, id, {
      ...holiday("fe_anna"),
      kind: "other",
      title: "Konfirmation",
    });
    const [changed] = (await listFamilyEvents(MOR, "fe_anna", FROM)).filter((e) => e.id === id);
    expect(changed).toMatchObject({ kind: "other", title: "Konfirmation" });
    await deleteFamilyEvent(MOR, id);
    expect((await listFamilyEvents(MOR, "fe_anna", FROM)).some((e) => e.id === id)).toBe(false);
  });

  it("can be deleted by the child", async () => {
    const { id } = await addFamilyEvent(MOR, holiday("fe_anna"));
    await deleteEvent(ANNA, id);
    expect((await listEvents(COACH, { from: FROM, to: TO })).some((e) => e.id === id)).toBe(false);
  });

  it("are refused for a teammate, a child who has not confirmed, and anybody who is not a parent", async () => {
    await expect(addFamilyEvent(MOR, holiday("fe_bo"))).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(addFamilyEvent(FAR, holiday("fe_anna"))).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(addFamilyEvent(BO, holiday("fe_anna"))).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("never take a race, a camp, school or a week ill", () => {
    for (const kind of ["race", "camp", "school", "ill"]) {
      expect(FamilyEventInput.safeParse({ ...holiday("fe_anna"), kind }).success, kind).toBe(false);
    }
  });

  it("leave the child's own exam alone", async () => {
    await expect(deleteFamilyEvent(MOR, "fe_exam")).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      updateFamilyEvent(MOR, "fe_exam", { ...holiday("fe_anna"), kind: "exam" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("cannot be moved to a teammate", async () => {
    const { id } = await addFamilyEvent(MOR, holiday("fe_anna"));
    await expect(updateFamilyEvent(MOR, id, holiday("fe_bo"))).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
