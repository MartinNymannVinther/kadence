"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { firstName, workspaceNameKey } from "@/core/access/personal";
import { runAction } from "@/core/action";
import { requireOrgContext } from "@/core/auth/guard";
import { getSession } from "@/core/auth/session";
import { fail, ok, type Result } from "@/core/result";
import { acceptWithHistory, type JoinHistoryOutcome } from "@/modules/team/history-join";
import { leaveWithHistory, type LeaveHistoryOutcome } from "@/modules/team/history-leave";
import { forgetReminders } from "./leave";
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
  await forgetReminders(ctx);
  return ok(true);
}

/**
 * A rider leaving the team with their training (docs/adr/0081): a personal
 * workspace named after them, as the registration names one ("Emmas
 * træning"), in the reader's language; the service does the rest.
 */
export async function leaveWithHistoryAction(): Promise<Result<LeaveHistoryOutcome>> {
  return runAction({}, z.object({}), async (ctx) => {
    const session = await getSession();
    const first = firstName(session?.user.name ?? "");
    const t = await getTranslations("auth.apply");
    const workspaceName = first ? t(workspaceNameKey(first), { name: first }) : "Kadence";
    return leaveWithHistory(await headers(), ctx, { workspaceName: workspaceName.slice(0, 200) });
  });
}

/**
 * The signed-in person accepting the invitation they were sent, with the
 * answer to "Tag din træning med over på holdet?" (docs/adr/0081). The
 * person must be in some workspace already — the personal one that holds
 * the training to move — which is what makes this an ordinary action.
 */
export async function acceptWithHistoryAction(raw: unknown): Promise<Result<JoinHistoryOutcome>> {
  return runAction(
    raw,
    z.object({ invitationId: z.string().min(1).max(200), takeHistory: z.boolean() }),
    async (ctx, input) => acceptWithHistory(await headers(), { ...input, userId: ctx.userId }),
  );
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
