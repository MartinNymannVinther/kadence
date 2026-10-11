"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireOrgContext } from "@/core/auth/guard";
import { getSession } from "@/core/auth/session";
import { pushSubscriptions } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";
import { fail, ok, type Result } from "@/core/result";
import { forgetMailChoice } from "@/modules/push/mail-choice";
import { registerInvited, type JoinRegisterResult } from "./register";
import { createResetLink } from "./reset-link";
import {
  acceptTeamInvitation,
  cancelInvitation,
  inviteMember,
  leaveWorkspace,
  removeMember,
  updateMemberRole,
  type AcceptResult,
  type InviteError,
  type IssuedTeamInvitation,
} from "./service";

/**
 * The team's server actions. Every one resolves the caller's session and
 * hands Better Auth the request headers, so the plugin's own permission
 * checks — who may invite, who may remove — are the ones that decide.
 * The members page refreshes afterwards.
 */

const MEMBERS_PATH = "/settings/workspace";

export async function inviteMemberAction(
  raw: unknown,
): Promise<Result<IssuedTeamInvitation> | { ok: false; error: InviteError }> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const result = await inviteMember(await headers(), raw);
  if (!result.ok) return result;
  revalidatePath(MEMBERS_PATH);
  return ok(result.invitation);
}

export async function cancelInvitationAction(raw: unknown): Promise<Result<boolean>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z.object({ invitationId: z.string().min(1).max(200) }).safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const done = await cancelInvitation(await headers(), parsed.data.invitationId);
  revalidatePath(MEMBERS_PATH);
  return done ? ok(true) : fail("generic");
}

export async function removeMemberAction(raw: unknown): Promise<Result<boolean>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z.object({ memberId: z.string().min(1).max(200) }).safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const done = await removeMember(await headers(), parsed.data.memberId);
  revalidatePath(MEMBERS_PATH);
  return done ? ok(true) : fail("generic");
}

export async function updateMemberRoleAction(raw: unknown): Promise<Result<boolean>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z
    .object({ memberId: z.string().min(1).max(200), role: z.enum(["admin", "member"]) })
    .safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const done = await updateMemberRole(await headers(), parsed.data.memberId, parsed.data.role);
  revalidatePath(MEMBERS_PATH);
  return done ? ok(true) : fail("generic");
}

/** A coach's one-time link for a member who forgot the password (ADR 0032), to pass on by hand. */
export async function createResetLinkAction(
  raw: unknown,
): Promise<Result<{ url: string; expiresAt: string }>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z.object({ userId: z.string().min(1).max(200) }).safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const made = await createResetLink(ctx, parsed.data.userId);
  if (made === "rateLimited") return fail("conflict", "too_many_reset_links");
  if (typeof made === "string") return fail(made);
  return ok({ url: made.url, expiresAt: made.expiresAt.toISOString() });
}

export async function leaveWorkspaceAction(): Promise<Result<boolean>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const done = await leaveWorkspace(await headers(), ctx.orgId);
  if (!done) return fail("generic");
  // The person's reminders on the team go with them (docs/adr/0060). The
  // row is theirs alone, so it is deleted as them; the team keeps nothing.
  try {
    await withOrgContext(ctx, (tx) =>
      tx
        .delete(pushSubscriptions)
        .where(
          and(eq(pushSubscriptions.orgId, ctx.orgId), eq(pushSubscriptions.userId, ctx.userId)),
        ),
    );
    // So does the choice of the week by mail (docs/adr/0086), the same way.
    await forgetMailChoice(ctx);
  } catch (error) {
    await log.error("team: forgetting reminders after leaving failed", {
      orgId: ctx.orgId,
      error: errorName(error),
    });
  }
  return ok(true);
}

/** A signed-in person accepting the invitation they were sent. */
export async function acceptInvitationAction(raw: unknown): Promise<AcceptResult | "unauthorized"> {
  const session = await getSession();
  if (!session) return "unauthorized";
  const parsed = z.object({ invitationId: z.string().min(1).max(200) }).safeParse(raw);
  if (!parsed.success) return "invalid";
  return acceptTeamInvitation(await headers(), parsed.data.invitationId);
}

/** A new person registering through the invitation; the session cookie is set by Better Auth. */
export async function joinRegisterAction(raw: unknown): Promise<JoinRegisterResult> {
  const result = await registerInvited(await headers(), raw);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
