"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getSession } from "@/core/auth/session";
import { errorName, log } from "@/core/log";
import { clientAddress } from "@/core/rate-limit";
import { firstName, PersonalFields, riderNameFor, workspaceNameKey } from "./personal";
import {
  approveAccessRequest,
  createInvitation,
  declineAccessRequest,
  isPlatformOwner,
  personalFrom,
  renewInvitation,
  submitAccessRequest,
  type AccessRequestResult,
  type IssuedInvitation,
} from "./service";

export type { AccessRequestResult };

/**
 * A personal workspace is called by its rider's first name — "Emmas
 * træning" — in the language of whoever made the request (docs/adr/0080).
 * The form has no field for it.
 */
async function personalWorkspaceName(name: string): Promise<string> {
  const t = await getTranslations("auth.apply");
  const first = firstName(name);
  return t(workspaceNameKey(first), { name: first }).slice(0, 200);
}

const personalInput = z.object({
  name: z.string().max(200).optional(),
  kind: z.enum(["club", "personal"]).optional(),
  personal: PersonalFields.optional(),
});

/** Public: anyone may ask for access. */
export async function requestAccessAction(input: unknown): Promise<AccessRequestResult> {
  const h = await headers();
  const parsed = personalInput.safeParse(input);
  let named = input;
  if (parsed.success && parsed.data.kind === "personal" && parsed.data.personal) {
    const rider = riderNameFor(parsed.data.personal, parsed.data.name ?? "");
    named = { ...(input as object), organizationName: await personalWorkspaceName(rider) };
  }
  return submitAccessRequest(named, {
    ipAddress: clientAddress(h),
    userAgent: h.get("user-agent"),
  });
}

/* --- Owner only. Each action resolves the caller itself and answers a --- */
/* --- generic failure to anyone else; nothing about the queue leaks.   --- */

export type OwnerActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: "unauthorized" | "invalid" | "generic" };

async function ownerUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  return (await isPlatformOwner(session.user.id)) ? session.user.id : null;
}

export type IssuedLink = { url: string; email: string; expiresAt: string };

function issued(invitation: IssuedInvitation): IssuedLink {
  return {
    url: invitation.url,
    email: invitation.email,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function approveAccessRequestAction(
  requestId: string,
): Promise<OwnerActionResult<IssuedLink>> {
  const actor = await ownerUserId();
  if (!actor) return { ok: false, error: "unauthorized" };
  try {
    return { ok: true, data: issued(await approveAccessRequest(actor, String(requestId))) };
  } catch (error) {
    await log.error("access: approve failed", { actor, error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

export async function declineAccessRequestAction(requestId: string): Promise<OwnerActionResult> {
  const actor = await ownerUserId();
  if (!actor) return { ok: false, error: "unauthorized" };
  try {
    await declineAccessRequest(actor, String(requestId));
    return { ok: true, data: undefined };
  } catch (error) {
    await log.error("access: decline failed", { actor, error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

const InviteInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("club"),
    email: z.email().max(320),
    organizationName: z.string().trim().min(1).max(200),
  }),
  z.object({
    kind: z.literal("personal"),
    email: z.email().max(320),
    /** The rider's name for "me", the parent's for "child"; it only names the workspace. */
    name: z.string().trim().min(1).max(200),
    personal: PersonalFields,
  }),
]);

/**
 * The owner invites an address directly: a club with the name they type,
 * or a personal workspace (docs/adr/0080) named after its rider.
 */
export async function createInvitationAction(
  input: unknown,
): Promise<OwnerActionResult<IssuedLink>> {
  const actor = await ownerUserId();
  if (!actor) return { ok: false, error: "unauthorized" };
  const parsed = InviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const personal = data.kind === "personal" ? personalFrom("personal", data.personal) : null;
  if (personal && !personal.ok) return { ok: false, error: "invalid" };
  try {
    const organizationName =
      data.kind === "club"
        ? data.organizationName
        : await personalWorkspaceName(riderNameFor(data.personal, data.name));
    const invitation = await createInvitation(actor, {
      email: data.email,
      organizationName,
      personal: personal?.ok ? personal.spec : null,
    });
    return { ok: true, data: issued(invitation) };
  } catch (error) {
    await log.error("access: invite failed", { actor, error: errorName(error) });
    return { ok: false, error: "generic" };
  }
}

/** "Nyt link" for an invitation already made, carrying all it held. */
export async function renewInvitationAction(
  invitationId: string,
): Promise<OwnerActionResult<IssuedLink>> {
  const actor = await ownerUserId();
  if (!actor) return { ok: false, error: "unauthorized" };
  try {
    return { ok: true, data: issued(await renewInvitation(actor, String(invitationId))) };
  } catch (error) {
    console.error("access: renew failed", error);
    return { ok: false, error: "generic" };
  }
}
