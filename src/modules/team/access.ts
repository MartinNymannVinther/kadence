import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { Refused } from "@/core/action";
import { guardians, memberships, riders } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { claimPendingLinks } from "./claim";

/**
 * Who the caller is on this team (docs/adr/0010). A coach is an owner or
 * an admin; a rider has a rider row with their account; a parent has one
 * guardian row per child. One person can be more than one — a coach who
 * also rides — and the pages ask the question they need.
 *
 * The database already refuses what a person may not see or write (ADR
 * 0011); these checks exist so a service can refuse early with a word the
 * interface understands, inside the same transaction as the write.
 */

export type Role = "owner" | "admin" | "member";

export type Child = {
  guardianId: string;
  riderId: string;
  /**
   * Null until the rider has confirmed the link, and while the rider does
   * not share their training: the database hides the rider row then.
   */
  name: string | null;
  confirmed: boolean;
};

export type Me = {
  role: Role;
  isCoach: boolean;
  rider: { id: string; name: string; birthYear: number } | null;
  children: Child[];
};

export async function roleIn(tx: AppTransaction, ctx: OrgContext): Promise<Role | null> {
  const [row] = await tx
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, ctx.userId), eq(memberships.organizationId, ctx.orgId)))
    .limit(1);
  const role = row?.role;
  return role === "owner" || role === "admin" || role === "member" ? role : null;
}

export const isCoachRole = (role: string | null): boolean => role === "owner" || role === "admin";

/** Throws unless the caller coaches this team. */
export async function requireCoach(tx: AppTransaction, ctx: OrgContext): Promise<void> {
  if (!isCoachRole(await roleIn(tx, ctx))) throw new Refused("forbidden");
}

/** Throws unless the caller is a member at all (a removed member's session, say). */
export async function requireMember(tx: AppTransaction, ctx: OrgContext): Promise<Role> {
  const role = await roleIn(tx, ctx);
  if (!role) throw new Refused("forbidden");
  return role;
}

export async function whoAmIIn(tx: AppTransaction, ctx: OrgContext): Promise<Me | null> {
  const role = await roleIn(tx, ctx);
  if (!role) return null;
  const [rider] = await tx
    .select({ id: riders.id, name: riders.name, birthYear: riders.birthYear })
    .from(riders)
    .where(and(eq(riders.userId, ctx.userId), eq(riders.archived, false)))
    .limit(1);
  const links = await tx
    .select({
      guardianId: guardians.id,
      riderId: guardians.riderId,
      confirmedAt: guardians.confirmedAt,
      name: riders.name,
    })
    .from(guardians)
    .leftJoin(riders, eq(riders.id, guardians.riderId))
    .where(eq(guardians.userId, ctx.userId));
  return {
    role,
    isCoach: isCoachRole(role),
    rider: rider ?? null,
    children: links.map((l) => ({
      guardianId: l.guardianId,
      riderId: l.riderId,
      name: l.name ?? null,
      confirmed: l.confirmedAt !== null,
    })),
  };
}

/**
 * The caller, once per request. A member who is neither coach, rider nor
 * parent may have joined through an invitation that carries a prepared
 * rider or guardian row; the link is claimed here, the first time they
 * open the app, whichever door they came in by.
 */
export const whoAmI = cache(async (orgId: string, userId: string): Promise<Me | null> => {
  const ctx = { orgId, userId };
  const me = await withOrgContext(ctx, (tx) => whoAmIIn(tx, ctx));
  if (!me || me.isCoach || me.rider || me.children.length > 0) return me;
  const claimed = await claimPendingLinks(ctx);
  return claimed > 0 ? withOrgContext(ctx, (tx) => whoAmIIn(tx, ctx)) : me;
});

/** The riders the caller may see — the database decides: all for a coach, self, or children. */
export async function visibleRiderIds(tx: AppTransaction): Promise<string[]> {
  const rows = await tx.select({ id: riders.id }).from(riders).where(eq(riders.archived, false));
  return rows.map((r) => r.id);
}

/** Throws unless the caller may write for this rider: a coach, or the rider. */
export async function requireWriteFor(
  tx: AppTransaction,
  ctx: OrgContext,
  riderId: string,
): Promise<void> {
  const me = await whoAmIIn(tx, ctx);
  if (!me) throw new Refused("forbidden");
  if (me.isCoach) {
    const [row] = await tx.select({ id: riders.id }).from(riders).where(eq(riders.id, riderId));
    if (!row) throw new Refused("notFound");
    return;
  }
  if (me.rider?.id !== riderId) throw new Refused("forbidden");
}
