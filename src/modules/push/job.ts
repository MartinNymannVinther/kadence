import { and, eq, inArray, sql } from "drizzle-orm";
import { appDb } from "@/core/db/client";
import { pushSubscriptions, type PushSubscriptionRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { copenhagenClock, decide, isQuiet, type Mark } from "./due";
import { pushService } from "./endpoint";
import { gatherFacts } from "./facts";
import { sendPush, type PushConfig } from "./send";

/**
 * The reminder run (docs/adr/0059), every ten minutes and on
 * `POST /api/push/tick`.
 *
 * It starts with nobody signed in, so the one thing it may read across
 * people is `push_subscriptions_due()` (drizzle/0028): which subscriptions
 * exist, whose and on which team. Everything after that — the address,
 * the choices, the comments, the plan, the check-in — is read as the
 * subscription's owner, under the same policies as the owner's own
 * pages. A reminder can only ever be about something its owner can open.
 *
 * One reminder per person per run: the first team with something due
 * gets it, on each of the person's browsers there that are due the same
 * kind of reminder, and the rest waits for the next run. The reminder is written down
 * before it is sent, with a check that nobody wrote it first, so two runs
 * at once — the timer and a tick, or two servers — send it once. A push
 * service that says the browser has gone (404, 410) has its address
 * deleted; one that fails for a moment has the mark taken back, so the
 * next run tries again. Nothing is sent in the quiet hours.
 */

export type RunReport = {
  quiet: boolean;
  people: number;
  sent: number;
  gone: number;
  failed: number;
};

type Due = { id: string; orgId: string; userId: string };
type Marked = { row: PushSubscriptionRow; mark: Mark };

async function dueSubscriptions(): Promise<Due[]> {
  const result = await appDb.execute(sql`select id, org_id, user_id from push_subscriptions_due()`);
  return (result.rows as Array<{ id: string; org_id: string; user_id: string }>).map((r) => ({
    id: r.id,
    orgId: r.org_id,
    userId: r.user_id,
  }));
}

/** Each person's teams, in order, with the subscriptions on each. */
function byPerson(due: Due[]): Map<string, Map<string, string[]>> {
  const people = new Map<string, Map<string, string[]>>();
  for (const row of due) {
    const teams = people.get(row.userId) ?? new Map<string, string[]>();
    teams.set(row.orgId, [...(teams.get(row.orgId) ?? []), row.id]);
    people.set(row.userId, teams);
  }
  return people;
}

const markValues = (mark: Mark) =>
  mark.slot === "news"
    ? { toldUpTo: mark.toldUpTo }
    : mark.slot === "checkin"
      ? { checkinRemindedOn: mark.checkinRemindedOn }
      : { weekToldOn: mark.weekToldOn };

/** Written only if nobody has written it since the row was read. */
function unchanged(row: PushSubscriptionRow, mark: Mark) {
  if (mark.slot === "news")
    return sql`date_trunc('milliseconds', ${pushSubscriptions.toldUpTo}) = ${row.toldUpTo}`;
  if (mark.slot === "checkin")
    return sql`${pushSubscriptions.checkinRemindedOn} is distinct from ${mark.checkinRemindedOn}`;
  return sql`${pushSubscriptions.weekToldOn} is distinct from ${mark.weekToldOn}`;
}

/**
 * As the person on one team: what is due on each of their browsers, and
 * the reminder written down on those that get it. Returns what to send.
 */
async function decideAndMark(ctx: OrgContext, ids: string[], now: Date): Promise<Marked[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, ids));
    if (rows.length === 0) return [];
    const me = await whoAmIIn(tx, ctx);
    if (!me) return [];
    const since = new Date(Math.min(...rows.map((r) => r.toldUpTo.getTime())));
    const facts = await gatherFacts(
      tx,
      ctx,
      me,
      { after: since, upTo: now },
      copenhagenClock(now).date,
    );
    const decisions = rows.flatMap((row) => {
      const decision = decide(row, facts, now);
      return decision ? [{ row, decision }] : [];
    });
    const first = decisions[0];
    if (!first) return [];

    const marked: Marked[] = [];
    for (const { row, decision } of decisions) {
      if (decision.mark.slot !== first.decision.mark.slot) continue;
      const written = await tx
        .update(pushSubscriptions)
        // updated_at is the moment it went out; see lastTold in due.ts.
        .set({ ...markValues(decision.mark), updatedAt: now })
        .where(and(eq(pushSubscriptions.id, row.id), unchanged(row, decision.mark)))
        .returning({ id: pushSubscriptions.id });
      if (written.length === 1) marked.push({ row, mark: decision.mark });
    }
    return marked;
  });
}

/** The reminder could not go out this time: take the mark back for the next run. */
async function unmark(ctx: OrgContext, { row, mark }: Marked): Promise<void> {
  const previous =
    mark.slot === "news"
      ? { toldUpTo: row.toldUpTo }
      : mark.slot === "checkin"
        ? { checkinRemindedOn: row.checkinRemindedOn }
        : { weekToldOn: row.weekToldOn };
  await withOrgContext(ctx, (tx) =>
    tx.update(pushSubscriptions).set(previous).where(eq(pushSubscriptions.id, row.id)),
  );
}

async function forget(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, (tx) =>
    tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)),
  );
}

export async function runReminders(config: PushConfig, now: Date = new Date()): Promise<RunReport> {
  const report: RunReport = { quiet: false, people: 0, sent: 0, gone: 0, failed: 0 };
  if (isQuiet(copenhagenClock(now))) return { ...report, quiet: true };

  for (const [userId, teams] of byPerson(await dueSubscriptions())) {
    report.people += 1;
    for (const [orgId, ids] of teams) {
      const ctx = { orgId, userId };
      let marked: Marked[];
      try {
        marked = await decideAndMark(ctx, ids, now);
      } catch (error) {
        console.error("reminders: could not decide", error instanceof Error ? error.message : "");
        continue;
      }
      if (marked.length === 0) continue;
      for (const item of marked) {
        const result = await sendPush(item.row.endpoint, config, now);
        try {
          if (result.outcome === "sent") report.sent += 1;
          else if (result.outcome === "gone") {
            report.gone += 1;
            await forget(ctx, item.row.id);
          } else {
            report.failed += 1;
            if (result.transient) await unmark(ctx, item);
          }
        } catch (error) {
          console.error(
            "reminders: could not record",
            pushService(item.row.endpoint),
            error instanceof Error ? error.message : "",
          );
        }
      }
      break;
    }
  }
  return report;
}
