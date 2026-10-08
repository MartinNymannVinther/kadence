import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { guardians, memberships, riders, users } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { isCoachRole, requireCoach } from "./access";
import { RELATIONS } from "./guardians";

/**
 * A parent who is already on the team, linked to one more child
 * (docs/backlog.md P2-16, ADR 0064 amended): a brother's mother, a coach
 * whose own daughter rides. The coach picks the member; the guardian row
 * is made with their account already on it, so there is no invitation,
 * and — as for every parent — the link shows the parent nothing until
 * the rider has said yes to that person (ADR 0010, 0011). The trigger in
 * drizzle/0003 and 0007 refuses a link made already confirmed.
 */

const id = z.string().min(1).max(100);

export const MemberGuardianInput = z.object({
  riderId: id,
  userId: id,
  relation: z.enum(RELATIONS).default("guardian"),
});
export type MemberGuardianInputT = z.infer<typeof MemberGuardianInput>;

export type LinkableMember = {
  userId: string;
  name: string;
  /** What they already are on the team, so the coach picks the right one. */
  isCoach: boolean;
  isRider: boolean;
  parentOf: string[];
};

export async function linkMemberAsGuardian(
  ctx: OrgContext,
  input: MemberGuardianInputT,
): Promise<{ id: string }> {
  return withOrgContext(ctx, (tx) => linkMemberAsGuardianIn(tx, ctx, input));
}

/**
 * The same inside a transaction a caller holds — "Inviter hele holdet"
 * links an address that is already a member this way (bulk-invite.ts).
 * `name` is what the guardian row is called; the account's own name when
 * none is given.
 */
export async function linkMemberAsGuardianIn(
  tx: AppTransaction,
  ctx: OrgContext,
  input: MemberGuardianInputT & { name?: string },
): Promise<{ id: string }> {
  await requireCoach(tx, ctx);
  const [rider] = await tx
    .select({ id: riders.id, userId: riders.userId })
    .from(riders)
    .where(eq(riders.id, input.riderId));
  if (!rider) throw new Refused("notFound");
  const [member] = await tx
    .select({ name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, ctx.orgId), eq(memberships.userId, input.userId)));
  if (!member) throw new Refused("notFound");
  if (rider.userId === input.userId) throw new Refused("conflict", "parentIsRider");
  const [linked] = await tx
    .select({ id: guardians.id })
    .from(guardians)
    .where(and(eq(guardians.riderId, rider.id), eq(guardians.userId, input.userId)));
  if (linked) throw new Refused("conflict", "alreadyParent");
  const [row] = await tx
    .insert(guardians)
    .values({
      orgId: ctx.orgId,
      riderId: rider.id,
      userId: input.userId,
      name: (input.name ?? member.name).trim().slice(0, 120) || member.name,
      relation: input.relation,
    })
    .returning({ id: guardians.id });
  return row!;
}

/**
 * The team's members a coach may link to this rider as a parent: everyone
 * but the rider and those already linked to them, by name, with what they
 * already are on the team. Names only; no address leaves the server.
 */
export async function listLinkableMembers(
  ctx: OrgContext,
  riderId: string,
): Promise<LinkableMember[]> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    // One transaction is one connection: its queries go one after another.
    const members = await tx
      .select({ userId: users.id, name: users.name, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, ctx.orgId))
      .orderBy(asc(users.name));
    const riderRows = await tx
      .select({ id: riders.id, userId: riders.userId, name: riders.name })
      .from(riders);
    const links = await tx
      .select({ riderId: guardians.riderId, userId: guardians.userId })
      .from(guardians);
    const nameOf = new Map(riderRows.map((r) => [r.id, r.name]));
    const self = riderRows.find((r) => r.id === riderId)?.userId ?? null;
    const taken = new Set(links.filter((l) => l.riderId === riderId).map((l) => l.userId));
    return members
      .filter((m) => m.userId !== self && !taken.has(m.userId))
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        isCoach: isCoachRole(m.role),
        isRider: riderRows.some((r) => r.userId === m.userId),
        parentOf: links
          .filter((l) => l.userId === m.userId)
          .flatMap((l) => nameOf.get(l.riderId) ?? []),
      }));
  });
}
