import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { env } from "@/core/env";
import { plannedSessionDeletions } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { newestPlanChange } from "@/modules/push/facts";
import { newVapidKeyPair } from "@/modules/push/vapid";
import { createGroupSessions } from "@/modules/training/group";
import {
  createSession,
  deleteSession,
  moveSession,
  updateSession,
} from "@/modules/training/sessions";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A plan change knows who made it (drizzle/0035, docs/adr/0060, backlog
 * P2-12): `updated_by` is stamped by the database from the caller on every
 * write the app makes, and let go when the account goes; a session
 * somebody else deletes in the rider's next days is written down, in the
 * deleter's name, for the rider's reminder to read.
 */

const ORG = "org_plan_sender";
const COACH = { orgId: ORG, userId: "user_psend_coach" };
const RIDER = { orgId: ORG, userId: "user_psend_rider" };
const RIDER2 = { orgId: ORG, userId: "user_psend_rider2" };
const R1 = "r_psend";
const R2 = "r_psend2";
const TODAY = todayInCopenhagen();
const SOON = addDaysIso(TODAY, 2);

const bike = {
  kind: "bike" as const,
  steps: [
    {
      kind: "step" as const,
      intent: "steady" as const,
      seconds: 3600,
      target: { kind: "zone" as const, zone: 2 },
    },
  ],
};
const input = (title: string, onDate = SOON) => ({
  onDate,
  sport: "bike" as const,
  title,
  description: "",
  structure: bike,
  plannedMinutes: 0,
  plannedKm: null,
  templateId: null,
});

let admin: Pool;
let restore: () => void;

async function updatedBy(id: string): Promise<string | null> {
  const result = await admin.query("select updated_by from planned_sessions where id = $1", [id]);
  return result.rows[0]?.updated_by ?? null;
}

const deletions = () =>
  admin
    .query(
      `select rider_id, on_date::text as day, title, deleted_by
       from planned_session_deletions where org_id = $1 order by rider_id, title`,
      [ORG],
    )
    .then((r) => r.rows);

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Planens afsender");
  for (const p of [RIDER, RIDER2]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, userId] of [
    [R1, RIDER.userId],
    [R2, RIDER2.userId],
  ]) {
    const q = insertSql("riders", { id, org_id: ORG, user_id: userId, name: id, birth_year: 2010 });
    await admin.query(q.text, q.values);
  }
  const pair = newVapidKeyPair();
  const before = { PUSH_PUBLIC_KEY: env.PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY: env.PUSH_PRIVATE_KEY };
  Object.assign(env, { PUSH_PUBLIC_KEY: pair.publicKey, PUSH_PRIVATE_KEY: pair.privateKey });
  restore = () => Object.assign(env, before);
});

afterAll(async () => {
  restore();
  await admin.query("delete from organizations where id = $1", [ORG]);
  await admin.end();
});

describe("who last changed a session", () => {
  it("is whoever wrote it last, through every service", async () => {
    const { id } = await createSession(COACH, { ...input("Grundtur"), riderId: R1 });
    expect(await updatedBy(id)).toBe(COACH.userId);
    await updateSession(RIDER, id, input("Grundtur, kortere"), "one");
    expect(await updatedBy(id)).toBe(RIDER.userId);
    await moveSession(COACH, id, addDaysIso(SOON, 1));
    expect(await updatedBy(id)).toBe(COACH.userId);

    const group = await createGroupSessions(COACH, [R1, R2], input("Holdtur"));
    for (const copy of group.ids) expect(await updatedBy(copy)).toBe(COACH.userId);
  });

  it("stays when the database itself changes the row, and goes with the account", async () => {
    await seedPerson(admin, ORG, "user_psend_gone", "admin");
    const template = insertSql("workout_templates", {
      id: "tpl_psend",
      org_id: ORG,
      name: "Skabelon",
      sport: "bike",
      structure: bike,
    });
    await admin.query(template.text, template.values);
    const { id } = await createSession(COACH, {
      ...input("Fra skabelonen"),
      riderId: R1,
      templateId: "tpl_psend",
    });
    await updateSession(RIDER, id, { ...input("Rettet"), templateId: "tpl_psend" }, "one");
    // The template goes: ON DELETE SET NULL is no change by anybody.
    await admin.query("delete from workout_templates where id = 'tpl_psend'");
    expect(await updatedBy(id)).toBe(RIDER.userId);

    const { id: theirs } = await createSession(
      { orgId: ORG, userId: "user_psend_gone" },
      { ...input("Lagt af en, der går"), riderId: R1 },
    );
    expect(await updatedBy(theirs)).toBe("user_psend_gone");
    // Deleted in somebody's context, as an account deletion is.
    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.user_id', $1, true)", [COACH.userId]);
      await client.query("delete from users where id = 'user_psend_gone'");
      await client.query("commit");
    } finally {
      client.release();
    }
    expect(await updatedBy(theirs)).toBeNull();
  });
});

