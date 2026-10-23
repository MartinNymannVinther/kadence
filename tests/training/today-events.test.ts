import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { riderDay } from "@/app/[locale]/(app)/(narrow)/today/rider-data";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { adminPool } from "../helpers/db";
import { insertSql } from "../helpers/rows";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * A rider's Today shows the calendar's days beside the sessions: a race
 * tomorrow stood nowhere on the page, under "I morgen: Intet planlagt i
 * morgen", the day of its race prep. Now today and tomorrow carry the
 * team's events and the rider's own, with when and where a race starts,
 * and never a teammate's.
 */

const TODAY = todayInCopenhagen();
const TOMORROW = addDaysIso(TODAY, 1);
const WORDS = { today: "i dag", yesterday: "i går", locale: "da" };
let admin: Pool;
let coach: { orgId: string; userId: string };
let rider: { orgId: string; userId: string };

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  coach = await seedWorkspace(admin, "tde_club");
  rider = await seedMember(admin, coach.orgId, "tde_freja");
  await insert("riders", {
    org_id: coach.orgId,
    id: "tde_r_freja",
    user_id: rider.userId,
    name: "Freja",
    birth_year: 2009,
  });
  await insert("riders", { org_id: coach.orgId, id: "tde_r_bo", name: "Bo", birth_year: 2009 });
  const event = (values: Record<string, unknown>) =>
    insert("calendar_events", { org_id: coach.orgId, ends_on: values.starts_on, ...values });
  await event({
    id: "tde_race",
    kind: "race",
    title: "Cross i Ballerup",
    starts_on: TOMORROW,
    start_time: "10:15",
    meeting_place: "Ballerup Super Arena",
    priority: "C",
  });
  await event({
    id: "tde_exam",
    rider_id: "tde_r_freja",
    kind: "exam",
    title: "Matematik",
    starts_on: TODAY,
  });
  await event({
    id: "tde_bo_race",
    rider_id: "tde_r_bo",
    kind: "race",
    title: "Bos løb",
    starts_on: TOMORROW,
  });
});

afterAll(async () => {
  await admin.query("delete from organizations where id = $1", [coach.orgId]);
  await admin.end();
});

describe("a rider's Today", () => {
  it("shows tomorrow's race with when and where it starts, and today's own day", async () => {
    const day = await riderDay(rider, "tde_r_freja", TODAY, WORDS);
    expect(day.events.today.map((e) => e.title)).toEqual(["Matematik"]);
    expect(day.events.tomorrow).toMatchObject([
      {
        kind: "race",
        title: "Cross i Ballerup",
        startTime: "10:15",
        meetingPlace: "Ballerup Super Arena",
        priority: "C",
      },
    ]);
  });

  it("never shows a teammate's race, to the rider or to the coach reading the rider", async () => {
    for (const ctx of [rider, coach]) {
      const day = await riderDay(ctx, "tde_r_freja", TODAY, WORDS);
      expect(day.events.tomorrow.map((e) => e.title)).not.toContain("Bos løb");
    }
  });
});
