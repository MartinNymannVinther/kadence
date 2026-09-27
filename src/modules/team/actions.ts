"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Refused, runAction } from "@/core/action";
import { inviteMember, type IssuedTeamInvitation } from "@/core/team/service";
import {
  addGuardian,
  attachGuardianInvitation,
  confirmGuardian,
  GuardianInput,
  removeGuardian,
} from "./guardians";
import {
  archiveRider,
  attachRiderInvitation,
  createRider,
  eraseRider,
  RiderInput,
  setSharing,
  setThresholds,
  SharingInput,
  ThresholdsInput,
  updateRider,
} from "./riders";
import { saveTeamSettings, TeamSettingsInput } from "./settings";

/**
 * The team's server actions: riders, parents, invitations and settings.
 * Every one goes through `runAction` — the caller's workspace first, the
 * input validated, the service deciding who may — and the pages that show
 * the team are refreshed after.
 *
 * An invitation is Better Auth's (src/core/team): only coaches may send
 * one, it binds one address, and no mail is sent — the coach copies the
 * link. The rider or parent row it was sent for is linked when the person
 * joins (src/modules/team/claim.ts).
 */

const PATHS = ["/riders", "/today", "/settings/me"];
const id = z.string().min(1).max(100);
const email = z.email().max(320);

async function invite(address: string): Promise<IssuedTeamInvitation> {
  const result = await inviteMember(await headers(), { email: address, role: "member" });
  if (!result.ok) {
    if (result.error === "forbidden") throw new Refused("forbidden");
    throw new Refused("conflict", result.error);
  }
  return result.invitation;
}

export async function createRiderAction(raw: unknown) {
  return runAction(
    raw,
    RiderInput.extend({ email: email.optional().or(z.literal("")) }),
    async (ctx, { email: address, ...input }) => {
      const rider = await createRider(ctx, input);
      if (!address) return { id: rider.id, invitation: null };
      const invitation = await invite(address);
      await attachRiderInvitation(ctx, rider.id, invitation.id);
      return { id: rider.id, invitation };
    },
    PATHS,
  );
}

export async function inviteRiderAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: id, email }),
    async (ctx, input) => {
      const invitation = await invite(input.email);
      await attachRiderInvitation(ctx, input.riderId, invitation.id);
      return invitation;
    },
    PATHS,
  );
}

export async function updateRiderAction(raw: unknown) {
  return runAction(
    raw,
    RiderInput.extend({ riderId: id }),
    (ctx, { riderId, ...input }) => updateRider(ctx, riderId, input),
    PATHS,
  );
}

export async function setThresholdsAction(raw: unknown) {
  return runAction(
    raw,
    ThresholdsInput.extend({ riderId: id }),
    (ctx, { riderId, ...input }) => setThresholds(ctx, riderId, input),
    PATHS,
  );
}

export async function setSharingAction(raw: unknown) {
  return runAction(raw, SharingInput, setSharing, PATHS);
}

export async function archiveRiderAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: id, archived: z.boolean() }),
    (ctx, input) => archiveRider(ctx, input.riderId, input.archived),
    PATHS,
  );
}

export async function addGuardianAction(raw: unknown) {
  return runAction(
    raw,
    GuardianInput.extend({ email: email.optional().or(z.literal("")) }),
    async (ctx, { email: address, ...input }) => {
      const guardian = await addGuardian(ctx, input);
      if (!address) return { id: guardian.id, invitation: null };
      const invitation = await invite(address);
      await attachGuardianInvitation(ctx, guardian.id, invitation.id);
      return { id: guardian.id, invitation };
    },
    PATHS,
  );
}

export async function confirmGuardianAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ guardianId: id }),
    (ctx, input) => confirmGuardian(ctx, input.guardianId),
    PATHS,
  );
}

export async function removeGuardianAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ guardianId: id }),
    (ctx, input) => removeGuardian(ctx, input.guardianId),
    PATHS,
  );
}

export async function saveTeamSettingsAction(raw: unknown) {
  return runAction(raw, TeamSettingsInput, saveTeamSettings, ["/settings/team"]);
}

export async function eraseRiderAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: id, confirm: z.literal(true) }),
    (ctx, input) => eraseRider(ctx, input.riderId),
    PATHS,
  );
}