describe("a deleted session", () => {
  it("is written down when somebody else deletes it in the rider's next days", async () => {
    await admin.query("delete from planned_sessions where org_id = $1", [ORG]);
    const before = new Date(Date.now() - 1000);
    const near = await createSession(COACH, { ...input("Intervaller"), riderId: R1 });
    const far = await createSession(COACH, {
      ...input("Langt ude", addDaysIso(TODAY, 20)),
      riderId: R1,
    });
    const own = await createSession(RIDER, { ...input("Min egen"), riderId: R1 });
    await deleteSession(COACH, near.id, "one");
    await deleteSession(COACH, far.id, "one");
    await deleteSession(RIDER, own.id, "one");
    expect(await deletions()).toEqual([
      { rider_id: R1, day: SOON, title: "Intervaller", deleted_by: COACH.userId },
    ]);

    const range = { after: before, upTo: new Date(Date.now() + 2000) };
    const told = await withOrgContext(RIDER, (tx) => newestPlanChange(tx, RIDER, R1, range, TODAY));
    expect(told).toBeInstanceOf(Date);
    // A teammate reads none of it.
    const seen = await withOrgContext(RIDER2, (tx) => tx.select().from(plannedSessionDeletions));
    expect(seen).toEqual([]);
  });

  it("is written down for each rider of a group the coach deletes", async () => {
    await admin.query("delete from planned_session_deletions where org_id = $1", [ORG]);
    const group = await createGroupSessions(COACH, [R1, R2], input("Holdtur"));
    await deleteSession(COACH, group.ids[0]!, "group");
    expect((await deletions()).map((d) => d.rider_id)).toEqual([R1, R2]);
  });

  it("is written down when somebody else moves a session out of the rider's week", async () => {
    await admin.query("delete from planned_session_deletions where org_id = $1", [ORG]);
    const within = await createSession(COACH, { ...input("Flyttes lidt"), riderId: R1 });
    const away = await createSession(COACH, { ...input("Flyttes væk"), riderId: R1 });
    const own = await createSession(RIDER, { ...input("Min egen væk"), riderId: R1 });
    await moveSession(COACH, within.id, addDaysIso(TODAY, 4));
    await moveSession(COACH, away.id, addDaysIso(TODAY, 15));
    await moveSession(RIDER, own.id, addDaysIso(TODAY, 15));
    expect(await deletions()).toEqual([
      { rider_id: R1, day: SOON, title: "Flyttes væk", deleted_by: COACH.userId },
    ]);
  });

  it("is not written down on an installation without reminders", async () => {
    await admin.query("delete from planned_session_deletions where org_id = $1", [ORG]);
    const keys = { PUSH_PUBLIC_KEY: env.PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY: env.PUSH_PRIVATE_KEY };
    Object.assign(env, { PUSH_PUBLIC_KEY: undefined, PUSH_PRIVATE_KEY: undefined });
    try {
      const { id } = await createSession(COACH, { ...input("Uden påmindelser"), riderId: R1 });
      await deleteSession(COACH, id, "one");
      expect(await deletions()).toEqual([]);
    } finally {
      Object.assign(env, keys);
    }
  });
});
