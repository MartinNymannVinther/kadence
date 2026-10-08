import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * A club's logo and picture (drizzle/0019, docs/adr/0048): everyone in
 * the team reads them, only a coach writes them, and as themselves.
 * Another team sees nothing, and the image bytes never reach the audit log.
 */

let admin: Pool;
let app: Client;
const tiny = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  const a = await seedWorkspace(admin, "img_a");
  await seedMember(admin, a.orgId, "img_a_member");
  await seedWorkspace(admin, "img_b");
  await admin.query(
    `insert into org_images (org_id, kind, mime, bytes, width, height, updated_by)
     values ('org_img_a', 'logo', 'image/png', $1, 10, 10, 'user_img_a')`,
    [tiny],
  );
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

const coachA = { orgId: "org_img_a", userId: "user_img_a" };
const memberA = { orgId: "org_img_a", userId: "user_img_a_member" };
const coachB = { orgId: "org_img_b", userId: "user_img_b" };

const insert = (orgId: string, updatedBy: string) => (c: Client) =>
  c.query(
    `insert into org_images (org_id, kind, mime, bytes, width, height, updated_by)
     values ($1, 'cover', 'image/png', $2, 10, 10, $3)`,
    [orgId, tiny, updatedBy],
  );

describe("org_images", () => {
  it("everyone in the team reads the club's images; another team reads none", async () => {
    const count = (c: Client) => c.query("select count(*)::int as n from org_images");
    expect((await asApp(app, coachA, count)).rows[0].n).toBe(1);
    expect((await asApp(app, memberA, count)).rows[0].n).toBe(1);
    expect((await asApp(app, coachB, count)).rows[0].n).toBe(0);
    expect((await asApp(app, null, count)).rows[0].n).toBe(0);
  });

  it("a coach writes, as themselves", async () => {
    await asApp(app, coachA, async (c) => {
      await insert("org_img_a", "user_img_a")(c);
      const rows = await c.query("select count(*)::int as n from org_images");
      expect(rows.rows[0].n).toBe(2);
    });
    expect(await expectSqlError(asApp(app, coachA, insert("org_img_a", "user_img_a_member")))).toBe(
      "42501",
    );
  });

  it("a member who is not a coach cannot change or remove them", async () => {
    expect(
      await expectSqlError(asApp(app, memberA, insert("org_img_a", "user_img_a_member"))),
    ).toBe("42501");
    const removed = await asApp(app, memberA, (c) => c.query("delete from org_images"));
    expect(removed.rowCount).toBe(0);
  });

  it("another team's coach cannot write into this team", async () => {
    expect(await expectSqlError(asApp(app, coachB, insert("org_img_a", "user_img_b")))).toBe(
      "42501",
    );
  });

  it("the audit log records the change without the image", async () => {
    const rows = await admin.query(
      `select after_data from audit_log where entity_type = 'org_images' order by id desc limit 1`,
    );
    expect(rows.rows[0].after_data).toMatchObject({ kind: "logo", mime: "image/png" });
    expect(rows.rows[0].after_data).not.toHaveProperty("bytes");
  });
});
