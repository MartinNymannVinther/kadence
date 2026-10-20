import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { recordAuthEvent } from "@/core/audit/events";
import { todayInCopenhagen } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { accessInvitations, accessRequests } from "@/core/db/schema";
import { requirePlatformOwner } from "./owner";
import { personalColumns, personalProblem, personalSpecOf, type PersonalSpec } from "./personal";
import { invitationExpiry, invitationUrl, newInvitationToken } from "./tokens";

export { invitationState } from "./state";
export {
  installationHasOwner,
  isPlatformOwner,
  pendingAccessRequestCount,
  platformRoleForNewUser,
} from "./owner";
export {
  AccessRequestSchema,
  personalFrom,
  submitAccessRequest,
  type AccessRequestInput,
  type AccessRequestResult,
  type RequestMeta,
} from "./apply";
export {
  consumeInvitation,
  findValidInvitation,
  invitationAdmits,
  type ValidInvitation,
} from "./admit";

/**
 * Admission: how a stranger becomes an organization on a closed installation.
 *
 * Three moving parts, in the order they happen. A person applies, which
 * stores a request and nothing else. The installation's owner approves it,
 * which mints a single-use invitation for that address. The person opens
 * the link and registers, which consumes the invitation; the signup gate
 * in src/core/auth/signup.ts is what actually asks this module whether to
 * let them through.
 *
 * Everything here runs on the auth role: these tables belong to the
 * installation, not to a tenant, and the application role cannot see them
 * at all (drizzle/0025). Framework-free, so the whole flow is testable
 * without a request. An application is for a club, or for one person's
 * own training (docs/adr/0080, personal.ts); the approval carries which
 * into the invitation, and the registration makes the right workspace.
 */

const thisYear = () => Number(todayInCopenhagen().slice(0, 4));

/* ------------------------------ The owner ------------------------------ */

export type AccessRequestRow = typeof accessRequests.$inferSelect;

export async function listAccessRequests(): Promise<AccessRequestRow[]> {
  // Pending first, oldest first within pending; decided ones newest first.
  return authDb
    .select()
    .from(accessRequests)
    .orderBy(
      sql`case when ${accessRequests.status} = 'pending' then 0 else 1 end`,
      sql`case when ${accessRequests.status} = 'pending' then ${accessRequests.createdAt} end asc`,
      desc(accessRequests.decidedAt),
    );
}

export type InvitationRow = typeof accessInvitations.$inferSelect;

export async function listInvitations(): Promise<InvitationRow[]> {
  return authDb.select().from(accessInvitations).orderBy(desc(accessInvitations.createdAt));
}

/* ------------------------------ Inviting ------------------------------ */

export type IssuedInvitation = { id: string; email: string; url: string; expiresAt: Date };

/**
 * Mints a fresh single-use key for an address. Any earlier open invitation
 * for the same address is revoked first, so "send a new link" is this
 * function called again and there is only ever one live key per person.
 * The plain token is returned once, here, and never stored.
 */
export async function createInvitation(
  actorUserId: string,
  input: {
    email: string;
    organizationName: string;
    accessRequestId?: string | null;
    /** A personal workspace (docs/adr/0080); a club when absent. */
    personal?: PersonalSpec | null;
  },
): Promise<IssuedInvitation> {
  await requirePlatformOwner(actorUserId);
  const email = input.email.trim().toLowerCase();
  const organizationName = input.organizationName.trim();
  if (!email || !organizationName) throw new Error("INVALID");
  const personal = input.personal ?? null;
  if (personal && personalProblem(personal, thisYear())) throw new Error("INVALID");

  const { token, hash } = newInvitationToken();
  const expiresAt = invitationExpiry();

  const created = await authDb.transaction(async (tx) => {
    await tx
      .update(accessInvitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          sql`lower(${accessInvitations.email}) = ${email}`,
          isNull(accessInvitations.usedAt),
          isNull(accessInvitations.revokedAt),
        ),
      );
    const [row] = await tx
      .insert(accessInvitations)
      .values({
        email,
        organizationName,
        ...personalColumns(personal),
        tokenHash: hash,
        invitedBy: actorUserId,
        accessRequestId: input.accessRequestId ?? null,
        expiresAt,
      })
      .returning({ id: accessInvitations.id });
    return row!;
  });

  await recordAuthEvent({
    action: "invitation.created",
    actorUserId,
    entityType: "access_invitations",
    entityId: created.id,
  });

  return { id: created.id, email, url: invitationUrl(token), expiresAt };
}

/** Approves an application: marks it, and hands back the link to send. */
export async function approveAccessRequest(
  actorUserId: string,
  requestId: string,
): Promise<IssuedInvitation> {
  await requirePlatformOwner(actorUserId);
  const [request] = await authDb
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, requestId))
    .limit(1);
  if (!request) throw new Error("NOT_FOUND");

  const invitation = await createInvitation(actorUserId, {
    email: request.email,
    organizationName: request.organizationName,
    accessRequestId: request.id,
    personal: personalSpecOf(request),
  });

  if (request.status === "pending") {
    await authDb
      .update(accessRequests)
      .set({ status: "approved", decidedAt: new Date(), decidedBy: actorUserId })
      .where(eq(accessRequests.id, requestId));
    await recordAuthEvent({
      action: "access.approved",
      actorUserId,
      entityType: "access_requests",
      entityId: request.id,
    });
  }
  return invitation;
}

/**
 * "Ny link" for an invitation already made: the same address, workspace
 * and, for a personal workspace, the same person (docs/adr/0080), so a
 * renewed link makes what the first one would have made.
 */
export async function renewInvitation(
  actorUserId: string,
  invitationId: string,
): Promise<IssuedInvitation> {
  await requirePlatformOwner(actorUserId);
  const [row] = await authDb
    .select()
    .from(accessInvitations)
    .where(eq(accessInvitations.id, invitationId))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  return createInvitation(actorUserId, {
    email: row.email,
    organizationName: row.organizationName,
    accessRequestId: row.accessRequestId,
    personal: personalSpecOf(row),
  });
}

export async function declineAccessRequest(actorUserId: string, requestId: string): Promise<void> {
  await requirePlatformOwner(actorUserId);
  const [row] = await authDb
    .update(accessRequests)
    .set({ status: "declined", decidedAt: new Date(), decidedBy: actorUserId })
    .where(and(eq(accessRequests.id, requestId), eq(accessRequests.status, "pending")))
    .returning({ id: accessRequests.id });
  if (!row) throw new Error("NOT_FOUND");
  await recordAuthEvent({
    action: "access.declined",
    actorUserId,
    entityType: "access_requests",
    entityId: row.id,
  });
}
