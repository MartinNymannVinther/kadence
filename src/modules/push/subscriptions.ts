import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { authDb } from "@/core/db/client";
import { memberships, PUSH_KINDS, pushSubscriptions, type PushKind } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { remindersOn } from "@/core/features";
import { whoAmIIn, type Me } from "@/modules/team/access";
import { kindsFor, KIND_ORDER } from "./due";
import { isPushEndpoint, MAX_ENDPOINT_LENGTH, pushService } from "./endpoint";
import { visibleChildren } from "./facts";

/**
 * A person's reminders, one browser at a time (docs/adr/0060). Every
 * function runs as the person in the active team, and the table's policy
 * lets a person see and change their own rows and nobody else's — a coach
 * included. The push address comes from the person's own browser and is
 * taken only when it belongs to a known push service.
 */

export const Endpoint = z.string().trim().max(MAX_ENDPOINT_LENGTH).refine(isPushEndpoint);
export const Kinds = z.array(z.enum(PUSH_KINDS)).max(PUSH_KINDS.length);

/** The reminders that mean something to this person on this team. */
export function kindsForMe(me: Me): PushKind[] {
  return kindsFor({
    isCoach: me.isCoach,
    isRider: me.rider !== null,
    isParent: visibleChildren(me).length > 0,
  });
}

function requireOn(): void {
  if (!remindersOn()) throw new Refused("notFound");
}

/** The teams a person belongs to, read on the role that may before a team is chosen. */
export async function teamsOf(userId: string): Promise<string[]> {
  const rows = await authDb
    .select({ orgId: memberships.organizationId })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
  return rows.map((r) => r.orgId);
}

export type ReminderState = {
  subscribed: boolean;
  kinds: PushKind[];
  offered: PushKind[];
  /** When this browser's reminders were turned on here, for the card's status line. */
  since: string | null;
};

const ordered = (kinds: readonly string[]) => KIND_ORDER.filter((kind) => kinds.includes(kind));

/** This person's row for this browser on this team. The policy says the same; this says it first. */
const thisBrowser = (ctx: OrgContext, endpoint: string) =>
  and(
    eq(pushSubscriptions.orgId, ctx.orgId),
    eq(pushSubscriptions.userId, ctx.userId),
    eq(pushSubscriptions.endpoint, endpoint),
  );

/** Whether this browser has reminders on this team, and which. */
export async function reminderState(ctx: OrgContext, endpoint: string): Promise<ReminderState> {
  requireOn();
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me) throw new Refused("forbidden");
    const [row] = await tx
      .select({ kinds: pushSubscriptions.kinds, createdAt: pushSubscriptions.createdAt })
      .from(pushSubscriptions)
      .where(thisBrowser(ctx, endpoint));
    return {
      subscribed: Boolean(row),
      kinds: ordered(row?.kinds ?? []),
      offered: kindsForMe(me),
      since: row?.createdAt.toISOString() ?? null,
    };
  });
}

/**
 * Turns reminders on for this browser on this team, with every reminder
 * the person's roles offer. A browser already on keeps its choices, and
 * nothing that happened before now is told.
 */
export async function subscribe(ctx: OrgContext, endpoint: string): Promise<ReminderState> {
  requireOn();
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me) throw new Refused("forbidden");
    const offered = kindsForMe(me);
    if (offered.length === 0) throw new Refused("forbidden");
    const [existing] = await tx
      .select({ kinds: pushSubscriptions.kinds, createdAt: pushSubscriptions.createdAt })
      .from(pushSubscriptions)
      .where(thisBrowser(ctx, endpoint));
    if (existing)
      return {
        subscribed: true,
        kinds: ordered(existing.kinds),
        offered,
        since: existing.createdAt.toISOString(),
      };
    const [made] = await tx
      .insert(pushSubscriptions)
      // Nothing before now is told: the run's marks start at the
      // subscription's own making (runs.ts).
      .values({ orgId: ctx.orgId, userId: ctx.userId, endpoint, kinds: offered })
      .returning({ createdAt: pushSubscriptions.createdAt });
    return {
      subscribed: true,
      kinds: offered,
      offered,
      since: made?.createdAt.toISOString() ?? null,
    };
  });
}

/** Chooses which reminders this browser gets on this team; only those the roles offer. */
export async function setKinds(
  ctx: OrgContext,
  endpoint: string,
  kinds: PushKind[],
): Promise<ReminderState> {
  requireOn();
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me) throw new Refused("forbidden");
    const offered = kindsForMe(me);
    const chosen = offered.filter((kind) => kinds.includes(kind));
    const rows = await tx
      .update(pushSubscriptions)
      .set({ kinds: chosen })
      .where(thisBrowser(ctx, endpoint))
      .returning({ createdAt: pushSubscriptions.createdAt });
    const [row] = rows;
    if (!row) throw new Refused("notFound");
    return { subscribed: true, kinds: chosen, offered, since: row.createdAt.toISOString() };
  });
}

/**
 * Turns reminders off for this browser on every team the person is on:
 * the browser has let go of the address, so no team should keep it.
 */
export async function unsubscribe(ctx: OrgContext, endpoint: string): Promise<void> {
  for (const orgId of await teamsOf(ctx.userId)) {
    const team = { orgId, userId: ctx.userId };
    await withOrgContext(team, (tx) =>
      tx.delete(pushSubscriptions).where(thisBrowser(team, endpoint)),
    );
  }
}

export type MyReminder = { id: string; service: string; kinds: PushKind[]; createdAt: Date };

/** The person's browsers with reminders on this team, named by push service, never by address. */
export async function listMine(ctx: OrgContext): Promise<MyReminder[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select()
      .from(pushSubscriptions)
      .orderBy(asc(pushSubscriptions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      service: pushService(row.endpoint),
      kinds: ordered(row.kinds),
      createdAt: row.createdAt,
    }));
  });
}
