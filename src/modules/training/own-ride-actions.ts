"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { listOwnRides, RideCursor } from "./own-rides";

/**
 * "Vis flere" under "Dine ture": the next twenty of the caller's own
 * rides after the cursor. A read, so nothing is refreshed after; the
 * rider is the session's, never an id from the browser (own-rides.ts).
 */
export async function moreOwnRidesAction(raw: unknown) {
  return runAction(raw, z.object({ before: RideCursor }), (ctx, input) =>
    listOwnRides(ctx, { before: input.before }),
  );
}
