import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { forget, recall, remember } from "@/core/counters";
import { pushSubscriptions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { rateLimit } from "@/core/rate-limit";
import { whoAmIIn } from "@/modules/team/access";
import { PUSH_TTL_SECONDS, sendPush, type PushConfig } from "./send";

/**
 * "Send en prøve" (docs/adr/0060, P1-05): one push, as empty as every
 * other, to the person's own browsers on this team, so they can see on a
 * real phone that reminders arrive. It goes as the person, to their own
 * rows — the policy lets nobody else's be read — and at most three times
 * an hour.
 *
 * The push carries nothing, so the service worker asks `latest` what it
 * was about. A test changes nothing the team owns; the moment it was sent
 * is kept with the counters (src/core/counters.ts, ADR 0083) for as long
 * as a push can wait at the push service, so whichever instance the
 * worker's question reaches knows it, and `latest` answers "Sådan ser en
 * påmindelse fra Kadence ud" until a real reminder goes out after it.
 */

export const TESTS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;
const REMEMBERED_MS = PUSH_TTL_SECONDS * 1000;

/** Kept until the push can no longer arrive: the moment it went is that, less how long it waits. */
const sentKey = (userId: string) => `push-test-sent:${userId}`;

/** When a test push last went to this person, while it can still arrive. */
export async function testSentAt(userId: string, now: Date = new Date()): Promise<Date | null> {
  const until = await recall(sentKey(userId));
  if (until === null) return null;
  const at = until.getTime() - REMEMBERED_MS;
  if (now.getTime() - at > REMEMBERED_MS) {
    await forget(sentKey(userId));
    return null;
  }
  return new Date(at);
}

export type TestReport = { sent: number; gone: number; failed: number };

/**
 * One test push to each of the person's browsers on this team. A browser
 * the push service no longer knows is forgotten, as the reminder run does.
 */
export async function sendTestReminder(
  ctx: OrgContext,
  config: PushConfig | null,
  now: Date = new Date(),
): Promise<TestReport> {
  if (!config) throw new Refused("notFound");
  const rows = await withOrgContext(ctx, async (tx) => {
    if (!(await whoAmIIn(tx, ctx))) throw new Refused("forbidden");
    return tx
      .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.orgId, ctx.orgId), eq(pushSubscriptions.userId, ctx.userId)));
  });
  if (rows.length === 0) throw new Refused("notFound");
  if (!(await rateLimit(`push-test:${ctx.userId}`, TESTS_PER_HOUR, HOUR_MS)).allowed)
    throw new Refused("conflict", "too_many_test_reminders");

  // Before the push: the worker may ask what it was before the post returns.
  await remember(sentKey(ctx.userId), new Date(now.getTime() + REMEMBERED_MS));
  const report: TestReport = { sent: 0, gone: 0, failed: 0 };
  for (const row of rows) {
    const result = await sendPush(row.endpoint, config, now);
    if (result.outcome === "sent") report.sent += 1;
    else if (result.outcome === "failed") report.failed += 1;
    else {
      report.gone += 1;
      await withOrgContext(ctx, (tx) =>
        tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id)),
      );
    }
  }
  return report;
}
