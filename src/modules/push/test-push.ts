import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
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
 * was about. A test changes nothing in the database; the server keeps the
 * moment it was sent in memory instead, for as long as a push can wait at
 * the push service, and `latest` answers "Sådan ser en påmindelse fra
 * Kadence ud" until a real reminder goes out after it. One process is the
 * whole installation (src/core/rate-limit.ts says the same); after a
 * restart the test shows the plain words, which is still a test that
 * arrived.
 */

export const TESTS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;
const REMEMBERED_MS = PUSH_TTL_SECONDS * 1000;

const state = globalThis as unknown as { kadenceTestPushes?: Map<string, number> };
const sentAt = () => (state.kadenceTestPushes ??= new Map<string, number>());

/** When a test push last went to this person, while it can still arrive. */
export function testSentAt(userId: string, now: Date = new Date()): Date | null {
  const at = sentAt().get(userId);
  if (at === undefined) return null;
  if (now.getTime() - at > REMEMBERED_MS) {
    sentAt().delete(userId);
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
  if (!rateLimit(`push-test:${ctx.userId}`, TESTS_PER_HOUR, HOUR_MS).allowed)
    throw new Refused("conflict", "too_many_test_reminders");

  // Before the push: the worker may ask what it was before the post returns.
  sentAt().set(ctx.userId, now.getTime());
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
