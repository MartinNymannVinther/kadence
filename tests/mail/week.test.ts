import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";

vi.hoisted(() =>
  Object.assign(process.env, {
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  }),
);

import { Refused } from "@/core/action";
import { env } from "@/core/env";
import { useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { forgetMailChoice, setWeekMail, weekMailState } from "@/modules/push/mail-choice";
import { runWeekMails } from "@/modules/push/mail-week";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";
import { insertSql } from "../helpers/rows";
import { pushTeam } from "../push/push-team";

/**
 * The parents' week "også på mail" (docs/adr/0086, beside ADR 0060): a
 * parent's own choice, nobody else's to read; a mail on Sunday from 18.00
 * that says there is news and links to the parents' page — not the
 * child's name, not a session — once a week, never in the quiet hours.
 *
 * Sunday 11 October 2026 is summer time: 16.30 UTC is 18.30 in Copenhagen.
 */

const SUNDAY = new Date("2026-10-11T16:30:00Z");
const SUNDAY_LATE = new Date("2026-10-11T19:45:00Z");
const SUNDAY_EARLY = new Date("2026-10-11T15:00:00Z");
const SATURDAY = new Date("2026-10-10T16:30:00Z");
const NEXT_SUNDAY = new Date("2026-10-18T16:30:00Z");

let admin: Pool;
let app: Client;
let team: ReturnType<typeof pushTeam>;
const fake = new FakeTransport();
const parentEmail = () => `${team.PARENT.userId}@example.com`;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  team = pushTeam(admin, "mailweek");
  await team.seed();
  useMailTransportForTests(fake);
});

beforeEach(async () => {
  await resetRateLimits();
  fake.clear();
});

afterAll(async () => {
  useMailTransportForTests(null);
  await app.end();
  await admin.end();
});

describe("the choice", () => {
  it("is a parent's, kept in the language it was made in", async () => {
    expect(await setWeekMail(team.PARENT, true, "da")).toEqual({ on: true, email: parentEmail() });
    expect(await weekMailState(team.PARENT)).toEqual({ on: true, email: parentEmail() });
    const { rows } = await admin.query(
      "select week, locale from mail_preferences where user_id = $1",
      [team.PARENT.userId],
    );
    expect(rows).toEqual([{ week: true, locale: "da" }]);
  });

  it("is not offered to a rider or a coach without a child on the team", async () => {
    for (const who of [team.RIDER, team.COACH])
      await expect(setWeekMail(who, true, "da")).rejects.toBeInstanceOf(Refused);
  });

  it("is the person's alone: a coach reads none and writes none in another's name", async () => {
    const seen = await asApp(app, team.COACH, (c) => c.query("select * from mail_preferences"));
    expect(seen.rows).toEqual([]);
    const q = insertSql("mail_preferences", {
      org_id: team.ORG,
      user_id: team.RIDER.userId,
      week: true,
    });
    expect(await expectSqlError(asApp(app, team.COACH, (c) => c.query(q.text, q.values)))).toBe(
      "42501",
    );
  });

  it("names whose choice it is to the weekly run, and nothing more", async () => {
    const result = await asApp(app, null, (c) =>
      c.query("select * from mail_week_due() where user_id like 'user_mailweek_%'"),
    );
    expect(result.fields.map((f) => f.name)).toEqual(["org_id", "user_id"]);
    expect(result.rows).toEqual([{ org_id: team.ORG, user_id: team.PARENT.userId }]);
  });

  it("is in the audit trail without an address", async () => {
    const { rows } = await admin.query(
      "select after_data from audit_log where entity_type = 'mail_preferences' and actor_user_id = $1",
      [team.PARENT.userId],
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const { after_data } of rows) expect(JSON.stringify(after_data)).not.toContain("@");
  });
});

describe("the mail", () => {
  it("goes on Sunday from 18.00, says there is news, and names nobody", async () => {
    expect(await runWeekMails(SUNDAY)).toEqual({ people: 1, sent: 1, failed: 0 });
    const [mail] = fake.to(parentEmail());
    expect(mail?.subject).toBe("Der er nyt om ugen i Kadence");
    expect(linksIn(mail!.text)).toEqual([`${new URL(env.BETTER_AUTH_URL).origin}/parents`]);
    for (const name of ["Emma", "Holm", "Jonas", "Mor"]) expect(mail?.text).not.toContain(name);
  });

  it("goes once a week, however often the run comes by", async () => {
    await runWeekMails(SUNDAY);
    fake.clear();
    expect((await runWeekMails(new Date(SUNDAY.getTime() + 10 * 60_000))).sent).toBe(0);
    expect(fake.sent).toHaveLength(0);
  });

  it("does not go before 18.00, on another day, or in the quiet hours", async () => {
    for (const when of [SUNDAY_EARLY, SATURDAY, SUNDAY_LATE])
      expect((await runWeekMails(when)).sent, when.toISOString()).toBe(0);
    expect(fake.sent).toHaveLength(0);
  });

  it("tries again on the next run when the provider fails", async () => {
    fake.failNext = 2;
    expect(await runWeekMails(SUNDAY)).toEqual({ people: 1, sent: 0, failed: 1 });
    expect((await runWeekMails(new Date(SUNDAY.getTime() + 10 * 60_000))).sent).toBe(1);
  });

  it("is written in the language the choice was made in", async () => {
    await setWeekMail(team.PARENT, true, "en");
    await runWeekMails(NEXT_SUNDAY);
    const [mail] = fake.to(parentEmail());
    expect(mail?.subject).toBe("There is news about the week in Kadence");
    expect(linksIn(mail!.text)[0]).toMatch(/\/en\/parents$/);
  });

  it("stops when the child no longer shares with the parent", async () => {
    await admin.query("update guardians set confirmed_at = null where id = $1", ["g_mailweek"]);
    try {
      expect((await runWeekMails(NEXT_SUNDAY)).sent).toBe(0);
    } finally {
      await admin.query("update guardians set confirmed_at = now() where id = $1", ["g_mailweek"]);
    }
  });
});

describe("turning it off", () => {
  it("keeps nothing, and the run sends nothing", async () => {
    expect(await setWeekMail(team.PARENT, false, "da")).toEqual({
      on: false,
      email: parentEmail(),
    });
    const { rows } = await admin.query("select 1 from mail_preferences where user_id = $1", [
      team.PARENT.userId,
    ]);
    expect(rows).toEqual([]);
    expect((await runWeekMails(NEXT_SUNDAY)).sent).toBe(0);
  });

  it("happens when the person leaves the team", async () => {
    await setWeekMail(team.PARENT, true, "da");
    await forgetMailChoice(team.PARENT);
    const { rows } = await admin.query("select 1 from mail_preferences where user_id = $1", [
      team.PARENT.userId,
    ]);
    expect(rows).toEqual([]);
  });
});
