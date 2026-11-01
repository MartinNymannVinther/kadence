"use server";

import { z } from "zod";
import { runAction, STILL_ALLOWED } from "@/core/action";
import { setAutoSend } from "./auto-send";
import { disconnect } from "./disconnect";
import { deleteActivity } from "./import";
import { PROVIDER_IDS } from "./providers";
import { pushSession } from "./push";
import { createUploadKey, removeUploadKey } from "./upload-keys";

/**
 * The devices' server actions. Each resolves the caller's team, validates
 * at the boundary and lets the service decide who may (src/core/action.ts).
 * Connecting is not an action: it is a round trip through the provider,
 * on the routes under /api/devices/[provider].
 */

const provider = z.enum(PROVIDER_IDS);
const id = z.string().min(1).max(100);

/** Sends a planned bike session to the rider's Wahoo or Garmin: the rider or a coach. */
export async function pushSessionAction(raw: unknown) {
  return runAction(raw, z.object({ sessionId: id, provider }), (ctx, input) =>
    pushSession(ctx, input.sessionId, input.provider),
  );
}

/**
 * Whether Kadence sends the caller's own bike sessions to their Garmin by
 * itself (docs/adr/0114): the rider's choice alone.
 */
export async function setAutoSendAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ provider, on: z.boolean() }),
    (ctx, input) => setAutoSend(ctx, input.provider, input.on),
    ["/settings/devices"],
  );
}

/** Disconnects the caller's own Wahoo, Garmin or Polar account. */
export async function disconnectAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ provider }),
    (ctx, input) => disconnect(ctx, input.provider),
    ["/settings/devices"],
    STILL_ALLOWED,
  );
}

/**
 * Makes an upload key for the caller's own rider (ADR 0029). The key is
 * in the answer, this once; Kadence keeps only its hash.
 */
export async function createUploadKeyAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ name: z.string().trim().min(1).max(60) }),
    (ctx, input) => createUploadKey(ctx, input.name),
    ["/settings/devices"],
  );
}

/** Removes an upload key: the rider's own, or a rider's for a coach. */
export async function removeUploadKeyAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ keyId: id }),
    (ctx, input) => removeUploadKey(ctx, input.keyId),
    ["/settings/devices", "/riders"],
    STILL_ALLOWED,
  );
}

/** Deletes a ride or session that was done, and its file: the rider's or a coach's. */
export async function deleteActivityAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ activityId: id }),
    (ctx, input) => deleteActivity(ctx, input.activityId),
    ["/calendar", "/today", "/riders", "/season"],
    STILL_ALLOWED,
  );
}
