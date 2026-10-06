import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A browser's reminders are its owner's alone (drizzle/0028, docs/adr/0060),
 * proven as the application role with raw SQL — what any bug in a service
 * could do, and no more. Not a teammate, not a parent, not the coach, and
 * not another team reads or changes them; the job's one door across
 * people says which subscriptions exist and whose, never the address.
 */

const ORG = "org_push_iso";
const OTHER_ORG = "org_push_iso_other";
const COACH = { orgId: ORG, userId: "user_pi_coach" };
const RIDER = { orgId: ORG, userId: "user_pi_rider" };
const PARENT = { orgId: ORG, userId: "user_pi_parent" };
const LEFT = { orgId: ORG, userId: "user_pi_left" };
const STRANGER = { orgId: OTHER_ORG, userId: "user_pi_stranger" };

const endpoint = (who: string) => `https://fcm.googleapis.com/fcm/send/push-iso-${who}`;

let admin: Pool;
let app: Client;

async function subscription(id: string, who: { orgId: string; userId: string }) {
  const q = insertSql("push_subscriptions", {
    id,
    org_id: who.orgId,
    user_id: who.userId,
    endpoint: endpoint(id),
  });
  await admin.query(q.text, q.values);
}

const visible = (who: typeof COACH | null) =>
  asApp(app, who, (c) =>
    c.query("select id from push_subscriptions where id like 'pi_%' order by id"),
  ).then((r) => r.rows.map((row) => row.id as string));

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Push iso");
  for (const p of [RIDER, PARENT, LEFT]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER_ORG, STRANGER.userId, "owner", "Push iso other");
  const rider = insertSql("riders", {
    id: "r_pi",
    org_id: ORG,
    user_id: RIDER.userId,
    name: "Rytter",
    birth_year: 2010,
  });
  await admin.query(rider.text, rider.values);
  const guardian = insertSql("guardians", {
    id: "g_pi",
    org_id: ORG,
    rider_id: "r_pi",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await admin.query(guardian.text, guardian.values);

  await subscription("pi_coach", COACH);
  await subscription("pi_rider", RIDER);
  await subscription("pi_parent", PARENT);
  await subscription("pi_left", LEFT);
  await subscription("pi_stranger", STRANGER);
  // Gone from the team, the row is left behind; the job must not see it.
  await admin.query("delete from memberships where user_id = $1", [LEFT.userId]);
});

afterAll(async () => {
  // The reminder job reads every subscription; leave none for it to find.
  await admin.query("delete from push_subscriptions where id like 'pi_%'");
  await app.end();
  await admin.end();
});

describe("who sees a browser's reminders", () => {
  it("only its owner, in the owner's own team", async () => {
    expect(await visible(RIDER)).toEqual(["pi_rider"]);
    expect(await visible(PARENT)).toEqual(["pi_parent"]);
    expect(await visible(STRANGER)).toEqual(["pi_stranger"]);
  });

  it("not the coach, who sees only the coach's own", async () => {
    expect(await visible(COACH)).toEqual(["pi_coach"]);
  });

  it("nobody without a context", async () => {
    expect(await visible(null)).toEqual([]);
  });

  it("not the owner either, from another team's context", async () => {
    expect(await visible({ orgId: OTHER_ORG, userId: RIDER.userId })).toEqual([]);
  });
});

describe("who changes a browser's reminders", () => {
  it("nobody else can change or remove them, the coach included", async () => {
    for (const who of [COACH, PARENT, STRANGER]) {
      const changed = await asApp(app, who, (c) =>
        c.query("update push_subscriptions set kinds = '{}' where id = 'pi_rider' returning id"),
      );
      expect(changed.rowCount, who.userId).toBe(0);
      const removed = await asApp(app, who, (c) =>
        c.query("delete from push_subscriptions where id = 'pi_rider' returning id"),
      );
      expect(removed.rowCount, who.userId).toBe(0);
    }
  });

  it("nobody can make one in someone else's name or in another team", async () => {
    const forOther = insertSql("push_subscriptions", {
      org_id: ORG,
      user_id: RIDER.userId,
      endpoint: endpoint("forged"),
    });
    expect(
      await expectSqlError(asApp(app, COACH, (c) => c.query(forOther.text, forOther.values))),
    ).toBe("42501");
    const elsewhere = insertSql("push_subscriptions", {
      org_id: OTHER_ORG,
      user_id: RIDER.userId,
      endpoint: endpoint("elsewhere"),
    });
    expect(
      await expectSqlError(asApp(app, RIDER, (c) => c.query(elsewhere.text, elsewhere.values))),
    ).toBe("42501");
  });

  it("the owner can, and only to a push address over https", async () => {
    const mine = await asApp(app, RIDER, (c) =>
      c.query(
        "update push_subscriptions set kinds = '{checkin}' where id = 'pi_rider' returning id",
      ),
    );
    expect(mine.rowCount).toBe(1);
    const plain = insertSql("push_subscriptions", {
      org_id: ORG,
      user_id: RIDER.userId,
      endpoint: "http://fcm.googleapis.com/fcm/send/plain",
    });
    expect(await expectSqlError(asApp(app, RIDER, (c) => c.query(plain.text, plain.values)))).toBe(
      "23514",
    );
  });

  it("takes the kinds Kadence knows, wellbeing among them, and nothing else", async () => {
    const known = await asApp(app, COACH, (c) =>
      c.query(
        "update push_subscriptions set kinds = '{comment,wellbeing}' where id = 'pi_coach' returning id",
      ),
    );
    expect(known.rowCount).toBe(1);
    expect(
      await expectSqlError(
        asApp(app, COACH, (c) =>
          c.query("update push_subscriptions set kinds = '{alarm}' where id = 'pi_coach'"),
        ),
      ),
    ).toBe("23514");
  });
});

describe("the reminder job's door", () => {
  it("says which subscriptions exist and whose, for members, and nothing else", async () => {
    const due = await asApp(app, null, (c) =>
      c.query("select * from push_subscriptions_due() where id like 'pi_%' order by id"),
    );
    expect(due.fields.map((f) => f.name)).toEqual(["id", "org_id", "user_id"]);
    expect(due.rows.map((r) => r.id)).toEqual(["pi_coach", "pi_parent", "pi_rider", "pi_stranger"]);
    expect(JSON.stringify(due.rows)).not.toContain("fcm.googleapis.com");
  });
});

describe("the audit trail", () => {
  it("records the subscription without its address", async () => {
    const rows = await admin.query(
      "select after_data from audit_log where entity_type = 'push_subscriptions' and entity_id = 'pi_rider'",
    );
    expect(rows.rowCount).toBeGreaterThan(0);
    for (const row of rows.rows) {
      expect(row.after_data).not.toHaveProperty("endpoint");
      expect(row.after_data).toHaveProperty("user_id", RIDER.userId);
    }
  });
});
