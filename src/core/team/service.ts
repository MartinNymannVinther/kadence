import { APIError } from "better-auth";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/core/auth/auth";
import { authDb } from "@/core/db/client";
import { invitations, organizations, users } from "@/core/db/schema";
import { env } from "@/core/env";
import { errorName, log, requestIdFrom } from "@/core/log";

/**
 * The team: who is in a workspace, and how somebody joins it.
 *
 * Admission (src/core/access) is about a stranger getting a workspace of
 * their own on a closed installation. This is the other door: a member
 * of an existing workspace inviting a colleague into it. Both doors lead
 * through Better Auth's organization invitations, whose id is the key in
 * the link, so the invariants the plugin already enforces hold — one
 * pending invitation per address, an expiry, the recipient's address has
 * to match, only owners and admins may invite.
 *
 * The person who invites copies the link and sends it the way they talk
 * to their colleague anyway. Where the installation sends mail, a coach
 * can also send a rider's or a parent's link to its address from the
 * riders page (src/modules/team/mail-invitation.ts, docs/adr/0086).
 */

export const TEAM_ROLES = ["member", "admin"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const InviteSchema = z.object({
  email: z.email().max(320),
  role: z.enum(TEAM_ROLES),
});

export type IssuedTeamInvitation = {
  id: string;
  email: string;
  role: string;
  url: string;
  expiresAt: Date;
};

/** Where the link points: the invitation page on the installation's public origin. */
export function joinUrl(invitationId: string): string {
  return new URL(`/join/${invitationId}`, env.BETTER_AUTH_URL).toString();
}

export type InviteError = "alreadyMember" | "alreadyInvited" | "forbidden" | "invalid" | "generic";

/**
 * `organizationId` is for server code that already holds the team it
 * works in (bulk-invite.ts), so the invitation lands on the same team as
 * the rows it is attached to; without it, the session's active team.
 * Never taken from a request.
 */
export async function inviteMember(
  headers: Headers,
  input: unknown,
  organizationId?: string,
): Promise<{ ok: true; invitation: IssuedTeamInvitation } | { ok: false; error: InviteError }> {
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const invitation = await auth.api.createInvitation({
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        ...(organizationId ? { organizationId } : {}),
      },
      headers,
    });
    return {
      ok: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        url: joinUrl(invitation.id),
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    if (error instanceof APIError) {
      const message = String(error.body?.message ?? "");
      if (/already a member/i.test(message)) return { ok: false, error: "alreadyMember" };
      if (/already invited/i.test(message)) return { ok: false, error: "alreadyInvited" };
      if (error.status === "FORBIDDEN" || /not allowed/i.test(message))
        return { ok: false, error: "forbidden" };
    }
    await log.error("team: invitation failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return { ok: false, error: "generic" };
  }
}

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  url: string;
  expiresAt: Date;
};

/** The open invitations of a workspace, for the members page. */
export async function listPendingInvitations(orgId: string): Promise<PendingInvitation[]> {
  const rows = await authDb
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, orgId),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(invitations.createdAt);
  return rows.map((row) => ({ ...row, role: row.role ?? "member", url: joinUrl(row.id) }));
}

export async function cancelInvitation(headers: Headers, invitationId: string): Promise<boolean> {
  try {
    await auth.api.cancelInvitation({ body: { invitationId }, headers });
    return true;
  } catch (error) {
    await log.error("team: cancelling invitation failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return false;
  }
}

export type InvitationView = {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  inviterName: string;
  /** pending | expired | accepted | canceled | rejected */
  state: string;
};

/**
 * What the invitation page shows before anybody is signed in. The
 * invitation id is the key, and it names a workspace and an address, so
 * this is read on the auth role by id and nothing else.
 */
export async function findTeamInvitation(invitationId: string): Promise<InvitationView | null> {
  if (!invitationId || invitationId.length > 200) return null;
  const [row] = await authDb
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      workspaceName: organizations.name,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.inviterId))
    .where(eq(invitations.id, invitationId))
    .limit(1);
  if (!row) return null;
  const state =
    row.status === "pending" && row.expiresAt.getTime() <= Date.now() ? "expired" : row.status;
  return {
    id: row.id,
    email: row.email,
    role: row.role ?? "member",
    workspaceName: row.workspaceName,
    inviterName: row.inviterName ?? "",
    state,
  };
}

/** Does this invitation admit this address to register? The signup gate asks. */
export async function teamInvitationAdmits(invitationId: string, email: string): Promise<boolean> {
  const [row] = await authDb
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
        sql`lower(${invitations.email}) = ${email.trim().toLowerCase()}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export type AcceptResult = "accepted" | "wrongPerson" | "invalid" | "failed";

/** The signed-in person accepts; Better Auth checks the address and the expiry itself. */
export async function acceptTeamInvitation(
  headers: Headers,
  invitationId: string,
): Promise<AcceptResult> {
  try {
    const accepted = await auth.api.acceptInvitation({ body: { invitationId }, headers });
    // Better Auth makes the team the active one in the database only. Set
    // again through its own door, it is written into the session's cookie
    // cache too (docs/adr/0083), so the next page opens the team just
    // joined rather than the one the cookie remembers.
    const organizationId = accepted?.member.organizationId;
    if (organizationId)
      await auth.api
        .setActiveOrganization({ body: { organizationId }, headers })
        .catch((error: unknown) => console.error("team: opening the joined team failed", error));
    return "accepted";
  } catch (error) {
    if (error instanceof APIError) {
      const message = String(error.body?.message ?? "");
      if (/recipient/i.test(message)) return "wrongPerson";
      if (/not found|expired/i.test(message)) return "invalid";
    }
    await log.error("team: accepting invitation failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return "failed";
  }
}

export type MemberRole = "owner" | "admin" | "member";

export async function removeMember(headers: Headers, memberIdOrEmail: string): Promise<boolean> {
  try {
    await auth.api.removeMember({ body: { memberIdOrEmail }, headers });
    return true;
  } catch (error) {
    await log.error("team: removing member failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return false;
  }
}

export async function updateMemberRole(
  headers: Headers,
  memberId: string,
  role: "admin" | "member",
): Promise<boolean> {
  try {
    await auth.api.updateMemberRole({ body: { memberId, role }, headers });
    return true;
  } catch (error) {
    await log.error("team: changing role failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return false;
  }
}

export async function leaveWorkspace(headers: Headers, organizationId: string): Promise<boolean> {
  try {
    await auth.api.leaveOrganization({ body: { organizationId }, headers });
    return true;
  } catch (error) {
    await log.error("team: leaving failed", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return false;
  }
}
