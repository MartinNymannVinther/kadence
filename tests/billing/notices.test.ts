import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { useMailTransportForTests } from "@/core/mail/mailer";
import { billingExpireHandler } from "@/modules/billing/jobs";
import { sendPlanNotices } from "@/modules/billing/notices";
import { adminPool } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";
import { insertSql, seedPerson } from "../helpers/rows";
import { setPlan, withBilling, withMail } from "./fixture";

/**
 * The mails about what a workspace pays (docs/adr/0090): 7 days and 1 day
 * before a trial ends, 14 days before a payment runs out, and once when
 * the workspace has become read only — each to the workspace's owners and
 * nobody else, once, in the owner's language, with the workspace's name
 * for a club and none for a person, the day, the price and a link to
 * Abonnement, and no account number.
 */

const P = "org_notice_";
const owner = (key: string) => `user_notice_${key}`;
const address = (key: string) => `${owner(key)}@example.com`;

let admin: Pool;
let restore: Array<() => void> = [];
const fake = new FakeTransport();

const job = { id: "job", orgId: null, attempt: 1, signal: new AbortController().signal };

beforeAll(async () => {
  admin = adminPool();
  restore = [withBilling("on"), withMail()];
  useMailTransportForTests(fake);
  const seeds: Array<[string, "trial" | "paid" | "expired", { trial?: string; paid?: string }]> = [
    ["week", "trial", { trial: "+5 days" }],
    ["tomorrow", "trial", { trial: "+1 day" }],
    ["paid", "paid", { trial: "-300 days", paid: "+10 days" }],
    ["ended", "expired", { trial: "-1 hour" }],
    ["early", "trial", { trial: "+20 days" }],
    ["demo", "trial", { trial: "+3 days" }],
  ];
  for (const [key, plan, dates] of seeds) {
    await seedPerson(admin, P + key, owner(key), "owner", `Varsel ${key}`);
    await setPlan(admin, P + key, plan, dates);
  }
  // A club's other coach and a rider hear nothing about money.
  await seedPerson(admin, P + "week", "user_notice_week_admin", "admin");
  await seedPerson(admin, P + "week", "user_notice_week_member", "member");
  // A person's own workspace is not named in a mail.
  await admin.query("update organizations set kind = 'personal' where id = $1", [P + "tomorrow"]);
  // The owner who chose English for the parents' week reads it in English.
  const en = insertSql("mail_preferences", {
    org_id: P + "paid",
    user_id: owner("paid"),
    locale: "en",
  });
  await admin.query(en.text, en.values);
  const demo = insertSql("demo_workspaces", {
    organization_id: P + "demo",
    user_id: owner("demo"),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  await admin.query(demo.text, demo.values);
});

beforeEach(() => fake.clear());

afterAll(async () => {
  useMailTransportForTests(null);
  for (const undo of restore.reverse()) undo();
  await admin.query(`delete from organizations where id like '${P}%'`);
  await admin.end();
});

const ours = () => fake.sent.filter((m) => m.to.startsWith("user_notice_"));

describe("the mails", () => {
  it("go to the owners of the workspaces they are about, one each", async () => {
    const report = await sendPlanNotices();
    expect(report.failed).toBe(0);
    expect(
      ours()
        .map((m) => m.to)
        .sort(),
    ).toEqual([address("ended"), address("paid"), address("tomorrow"), address("week")].sort());
  });

  it("go once: a second run sends nothing", async () => {
    await sendPlanNotices();
    expect(ours()).toEqual([]);
  });

  it("say the workspace, the day, the price and where to look, in the owner's language", async () => {
    await admin.query(`delete from app_rate_limits where key like 'billing:%:${P}%'`);
    await sendPlanNotices();
    const week = fake.to(address("week"))[0]!;
    expect(week.subject).toMatch(/^Prøveperioden i Kadence slutter \d+\. \w+ \d{4}$/);
    expect(week.text).toContain("Prøveperioden for Varsel week slutter");
    expect(week.text).toContain("Prisen er 1.200 kr. om året.");
    expect(week.text).toContain("En faktura kommer fra Haij på mail.");
    expect(linksIn(week.text)).toEqual(["http://localhost:3000/settings/subscription"]);

    const tomorrow = fake.to(address("tomorrow"))[0]!;
    expect(tomorrow.text).toContain("Prøveperioden for dit eget Kadence har sin sidste dag");
    expect(tomorrow.text).toContain("Prisen er 290 kr. om året.");
    expect(tomorrow.text).not.toContain("Varsel");

    const paid = fake.to(address("paid"))[0]!;
    expect(paid.subject).toMatch(/^Your Kadence subscription runs until/);
    expect(linksIn(paid.text)).toEqual(["http://localhost:3000/en/settings/subscription"]);

    const ended = fake.to(address("ended"))[0]!;
    expect(ended.subject).toBe("Kadence kan nu kun læses");
    expect(ended.text).toContain("Prøveperioden for Varsel ended sluttede");

    for (const mail of ours())
      expect(mail.text).not.toMatch(/kontonummer|reg\. ?nr|iban|\d{4} ?\d{6,}/i);
  });

  it("try again tomorrow when a mail could not go", async () => {
    await admin.query(`delete from app_rate_limits where key like 'billing:%:${P}%'`);
    fake.failNext = 100;
    const failed = await sendPlanNotices();
    expect(failed.sent).toBe(0);
    fake.failNext = 0;
    fake.clear();
    await sendPlanNotices();
    expect(ours().length).toBe(4);
  });
});

describe("the daily job", () => {
  it("moves what time moved, then mails the owner that the workspace is read only", async () => {
    await seedPerson(admin, P + "lapsed", owner("lapsed"), "owner", "Varsel lapsed");
    await setPlan(admin, P + "lapsed", "trial", { trial: "-1 minute" });
    await billingExpireHandler.run({}, job);
    const row = await admin.query("select plan from organizations where id = $1", [P + "lapsed"]);
    expect(row.rows[0].plan).toBe("expired");
    expect(fake.to(address("lapsed"))[0]?.subject).toBe("Kadence kan nu kun læses");
  });

  it("does nothing at all while BILLING is off", async () => {
    const off = withBilling("off");
    try {
      await seedPerson(admin, P + "quiet", owner("quiet"), "owner", "Varsel quiet");
      await setPlan(admin, P + "quiet", "trial", { trial: "-1 minute" });
      await admin.query(`delete from app_rate_limits where key like 'billing:%:${P}%'`);
      fake.clear();
      expect(await billingExpireHandler.run({}, job)).toEqual({ moved: 0, mails: 0 });
      const row = await admin.query("select plan from organizations where id = $1", [P + "quiet"]);
      expect(row.rows[0].plan).toBe("trial");
      expect(await sendPlanNotices()).toEqual({ due: 0, sent: 0, failed: 0 });
      expect(ours()).toEqual([]);
    } finally {
      off();
    }
  });
});
