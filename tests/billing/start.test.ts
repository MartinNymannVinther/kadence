import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

// Door 2 open, billing on, mail on (docs/adr/0088, 0090). Set before
// anything reads @/core/env, and put back after.
const saved = vi.hoisted(() => {
  const keys = [
    "SIGNUP",
    "BILLING",
    "TRIAL_DAYS",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "MAIL_FROM",
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    SIGNUP: "individuals",
    BILLING: "on",
    TRIAL_DAYS: "30",
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  });
  return before;
});

import { createInvitation } from "@/core/access/service";
import { registerUserWithOrganization } from "@/core/auth/register";
import { registerSelf } from "@/core/auth/register-self";
import { todayInCopenhagen } from "@/core/dates";
import { useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { seasonEndFrom, youthFreeThrough } from "@/modules/billing/which-plan";
import { startingPlan } from "@/modules/billing/start";
import { adminPool } from "../helpers/db";
import { FakeTransport } from "../helpers/mail";

/**
 * Where a new workspace starts (docs/adr/0090, Martin's answers of 12
 * October 2026): a person alone on a trial of TRIAL_DAYS days; a young
 * rider alone free through their last U19 season; a club the owner
 * admitted free for its first season, through the coming 30 September;
 * the installation's own first workspace free. With BILLING=off, free.
 */

const DOMAIN = "billing-start.example";
const OWNER = "user_billstart_owner";
const PASSWORD = "en-meget-lang-kode-123";
const TODAY = todayInCopenhagen();
const YEAR = Number(TODAY.slice(0, 4));
let admin: Pool;
let ip = 0;
const from = () => new Headers({ "x-forwarded-for": `198.51.100.${200 + ++ip}` });
const names = { workspaceName: (first: string) => `${first}s Kadence`, locale: "da" as const };

async function planOfUser(email: string) {
  const { rows } = await admin.query(
    `select o.plan, o.price_plan, o.free_reason,
            to_char(o.free_until at time zone 'Europe/Copenhagen', 'YYYY-MM-DD HH24:MI') as free_until,
            round(extract(epoch from o.trial_ends_at - now()) / 86400) as trial_days
     from organizations o join memberships m on m.organization_id = o.id
     join users u on u.id = m.user_id where u.email = $1`,
    [email],
  );
  return rows[0];
}

const self = (email: string, birthYear: number) => ({
  name: "Sigrid Selv",
  email,
  password: PASSWORD,
  personal: { forWhom: "me", birthYear },
  terms: true,
  health: true,
});

beforeAll(async () => {
  admin = adminPool();
  useMailTransportForTests(new FakeTransport());
  await resetRateLimits();
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', $2, 'owner') on conflict do nothing`,
    [OWNER, `owner@${DOMAIN}`],
  );
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.query(
    `delete from organizations where id in (
       select organization_id from memberships m join users u on u.id = m.user_id
       where u.email like '%@${DOMAIN}')`,
  );
  await admin.query(`delete from users where email like '%@${DOMAIN}'`);
  await admin.end();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("a person who creates their own workspace", () => {
  it("as a grown-up tries it for TRIAL_DAYS days", async () => {
    const email = `voksen@${DOMAIN}`;
    expect(await registerSelf(from(), self(email, YEAR - 30), names)).toEqual({ ok: true });
    expect(await planOfUser(email)).toMatchObject({
      plan: "trial",
      price_plan: null,
      free_reason: null,
      trial_days: "30",
    });
  });

  it("as a young rider is free through the last day of their last U19 season", async () => {
    const email = `ung@${DOMAIN}`;
    const born = YEAR - 16;
    expect(await registerSelf(from(), self(email, born), names)).toEqual({ ok: true });
    const through = youthFreeThrough(born);
    const [y, m, d] = through.split("-").map(Number);
    const next = new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
    expect(await planOfUser(email)).toMatchObject({
      plan: "free",
      price_plan: "youth",
      free_reason: "youth",
      free_until: `${next} 00:00`,
      trial_days: null,
    });
  });
});

describe("a club the owner admitted", () => {
  it("is free for its first season, through the coming 30 September", async () => {
    const issued = await createInvitation(OWNER, {
      email: `klub@${DOMAIN}`,
      organizationName: "Første Sæson CK",
    });
    const token = new URL(issued.url).searchParams.get("invitation")!;
    const result = await registerUserWithOrganization(new Headers(), {
      name: "Klubtræner",
      email: `klub@${DOMAIN}`,
      organizationName: "Første Sæson CK",
      password: PASSWORD,
      invitationToken: token,
    });
    expect(result).toEqual({ ok: true });
    const end = seasonEndFrom(TODAY);
    const endYear = Number(end.slice(0, 4));
    expect(await planOfUser(`klub@${DOMAIN}`)).toMatchObject({
      plan: "free",
      free_reason: "first-season",
      free_until: `${endYear}-10-01 00:00`,
      trial_days: null,
    });
  });
});

describe("the starting plan", () => {
  const settings = { billing: true, trialDays: 30, todayIso: "2026-10-12" };

  it("is free for everybody with BILLING=off", () => {
    for (const start of [
      { kind: "personal", birthYear: 1990 },
      { kind: "personal", birthYear: 2010 },
      { kind: "club", admitted: true },
    ] as const)
      expect(startingPlan(start, { ...settings, billing: false })).toMatchObject({
        plan: "free",
        freeReason: null,
        freeThrough: null,
      });
  });

  it("is free with no date for a person when the installation gives no trial", () => {
    expect(
      startingPlan({ kind: "personal", birthYear: 1990 }, { ...settings, trialDays: 0 }),
    ).toEqual({
      plan: "free",
      pricePlan: null,
      trialDays: null,
      freeReason: null,
      freeThrough: null,
    });
  });

  it("is free for a club nobody admitted, the installation's own", () => {
    expect(startingPlan({ kind: "club", admitted: false }, settings).plan).toBe("free");
    expect(startingPlan({ kind: "club", admitted: true }, settings)).toMatchObject({
      freeReason: "first-season",
      freeThrough: "2027-09-30",
    });
  });
});
