"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { proposeThresholds } from "./threshold-proposal";

/**
 * "Foreslå ud fra mine ture" on the thresholds form (docs/adr/0094): the
 * proposal for one rider, read under the caller's RLS. A read, so nothing
 * is refreshed after; the form shows the numbers and the person saves
 * them through the ordinary thresholds action, or not at all.
 */
export async function proposeThresholdsAction(raw: unknown) {
  return runAction(raw, z.object({ riderId: z.string().min(1).max(100) }), (ctx, input) =>
    proposeThresholds(ctx, input.riderId),
  );
}
