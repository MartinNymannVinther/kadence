import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { createResetLink, listMyResets, type ResetLink } from "@/core/team/reset-link";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A way back in for a member who forgot the password (docs/adr/0032): a
 * coach makes a one-time link for anyone on the team but an owner and
 * themselves, and the database says the same; the link is Better Auth's
 * own reset, good once and within the hour, and using it signs the person
 * out everywhere else; the person can read that a link was made and by
 * whom; asking for a link by e-mail stays closed.
 */

const ORG = "org_reset";
const OTHER = "org_reset_other";
const OWNER = { orgId: ORG, userId: "user_rs_owner" };
const COACH = { orgId: ORG, userId: "user_rs_coach" };
const IDA = { orgId: ORG, userId: "user_rs_ida" };
const MOR = { orgId: ORG, userId: "user_rs_mor" };
const STRANGER = { orgId: OTHER, userId: "user_rs_stranger" };
const NEW_PASSWORD = "et-nyt-langt-kodeord-2026";

let admin: Pool;
let app: Client;

const tokenOf = (link: ResetLink) => new URL(link.url).searchParams.get("token")!;
const made = async (ctx: typeof OWNER, userId: string) => {
  const link = await createResetLink(ctx, userId);
  if (typeof link === "string") throw new Error(`refused: ${link}`);
  return link;
};
const sessionsOf = async (userId: string) =>
  (await admin.query("select count(*)::int as n from sessions where user_id = $1", [userId]))
    .rows[0].n as number;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, OWNER.userId, "owner");
  await seedPerson(admin, ORG, COACH.userId, "admin");
  await seedPerson(admin, ORG, IDA.userId, "member");
  await seedPerson(admin, ORG, MOR.userId, "member");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("making a link", () => {
  it("gives a coach a link to Kadence's own page, good for an hour, and records it", async () => {
    const before = Date.now();
    const link = await made(OWNER, IDA.userId);
    const url = new URL(link.url);
    expect(url.pathname).toBe("/reset-password");
    expect(tokenOf(link)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(link.expiresAt.getTime() - before).toBeGreaterThan(59 * 60_000);
    expect(link.expiresAt.getTime() - before).toBeLessThanOrEqual(60 * 60_000 + 5_000);

    const { rows } = await admin.query(
      "select org_id, user_id, created_by from password_resets where user_id = $1",
      [IDA.userId],
    );
    expect(rows).toEqual([{ org_id: ORG, user_id: IDA.userId, created_by: OWNER.userId }]);
    const audit = await admin.query(
      "select action, actor_user_id from audit_log where entity_type = 'password_resets' and org_id = $1",
      [ORG],
    );
    expect(audit.rows).toContainEqual({
      action: "password_resets.insert",
      actor_user_id: OWNER.userId,
    });
  });

  it("is the team's rule for removing a member: coaches for anyone but an owner and themselves", async () => {
    expect(typeof (await createResetLink(COACH, MOR.userId))).toBe("object");
    expect(typeof (await createResetLink(OWNER, COACH.userId))).toBe("object");
    expect(await createResetLink(COACH, OWNER.userId)).toBe("forbidden");
    expect(await createResetLink(OWNER, OWNER.userId)).toBe("forbidden");
    expect(await createResetLink(IDA, MOR.userId)).toBe("forbidden");
    expect(await createResetLink(OWNER, STRANGER.userId)).toBe("notFound");
    expect(await createResetLink(OWNER, "user_nobody")).toBe("notFound");
  });

  it("is counted: ten a coach an hour, five for one person", async () => {
    for (let i = 0; i < 10; i++) rateLimit(`reset-link:${OWNER.userId}`, 10, 3_600_000);
    expect(await createResetLink(OWNER, MOR.userId)).toBe("rateLimited");
    resetRateLimits();
    for (let i = 0; i < 5; i++) rateLimit(`reset-link-for:${MOR.userId}`, 5, 3_600_000);
    expect(await createResetLink(COACH, MOR.userId)).toBe("rateLimited");
  });
});

describe("the database's own say", () => {
  const row = (values: Record<string, unknown>) =>
    insertSql("password_resets", {
      org_id: ORG,
      user_id: IDA.userId,
      created_by: COACH.userId,
      expires_at: new Date(Date.now() + 3_600_000),
      ...values,
    });

  it("refuses a record from anyone but a coach, for an owner, for oneself, or in another's name", async () => {
    for (const [who, values] of [
      [IDA, { created_by: IDA.userId, user_id: MOR.userId }],
      [COACH, { user_id: OWNER.userId }],
      [COACH, { user_id: COACH.userId }],
      [COACH, { created_by: OWNER.userId }],
      [COACH, { user_id: STRANGER.userId }],
    ] as const) {
      const q = row(values);
      const code = await expectSqlError(asApp(app, who, (c) => c.query(q.text, q.values)));
      expect(["42501", "23503"], JSON.stringify(values)).toContain(code);
    }
  });

  it("lets nobody change or remove a record: the application may do neither", async () => {
    const before = (await admin.query("select count(*)::int as n from password_resets")).rows[0].n;
    for (const sql of [
      "update password_resets set created_by = user_id where org_id = $1",
      "delete from password_resets where org_id = $1",
    ])
      expect(await expectSqlError(asApp(app, OWNER, (c) => c.query(sql, [ORG]))), sql).toBe(
        "42501",
      );
    const after = (await admin.query("select count(*)::int as n from password_resets")).rows[0].n;
    expect(after).toBe(before);
  });
});

describe("using the link", () => {
  it("sets the new password once, signs the person out everywhere else, and is in the audit trail", async () => {
    const link = await made(OWNER, MOR.userId);
    // Mor is signed in somewhere before the reset.
    await admin.query(
      `insert into sessions (id, user_id, token, expires_at, created_at, updated_at)
       values ('ses_rs_mor', $1, 'tok_rs_mor', now() + interval '1 day', now(), now())`,
      [MOR.userId],
    );
    expect(await sessionsOf(MOR.userId)).toBe(1);

    await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: tokenOf(link) } });
    expect(await sessionsOf(MOR.userId)).toBe(0);
    const signedIn = await auth.api.signInEmail({
      body: { email: `${MOR.userId}@example.com`, password: NEW_PASSWORD },
    });
    expect(signedIn.user.id).toBe(MOR.userId);

    await expect(
      auth.api.resetPassword({
        body: { newPassword: "et-andet-langt-kodeord", token: tokenOf(link) },
      }),
    ).rejects.toMatchObject({ body: { code: "INVALID_TOKEN" } });
    const audit = await admin.query(
      "select action from audit_log where action = 'auth.password_reset' and entity_id = $1",
      [MOR.userId],
    );
    expect(audit.rows).toHaveLength(1);
  });

  it("is refused after the hour, and for a password shorter than twelve characters", async () => {
    const context = await auth.$context;
    await context.internalAdapter.createVerificationValue({
      identifier: "reset-password:gammelt-link",
      value: IDA.userId,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: "gammelt-link" } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_TOKEN" } });

    const link = await made(OWNER, IDA.userId);
    await expect(
      auth.api.resetPassword({ body: { newPassword: "for-kort", token: tokenOf(link) } }),
    ).rejects.toMatchObject({ body: { code: "PASSWORD_TOO_SHORT" } });
  });

  it("is not something to ask for by e-mail: that door stays closed", async () => {
    await expect(
      auth.api.requestPasswordReset({ body: { email: `${IDA.userId}@example.com` } }),
    ).rejects.toMatchObject({ body: { code: "RESET_PASSWORD_DISABLED" } });
  });
});

describe("the person's own record", () => {
  it("shows the person the links made for them, and by whom; a teammate sees none", async () => {
    const mine = await listMyResets(IDA);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0]!.byName).toBe(OWNER.userId);
    expect(mine.every((r) => r.createdAt instanceof Date)).toBe(true);
    const seenByMor = await asApp(app, MOR, (c) =>
      c.query("select 1 from password_resets where user_id = $1", [IDA.userId]),
    );
    expect(seenByMor.rows).toEqual([]);
    const seenByCoach = await asApp(app, COACH, (c) =>
      c.query("select 1 from password_resets where user_id = $1", [IDA.userId]),
    );
    expect(seenByCoach.rows.length).toBeGreaterThan(0);
  });
});
