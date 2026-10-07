import { eq, sql } from "drizzle-orm";
import { appDb } from "@/core/db/client";
import { pushSubscriptions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { copenhagenClock, decide, isQuiet, type Mark } from "./due";
import { pushService } from "./endpoint";
import { gatherFacts } from "./facts";
import { markTold, toldFor, unmarkTold, type Told } from "./runs";
import { sendPush, type PushConfig } from "./send";

/**
 * The reminder run (docs/adr/0060), every ten minutes and on
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
 * kind of reminder, and the rest waits for the next run. The reminder is
 * written down before it is sent (`push_runs`, runs.ts, which the audit
 * trail leaves out), with a check that nobody wrote it first, so two runs
 * at once — the timer and a tick, or two servers — send it once. A push
 * service that says the browser has gone (404, 410) has its address
 * deleted; one that fails for a moment has the mark taken back, so the
 * next run tries again. In the quiet hours only a coach's wellbeing
 * reminder goes out; the rest waits (due.ts).
 *
 * Each run also sweeps the deleted sessions past their seven days
 * (`planned_session_deletions_sweep()`, drizzle/0035), the record a plan
 * reminder reads a deletion from.
 */

export type RunReport = {
  /** The run fell in the quiet hours: only wellbeing reminders could go out. */
  quiet: boolean;
  people: number;
  sent: number;
  gone: number;
  failed: number;
};

type Due = { id: string; orgId: string; userId: string };
type Marked = { row: Told; mark: Mark };

async function dueSubscriptions(): Promise<Due[]> {
  const result = await appDb.execute(sql`select id, org_id, user_id from push_subscriptions_due()`);
  return (result.rows as Array<{ id: string; org_id: string; user_id: string }>).map((r) => ({
    id: r.id,
    orgId: r.org_id,
    userId: r.user_id,
  }));
}

/** Deleted sessions past their seven days go; a failure waits for the next run. */
async function sweepDeletions(): Promise<void> {
  try {
    await appDb.execute(sql`select planned_session_deletions_sweep()`);
  } catch (error) {
    console.error("reminders: could not sweep", error instanceof Error ? error.message : "");
  }
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

/**
 * As the person on one team: what is due on each of their browsers, and
 * the reminder written down on those that get it. Returns what to send.
 */
async function decideAndMark(ctx: OrgContext, ids: string[], now: Date): Promise<Marked[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await toldFor(tx, ids);
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
    // A rider in the red zone goes before whatever another browser is due.
    const first = decisions.find((d) => d.decision.kind === "wellbeing") ?? decisions[0];
    if (!first) return [];

    const marked: Marked[] = [];
    for (const { row, decision } of decisions) {
      if (decision.mark.slot !== first.decision.mark.slot) continue;
      if (await markTold(tx, row, decision.mark, now)) marked.push({ row, mark: decision.mark });
    }
    return marked;
  });
}

/** The reminder could not go out this time: take the mark back for the next run. */
async function unmark(ctx: OrgContext, { row, mark }: Marked): Promise<void> {
  await withOrgContext(ctx, (tx) => unmarkTold(tx, row, mark));
}

async function forget(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, (tx) =>
    tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)),
  );
}

export async function runReminders(config: PushConfig, now: Date = new Date()): Promise<RunReport> {
  const quiet = isQuiet(copenhagenClock(now));
  const report: RunReport = { quiet, people: 0, sent: 0, gone: 0, failed: 0 };
  await sweepDeletions();

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
