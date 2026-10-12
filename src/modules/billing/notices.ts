import { and, eq, sql } from "drizzle-orm";
import { countOne, forget } from "@/core/counters";
import { appDb } from "@/core/db/client";
import { mailPreferences, organizations } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";
import { appLink } from "@/core/mail/links";
import { mailConfigured, sendMail } from "@/core/mail/mailer";
import {
  PLAN_NOTICE_KINDS,
  planNoticeMail,
  type PlanNoticeKind,
} from "@/core/mail/templates/plan-notice";
import { mailLocale, mailWords, type MailLocale } from "@/core/mail/words";
import { ownAddress } from "@/modules/push/mail-choice";
import { formatKroner, formatLongDay, lastDay } from "./dates";
import { workspacePriceForJob } from "./price";
import { billingOn } from "./state";

/**
 * The mails about what a workspace pays (docs/adr/0090), sent by the daily
 * job after it has moved the plans: 7 days and 1 day before a trial ends,
 * 14 days before a payment runs out, and once when a workspace has become
 * read only. To the workspace's owners only.
 *
 * The job starts with nobody signed in, so the one thing it reads across
 * workspaces is `billing_notices_due()` (drizzle/0052): which owner of
 * which workspace, which kind, and the moment it is about. The address,
 * the language (the owner's choice for the parents' week, Danish
 * otherwise) and the workspace's name are read as the owner, under the
 * ordinary policies, as the parents' week does (src/modules/push/mail-week.ts).
 *
 * Once is a count in the counters (drizzle/0043), keyed by the kind, the
 * workspace, the owner and the last day the mail is about, so a new trial
 * or a new payment is a new mail and two runs send one. A mail that could
 * not be sent takes its count back for tomorrow. The counters are the
 * installation's unlogged table: a database crash, not a deploy, forgets
 * them, and the worst that does is one reminder twice.
 */

export type PlanNoticeReport = { due: number; sent: number; failed: number };

const KEPT_MS = 400 * 24 * 60 * 60 * 1000;

type Due = { orgId: string; userId: string; kind: PlanNoticeKind; endsAt: Date };

async function dueNotices(): Promise<Due[]> {
  const result = await appDb.execute(
    sql`select org_id, user_id, kind, ends_at from billing_notices_due()`,
  );
  return (
    result.rows as Array<{ org_id: string; user_id: string; kind: string; ends_at: Date | string }>
  )
    .filter((r) => (PLAN_NOTICE_KINDS as readonly string[]).includes(r.kind))
    .map((r) => ({
      orgId: r.org_id,
      userId: r.user_id,
      kind: r.kind as PlanNoticeKind,
      endsAt: new Date(r.ends_at),
    }));
}

type Target = {
  to: string;
  locale: MailLocale;
  workspace: string | null;
  wasTrial: boolean;
};

/** As the owner: their address and language, the workspace's name for a club, and what ran out. */
async function target(ctx: OrgContext): Promise<Target | null> {
  return withOrgContext(ctx, async (tx) => {
    const [org] = await tx
      .select({
        name: organizations.name,
        kind: organizations.kind,
        paidUntil: organizations.paidUntil,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId));
    const [choice] = await tx
      .select({ locale: mailPreferences.locale })
      .from(mailPreferences)
      .where(and(eq(mailPreferences.orgId, ctx.orgId), eq(mailPreferences.userId, ctx.userId)));
    const to = await ownAddress(tx, ctx);
    if (!org || !to) return null;
    return {
      to,
      locale: mailLocale(choice?.locale),
      workspace: org.kind === "personal" ? null : org.name,
      wasTrial: org.paidUntil === null,
    };
  });
}

export async function sendPlanNotices(): Promise<PlanNoticeReport> {
  const report: PlanNoticeReport = { due: 0, sent: 0, failed: 0 };
  if (!billingOn() || !mailConfigured()) return report;

  for (const due of await dueNotices()) {
    const day = lastDay(due.endsAt);
    const key = `billing:${due.kind}:${due.orgId}:${due.userId}:${day}`;
    let to: Target | null;
    try {
      to = await target({ orgId: due.orgId, userId: due.userId });
    } catch (error) {
      await log.error("billing: notice not read", { orgId: due.orgId, error: errorName(error) });
      continue;
    }
    if (!to) continue;
    if ((await countOne(key, KEPT_MS)).count > 1) continue;
    report.due += 1;
    const price = await workspacePriceForJob(due.orgId);
    const mail = planNoticeMail(mailWords(to.locale), {
      kind: due.kind,
      workspace: to.workspace,
      date: formatLongDay(day, to.locale),
      price: price?.yearlyDkk ? formatKroner(price.yearlyDkk, to.locale) : null,
      wasTrial: to.wasTrial,
      url: appLink("/settings/subscription", to.locale),
    });
    if (await sendMail({ to: to.to, ...mail })) report.sent += 1;
    else {
      report.failed += 1;
      await forget(key);
    }
  }
  return report;
}
