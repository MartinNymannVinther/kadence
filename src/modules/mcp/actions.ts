"use server";

import { z } from "zod";
import { runAction, STILL_ALLOWED } from "@/core/action";
import { removeConnection } from "./connections";

/** Removes one of the caller's own assistant connections (docs/adr/0118). */
export async function removeAiConnectionAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ id: z.string().min(1).max(100) }),
    (ctx, input) => removeConnection(ctx, input.id),
    ["/settings/ai-connections"],
    STILL_ALLOWED,
  );
}
