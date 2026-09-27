"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { disconnect } from "./disconnect";
import { PROVIDER_IDS } from "./providers";
import { pushSession } from "./push";

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

/** Disconnects the caller's own Wahoo or Garmin account. */
export async function disconnectAction(raw: unknown) {
  return runAction(raw, z.object({ provider }), (ctx, input) => disconnect(ctx, input.provider), [
    "/settings/devices",
  ]);
}
