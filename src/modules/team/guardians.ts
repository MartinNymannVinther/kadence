import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { guardians, riders, type GuardianRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
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

export async function listGuardians(ctx: OrgContext, riderId: string): Promise<GuardianRow[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(guardians)
      .where(eq(guardians.riderId, riderId))
      .orderBy(asc(guardians.createdAt)),
  );
}

export async function addGuardian(
  ctx: OrgContext,
  input: z.infer<typeof GuardianInput>,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
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
  });
}

export async function attachGuardianInvitation(
  ctx: OrgContext,
  guardianId: string,
  invitationId: string,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx
      .update(guardians)
      .set({ invitationId })
      .where(and(eq(guardians.id, guardianId), isNull(guardians.userId)));
  });
}

/** The rider says yes to a parent — or, as an adult, yes again. */
export async function confirmGuardian(ctx: OrgContext, guardianId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden");
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
