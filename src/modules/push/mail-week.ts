import { and, eq, sql } from "drizzle-orm";
import { forget, countOne } from "@/core/counters";
import { mondayOf } from "@/core/dates";
import { appDb } from "@/core/db/client";
import { mailPreferences } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";
import { mailConfigured, sendMail } from "@/core/mail/mailer";
import { weekNewsMail } from "@/core/mail/templates/week-news";
import { appLink } from "@/core/mail/links";
import { mailLocale, mailWords, type MailLocale } from "@/core/mail/words";
import { whoAmIIn } from "@/modules/team/access";
import { copenhagenClock, isQuiet, WEEK_FROM } from "./due";
import { ownAddress, weekMailOffered } from "./mail-choice";

/**
 * The parents' week by mail (docs/adr/0086), on the push's clock (ADR
 * 0060): Sunday from 18.00 Copenhagen time, not in the quiet hours, once
 * a week per person. Run beside the push run, every ten minutes, when the
 * installation sends mail.
 *
 * Like the push it says nothing about the child: "Der er nyt om ugen i
 * Kadence" and a link to the parents' page, behind the login. It starts
 * with nobody signed in, so the one thing it reads across people is
 * `mail_week_due()` (drizzle/0048); whether the person is still a parent
 * there, their language and their address are read as the person.
 *
 * Once a week is a count in the counters (drizzle/0043, src/core/
 * counters.ts), keyed by person and week, so two runs or two servers send
 * it once and the audit trail is left to choices. A mail that could not be
 * sent takes its count back for the next run.
 */

export type WeekMailReport = { people: number; sent: number; failed: number };

const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;

type Due = { orgId: string; userId: string };

async function dueChoices(): Promise<Due[]> {
  const result = await appDb.execute(sql`select org_id, user_id from mail_week_due()`);
  return (result.rows as Array<{ org_id: string; user_id: string }>).map((r) => ({
    orgId: r.org_id,
    userId: r.user_id,
  }));
}

/** As the person: their address and language, if the week still means anything to them here. */
async function target(ctx: OrgContext): Promise<{ to: string; locale: MailLocale } | null> {
  return withOrgContext(ctx, async (tx) => {
    if (!weekMailOffered(await whoAmIIn(tx, ctx))) return null;
    const [row] = await tx
      .select({ locale: mailPreferences.locale })
      .from(mailPreferences)
      .where(and(eq(mailPreferences.orgId, ctx.orgId), eq(mailPreferences.userId, ctx.userId)));
    const to = await ownAddress(tx, ctx);
    return row && to ? { to, locale: mailLocale(row.locale) } : null;
  });
}

export async function runWeekMails(now: Date = new Date()): Promise<WeekMailReport> {
  const report: WeekMailReport = { people: 0, sent: 0, failed: 0 };
  if (!mailConfigured()) return report;
  const clock = copenhagenClock(now);
  if (clock.weekday !== 7 || clock.minutes < WEEK_FROM || isQuiet(clock)) return report;
  const monday = mondayOf(clock.date);

  for (const ctx of await dueChoices()) {
    let to: { to: string; locale: MailLocale } | null;
    try {
      to = await target(ctx);
    } catch (error) {
      await log.error("mail: week not read", { orgId: ctx.orgId, error: errorName(error) });
      continue;
    }
    if (!to) continue;
    // One a week per person, however many teams they chose it on.
    const key = `mail-week:${ctx.userId}:${monday}`;
    if ((await countOne(key, EIGHT_DAYS_MS)).count > 1) continue;
    report.people += 1;
    const mail = weekNewsMail(mailWords(to.locale), { url: appLink("/parents", to.locale) });
    if (await sendMail({ to: to.to, ...mail })) report.sent += 1;
    else {
      report.failed += 1;
      await forget(key);
    }
  }
  return report;
}
