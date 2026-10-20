import { and, eq, gt, isNull } from "drizzle-orm";
import { recordAuthEvent } from "@/core/audit/events";
import { authDb } from "@/core/db/client";
import { accessInvitations } from "@/core/db/schema";
import { personalSpecOf, type PersonalSpec } from "./personal";
import { hashInvitationToken } from "./tokens";

/**
 * Admitting: the last of admission's three steps (service.ts). The person
 * opens the link and registers, which spends the key; the signup gate in
 * src/core/auth/signup.ts asks `invitationAdmits` whether to let them
 * through. On the auth role.
 */

export type ValidInvitation = {
  id: string;
  email: string;
  organizationName: string;
  /** Null for a club; what the personal workspace is to hold otherwise (docs/adr/0080). */
  personal: PersonalSpec | null;
};

/** The invitation behind a token, if it can still be used. */
export async function findValidInvitation(token: string): Promise<ValidInvitation | null> {
  if (!token) return null;
  const [row] = await authDb
    .select({
      id: accessInvitations.id,
      email: accessInvitations.email,
      organizationName: accessInvitations.organizationName,
      kind: accessInvitations.kind,
      birthYear: accessInvitations.birthYear,
      forWhom: accessInvitations.forWhom,
      childName: accessInvitations.childName,
      childEmail: accessInvitations.childEmail,
    })
    .from(accessInvitations)
    .where(
      and(
        eq(accessInvitations.tokenHash, hashInvitationToken(token)),
        isNull(accessInvitations.usedAt),
        isNull(accessInvitations.revokedAt),
        gt(accessInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    organizationName: row.organizationName,
    personal: personalSpecOf(row),
  };
}

/**
 * Does this token admit this address? The address is part of the check
 * on purpose: a key is for one person, and a leaked link must not let
 * someone else register under a different e-mail.
 */
export async function invitationAdmits(token: string | null | undefined, email: string) {
  if (!token) return false;
  const invitation = await findValidInvitation(token);
  return invitation !== null && invitation.email === email.trim().toLowerCase();
}

/** Burns the key the moment the account exists. */
export async function consumeInvitation(token: string, userId: string): Promise<void> {
  const [row] = await authDb
    .update(accessInvitations)
    .set({ usedAt: new Date(), usedByUserId: userId })
    .where(
      and(
        eq(accessInvitations.tokenHash, hashInvitationToken(token)),
        isNull(accessInvitations.usedAt),
      ),
    )
    .returning({ id: accessInvitations.id });
  if (!row) return;
  await recordAuthEvent({
    action: "invitation.used",
    actorUserId: userId,
    entityType: "access_invitations",
    entityId: row.id,
  });
}
