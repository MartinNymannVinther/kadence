import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { guardians, riders, users, type GuardianRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach, whoAmIIn } from "./access";

/**
 * A rider's parents. A coach adds one and sends the invitation; the link
 * gives the parent nothing until the rider confirms it, and the database
 * enforces that only the rider can (the trigger in drizzle/0003). From the
 * year the rider turns 18 the rider confirms again, as an adult, or the
 * link lapses (ADR 0011).
 */

export const RELATIONS = ["mother", "father", "guardian", "other"] as const;

export const GuardianInput = z.object({
  riderId: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  relation: z.enum(RELATIONS).default("guardian"),
});

export type GuardianWithAccount = GuardianRow & {
  /** The account that holds the link — what the rider says yes to, not the name a coach typed. */
  accountName: string | null;
  accountEmail: string | null;
};

export async function listGuardians(
  ctx: OrgContext,
  riderId: string,
): Promise<GuardianWithAccount[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({ guardian: guardians, accountName: users.name, accountEmail: users.email })
      .from(guardians)
      .leftJoin(users, eq(users.id, guardians.userId))
      .where(eq(guardians.riderId, riderId))
      .orderBy(asc(guardians.createdAt));
    return rows.map((r) => ({
      ...r.guardian,
      accountName: r.accountName ?? null,
      accountEmail: r.accountEmail ?? null,
    }));
  });
}

/**
 * Every link the caller may see, for the team's list of riders: all of
 * them for a coach, a rider's own parents for a rider, their own for a
 * parent. The database decides; this is a plain select under RLS.
 */
export async function listTeamGuardians(ctx: OrgContext): Promise<GuardianRow[]> {
  return withOrgContext(ctx, (tx) => tx.select().from(guardians).orderBy(asc(guardians.createdAt)));
}

export async function addGuardian(
  ctx: OrgContext,
  input: z.infer<typeof GuardianInput>,
): Promise<{ id: string }> {
  return withOrgContext(ctx, (tx) => addGuardianIn(tx, ctx, input));
}

/** The same, inside a transaction a caller already holds — a whole team at once (bulk-invite.ts). */
export async function addGuardianIn(
  tx: AppTransaction,
  ctx: OrgContext,
  input: z.infer<typeof GuardianInput>,
): Promise<{ id: string }> {
  await requireCoach(tx, ctx);
  const [rider] = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(eq(riders.id, input.riderId));
  if (!rider) throw new Refused("notFound");
  const [row] = await tx
    .insert(guardians)
    .values({ orgId: ctx.orgId, ...input })
    .returning({ id: guardians.id });
  return row!;
}

export async function attachGuardianInvitation(
  ctx: OrgContext,
  guardianId: string,
  invitationId: string,
): Promise<void> {
  await withOrgContext(ctx, (tx) => attachGuardianInvitationIn(tx, ctx, guardianId, invitationId));
}

export async function attachGuardianInvitationIn(
  tx: AppTransaction,
  ctx: OrgContext,
  guardianId: string,
  invitationId: string,
): Promise<void> {
  await requireCoach(tx, ctx);
  await tx
    .update(guardians)
    .set({ invitationId })
    .where(and(eq(guardians.id, guardianId), isNull(guardians.userId)));
}

/** The rider says yes to a parent — or, as an adult, yes again. */
export async function confirmGuardian(ctx: OrgContext, guardianId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden");
    const [link] = await tx
      .select({ userId: guardians.userId })
      .from(guardians)
      .where(and(eq(guardians.id, guardianId), eq(guardians.riderId, me.rider.id)));
    if (!link) throw new Refused("notFound");
    // The rider says yes to a person, not to a name a coach typed: a link
    // nobody holds yet cannot be confirmed (drizzle/0007).
    if (!link.userId) throw new Refused("conflict", "notJoined");
    const adult = new Date().getFullYear() >= me.rider.birthYear + 18;
    const rows = await tx
      .update(guardians)
      .set({ confirmedAt: new Date(), confirmedAsAdult: adult })
      .where(and(eq(guardians.id, guardianId), eq(guardians.riderId, me.rider.id)))
      .returning({ id: guardians.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

/** Ends a link: the coach, the rider, or the parent themselves. */
export async function removeGuardian(ctx: OrgContext, guardianId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .delete(guardians)
      .where(eq(guardians.id, guardianId))
      .returning({ id: guardians.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}
