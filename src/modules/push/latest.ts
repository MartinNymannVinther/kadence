import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { mondayOf } from "@/core/dates";
import { whoAmIIn } from "@/modules/team/access";
import { copenhagenClock, lastTold, mayBeWellbeing } from "./due";
import { newestComment, newestPlanChange, visibleChildren } from "./facts";
import { toldMine, type ToldOnce } from "./runs";
import { teamsOf } from "./subscriptions";
import { testSentAt } from "./test-push";
import { checkinTurnedRedAt } from "./wellbeing";

/**
 * What the service worker shows when a push wakes it (docs/adr/0060).
 * The push carried nothing, so the browser asks `GET /api/push/latest`
 * with the person's own cookies, and this answers as that person: the
 * reminder last written down on their newest-told subscription, read
 * under the ordinary policies. Someone else signed in on the same
 * browser gets their own answer, never the owner's.
 *
 * A note is words and a path, not text: the route renders it in the
 * person's language from messages/*.json (texts.ts). A coach's note about
 * a rider in the red zone has no words at all: not who, and not what they
 * answered, because a lock screen is read by whoever holds the phone.
 */

/** Where a coach sees who: the team's points of attention (src/components/insight/signals.ts). */
export const ATTENTION_PATH = "/calendar#opmaerksomhed";
/** Where "Send en prøve" is, for a tap on the test. */
export const REMINDERS_PATH = "/settings/me";

export type Note =
  | {
      kind: "comment";
      /** The session's or the ride's title; null for a comment on a day. */
      title: string | null;
      author: string | null;
      path: string;
    }
  | { kind: "plan"; path: string }
  | { kind: "checkin"; path: string }
  | { kind: "week"; children: string[]; path: string }
  | { kind: "wellbeing"; path: string }
  | { kind: "test"; path: string };

/** How far back news is looked for behind the moment it was told. */
const NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function commentPath(c: {
  plannedSessionId: string | null;
  activityId: string | null;
  onDate: string | null;
  riderId: string;
}): string {
  if (c.plannedSessionId) return `/calendar/session/${c.plannedSessionId}`;
  if (c.activityId) return `/activities/${c.activityId}`;
  const week = c.onDate ? mondayOf(c.onDate) : null;
  return week ? `/calendar?week=${week}&rider=${c.riderId}` : "/calendar";
}

async function news(tx: AppTransaction, ctx: OrgContext, row: ToldOnce): Promise<Note | null> {
  const me = await whoAmIIn(tx, ctx);
  if (!me) return null;
  const range = { after: new Date(row.toldUpTo.getTime() - NEWS_WINDOW_MS), upTo: row.toldUpTo };
  const comment = row.kinds.includes("comment") ? await newestComment(tx, ctx, me, range) : null;
  const plan =
    row.kinds.includes("plan") && me.rider
      ? await newestPlanChange(tx, ctx, me.rider.id, range, copenhagenClock(row.toldUpTo).date)
      : null;
  if (plan && (!comment || plan > comment.at)) return { kind: "plan", path: "/calendar" };
  if (!comment) return null;
  return {
    kind: "comment",
    title: comment.sessionTitle || comment.activityTitle || null,
    author: comment.authorName || null,
    path: commentPath(comment),
  };
}

/** The note for one subscription, read as its owner. */
export async function noteFor(ctx: OrgContext, row: ToldOnce): Promise<Note | null> {
  const told = lastTold(row);
  const wellbeing = mayBeWellbeing(row);
  if (!told && !wellbeing) return null;
  return withOrgContext(ctx, async (tx) => {
    if (told === "news") return news(tx, ctx, row);
    const me = await whoAmIIn(tx, ctx);
    if (!me) return null;
    if (wellbeing && (await checkinTurnedRedAt(tx, ctx, me, row.toldUpTo)))
      return { kind: "wellbeing", path: ATTENTION_PATH };
    if (told === "checkin") return me.rider ? { kind: "checkin", path: "/today" } : null;
    const children = visibleChildren(me);
    return told === "week" && children.length > 0
      ? { kind: "week", children, path: "/parents" }
      : null;
  });
}

/**
 * The newest reminder for the person signed in: on whichever team and
 * browser one went out last, or the person's own test when nothing has
 * gone out since. Null when there is nothing to say; the route then gives
 * the plain "there is something new".
 */
export async function latestFor(userId: string, now: Date = new Date()): Promise<Note | null> {
  let newest: { ctx: OrgContext; row: ToldOnce } | null = null;
  for (const orgId of await teamsOf(userId)) {
    const ctx = { orgId, userId };
    const rows = await withOrgContext(ctx, (tx) => toldMine(tx));
    for (const row of rows) if (!newest || row.toldAt > newest.row.toldAt) newest = { ctx, row };
  }
  const tested = await testSentAt(userId, now);
  if (tested && (!newest || tested >= newest.row.toldAt))
    return { kind: "test", path: REMINDERS_PATH };
  return newest ? noteFor(newest.ctx, newest.row) : null;
}
