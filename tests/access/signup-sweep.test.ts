import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

const saved = vi.hoisted(() => {
  const keys = ["SIGNUP", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    SIGNUP: "individuals",
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  });
  return before;
});

import { registerSelf } from "@/core/auth/register-self";
import { todayInCopenhagen } from "@/core/dates";
import { settleMail, useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { signupSweepHandler } from "@/modules/signup/job";
import { sweepUnverifiedSignups, UNVERIFIED_DAYS } from "@/modules/signup/sweep";
import { adminPool, authClient, expectSqlError, appClient } from "../helpers/db";
import { FakeTransport } from "../helpers/mail";

/**
 * Door 2's clean-up (docs/adr/0088): an account a person created alone
 * and never confirmed goes after seven days — its workspace, the account
 * and every audit row about either, leaving one line with the account's
 * id — and nothing else goes: not a younger one, whatever the clock in
 * the code says, not a confirmed one, not one made another way, not one
 * that joined a team meanwhile.
 */

const DOMAIN = "sweep.example";
const YEAR = Number(todayInCopenhagen().slice(0, 4));
const DAY = 24 * 60 * 60 * 1000;
let admin: Pool;
const fake = new FakeTransport();
let ip = 0;

const names = { workspaceName: (first: string) => `${first}s træning`, locale: "da" as const };

/** A door-2 account, `days` old. */
async function signedUp(key: string, days: number): Promise<{ userId: string; orgId: string }> {
  const email = `${key}@${DOMAIN}`;
  const result = await registerSelf(
    new Headers({ "x-forwarded-for": `192.0.2.${++ip}` }),
    {
      name: `${key} Person`,
      email,
      password: "en-meget-lang-kode-123",
      personal: { forWhom: "me", birthYear: YEAR - 30 },
      terms: true,
      health: true,
    },
    names,
  );
  expect(result).toEqual({ ok: true });
  const { rows } = await admin.query(
    `select u.id as "userId", m.organization_id as "orgId" from users u
       join memberships m on m.user_id = u.id where u.email = $1`,
    [email],
  );
  await admin.query(
    `update users set created_at = now() - make_interval(days => $2) where id = $1`,
    [rows[0].userId, days],
  );
  return rows[0];
}

const exists = async (table: string, column: string, id: string) =>
  (await admin.query(`select 1 from ${table} where ${column} = $1`, [id])).rowCount === 1;

let gone: { userId: string; orgId: string };
let young: { userId: string; orgId: string };
let confirmed: { userId: string; orgId: string };
let onTeam: { userId: string; orgId: string };

beforeAll(async () => {
  admin = adminPool();
  useMailTransportForTests(fake);
  await resetRateLimits();
  // An installation with people on it, so nobody here becomes its owner.
  await admin.query(
    `insert into users (id, name, email) values ('user_sweep_seed', 'Seed', 'seed@${DOMAIN}')`,
  );
  gone = await signedUp("gone", UNVERIFIED_DAYS + 1);
  young = await signedUp("young", UNVERIFIED_DAYS - 1);
  confirmed = await signedUp("confirmed", UNVERIFIED_DAYS + 3);
  await admin.query("update users set email_verified = true where id = $1", [confirmed.userId]);
  onTeam = await signedUp("onteam", UNVERIFIED_DAYS + 3);
  await admin.query(
    `insert into organizations (id, name, slug) values ('org_sweep_club', 'Klubben', 'sweep-club')`,
  );
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role)
     values ('mem_sweep_club', 'org_sweep_club', $1, 'member')`,
    [onTeam.userId],
  );
  // Made another way (an approved application, before door 2): never door 2's to sweep.
  await admin.query(
    `insert into users (id, name, email, created_at) values
       ('user_sweep_other', 'Anden Vej', 'other@${DOMAIN}', now() - interval '30 days')`,
  );
  await settleMail();
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.query(
    `delete from organizations where id in (
       select organization_id from memberships m join users u on u.id = m.user_id
       where u.email like '%@${DOMAIN}') or id = 'org_sweep_club'`,
  );
  await admin.query(`delete from users where email like '%@${DOMAIN}'`);
  await admin.end();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("the sweep", () => {
  it("is a daily job that runs from the registry", async () => {
    expect(signupSweepHandler.kind.kind).toBe("signup.sweep");
    expect(signupSweepHandler.kind.every).toBe(DAY);
  });

  it("deletes only the door-2 account unconfirmed for more than seven days", async () => {
    // The clock the code is given: today. The young account is not even asked about.
    expect(await sweepUnverifiedSignups(new Date())).toBe(1);

    expect(await exists("users", "id", gone.userId)).toBe(false);
    expect(await exists("organizations", "id", gone.orgId)).toBe(false);
    expect(await exists("riders", "org_id", gone.orgId)).toBe(false);
    expect(await exists("consents", "org_id", gone.orgId)).toBe(false);

    for (const kept of [young, confirmed, onTeam])
      expect(await exists("users", "id", kept.userId)).toBe(true);
    expect(await exists("organizations", "id", young.orgId)).toBe(true);
    expect(await exists("users", "id", "user_sweep_other")).toBe(true);
  });

  it("leaves one audit line without a name or an address", async () => {
    const { rows } = await admin.query(
      `select org_id, actor_user_id, actor_type, action, entity_type, before_data, after_data,
              ip_address, user_agent
         from audit_log
        where org_id = $2 or actor_user_id = $1 or entity_id in ($1, $2)
           or before_data ->> 'user_id' = $1 or after_data ->> 'user_id' = $1`,
      [gone.userId, gone.orgId],
    );
    expect(rows).toEqual([
      {
        org_id: null,
        actor_user_id: null,
        actor_type: "system",
        action: "signup.expired",
        entity_type: "users",
        before_data: null,
        after_data: null,
        ip_address: null,
        user_agent: null,
      },
    ]);
  });

  it("is refused by the database for a younger account, whatever clock the code is given", async () => {
    const later = new Date(Date.now() + 30 * DAY);
    expect(await sweepUnverifiedSignups(later)).toBe(0);
    expect(await exists("users", "id", young.userId)).toBe(true);
  });

  it("is the auth role's alone, and refuses the application role", async () => {
    const auth = await authClient();
    try {
      const { rows } = await auth.query("select delete_unverified_signup($1) as deleted", [
        confirmed.userId,
      ]);
      expect(rows[0].deleted).toBe(false);
    } finally {
      await auth.end();
    }
    const app = await appClient();
    try {
      expect(
        await expectSqlError(app.query("select delete_unverified_signup($1)", [young.userId])),
      ).toBe("42501");
    } finally {
      await app.end();
    }
  });
});
