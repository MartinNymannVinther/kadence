import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { Refused } from "@/core/action";
import { env } from "@/core/env";
import {
  Endpoint,
  listMine,
  reminderState,
  setKinds,
  subscribe,
  unsubscribe,
} from "@/modules/push/subscriptions";
import { newVapidKeyPair } from "@/modules/push/vapid";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Turning reminders on and off for a browser (docs/adr/0060), through the
 * service the actions call, as the person. The reminders offered are the
 * person's roles' on the team, worked out on the server; a browser's
 * address is taken only from a known push service; turning off lets go of
 * the address on every team; and without the key pair nothing is taken.
 */

const ORG = "org_push_subs";
const ORG_B = "org_push_subs_b";
const COACH = { orgId: ORG, userId: "user_ps_coach" };
const RIDER = { orgId: ORG, userId: "user_ps_rider" };
const PARENT = { orgId: ORG, userId: "user_ps_parent" };
const NOBODY = { orgId: ORG, userId: "user_ps_nobody" };
const PHONE = "https://web.push.apple.com/push-subs-phone";
const LAPTOP = "https://updates.push.services.mozilla.com/wpush/v2/push-subs-laptop";

let admin: Pool;
let restore: () => void;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "none";
  } catch (error) {
    return error instanceof Refused ? error.code : "other";
  }
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Push subs");
  for (const p of [RIDER, PARENT, NOBODY]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, ORG_B, "user_ps_coach_b", "owner", "Push subs B");
  // The same rider on a second team (seedPerson keys memberships by user).
  await insert("memberships", {
    id: "mem_ps_rider_b",
    organization_id: ORG_B,
    user_id: RIDER.userId,
    role: "member",
  });
  await insert("riders", {
    id: "r_ps",
    org_id: ORG,
    user_id: RIDER.userId,
    name: "Ida",
    birth_year: 2010,
  });
  await insert("riders", {
    id: "r_psb",
    org_id: ORG_B,
    user_id: RIDER.userId,
    name: "Ida",
    birth_year: 2010,
  });
  await insert("guardians", {
    id: "g_ps",
    org_id: ORG,
    rider_id: "r_ps",
    user_id: PARENT.userId,
    name: "Far",
    confirmed_at: new Date(),
  });
  const pair = newVapidKeyPair();
  const before = { PUSH_PUBLIC_KEY: env.PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY: env.PUSH_PRIVATE_KEY };
  Object.assign(env, { PUSH_PUBLIC_KEY: pair.publicKey, PUSH_PRIVATE_KEY: pair.privateKey });
  restore = () => Object.assign(env, before);
});

afterAll(async () => {
  restore();
  await admin.query("delete from push_subscriptions where org_id in ($1, $2)", [ORG, ORG_B]);
  await admin.end();
});

describe("turning reminders on", () => {
  it("offers each person what their roles on the team mean", async () => {
    expect((await subscribe(RIDER, PHONE)).kinds).toEqual(["checkin", "comment", "plan"]);
    expect((await subscribe(COACH, PHONE)).kinds).toEqual(["comment", "wellbeing"]);
    expect((await subscribe(PARENT, PHONE)).kinds).toEqual(["comment", "week"]);
    expect(await refusal(subscribe(NOBODY, PHONE))).toBe("forbidden");
  });

  it("keeps a browser's choices when it is turned on again", async () => {
    await setKinds(RIDER, PHONE, ["checkin"]);
    expect((await subscribe(RIDER, PHONE)).kinds).toEqual(["checkin"]);
    expect(await reminderState(RIDER, PHONE)).toEqual({
      subscribed: true,
      kinds: ["checkin"],
      offered: ["checkin", "comment", "plan"],
      since: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    });
    expect(await reminderState(RIDER, LAPTOP)).toMatchObject({ subscribed: false, since: null });
  });

  it("takes only the reminders the roles offer", async () => {
    expect((await setKinds(COACH, PHONE, ["checkin", "comment", "week"])).kinds).toEqual([
      "comment",
    ]);
    // Wellbeing is a coach's: a rider or a parent who asks for it does not get it.
    expect((await setKinds(PARENT, PHONE, ["wellbeing", "week"])).kinds).toEqual(["week"]);
    expect((await setKinds(COACH, PHONE, ["comment", "wellbeing"])).kinds).toEqual([
      "comment",
      "wellbeing",
    ]);
    expect(await refusal(setKinds(COACH, LAPTOP, ["comment"]))).toBe("notFound");
  });

  it("takes an address only from a known push service", () => {
    expect(Endpoint.safeParse(PHONE).success).toBe(true);
    expect(Endpoint.safeParse("https://intranet.example/push").success).toBe(false);
    expect(Endpoint.safeParse("http://web.push.apple.com/x").success).toBe(false);
  });

  it("names a person's browsers by push service, never by address", async () => {
    const mine = await listMine(RIDER);
    expect(mine.map((m) => m.service)).toEqual(["web.push.apple.com"]);
    expect(JSON.stringify(mine)).not.toContain("push-subs-phone");
  });
});

describe("turning reminders off", () => {
  it("lets go of the browser's address on every team", async () => {
    await subscribe({ orgId: ORG_B, userId: RIDER.userId }, PHONE);
    await subscribe(RIDER, LAPTOP);
    await unsubscribe(RIDER, PHONE);
    const left = await admin.query(
      "select org_id, endpoint from push_subscriptions where user_id = $1 order by org_id",
      [RIDER.userId],
    );
    expect(left.rows).toEqual([{ org_id: ORG, endpoint: LAPTOP }]);
    // The coach's and the parent's rows for the same address are theirs, and stay.
    const others = await admin.query(
      "select count(*)::int as n from push_subscriptions where endpoint = $1",
      [PHONE],
    );
    expect(others.rows[0].n).toBe(2);
  });
});

describe("an installation without the key pair", () => {
  it("takes nothing", async () => {
    const keys = { PUSH_PUBLIC_KEY: env.PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY: env.PUSH_PRIVATE_KEY };
    Object.assign(env, { PUSH_PUBLIC_KEY: undefined, PUSH_PRIVATE_KEY: undefined });
    try {
      expect(await refusal(subscribe(RIDER, PHONE))).toBe("notFound");
      expect(await refusal(reminderState(RIDER, PHONE))).toBe("notFound");
    } finally {
      Object.assign(env, keys);
    }
  });
});
