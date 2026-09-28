"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { ResolveInput, resolveFlag, unresolveFlag } from "./resolutions";

/** The resolutions' server actions: afklaret, and fortryd. */

const PATHS = ["/today", "/riders"];

export async function resolveFlagAction(raw: unknown) {
  return runAction(raw, ResolveInput, (ctx, input) => resolveFlag(ctx, input), PATHS);
}

export async function unresolveFlagAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ resolutionId: z.string().min(1).max(100) }),
    (ctx, input) => unresolveFlag(ctx, input.resolutionId),
    PATHS,
  );
}
