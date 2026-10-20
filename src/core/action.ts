import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireOrgContext } from "@/core/auth/guard";
import type { OrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";
import { fail, ok, type ActionError, type Result } from "@/core/result";
import { PLAN_EXPIRED, planExpired } from "@/modules/billing/state";

/**
 * A refusal a service raises on purpose: the caller may not, the id is
 * not this workspace's, the row changed underneath. It carries the word
 * the interface renders and nothing else; every other error is logged
 * and answered with "generic".
 */
export class Refused extends Error {
  constructor(
    readonly code: ActionError,
    readonly detail?: string,
  ) {
    super(code);
    this.name = "Refused";
  }
}

export type ActionOptions = {
  /**
   * Whether the action runs for a workspace whose trial or payment has
   * run out, which may only be read and exported (docs/adr/0090). Every
   * action is refused there unless it says "allowed" — the few that read,
   * leave or take away, never the ones that add or change. Pass
   * `STILL_ALLOWED`; tests/billing/allowlist.test.ts names every one.
   */
  whileExpired?: "allowed";
};

/** The actions an expired workspace may still run: reading, leaving, taking away. */
export const STILL_ALLOWED: ActionOptions = { whileExpired: "allowed" };

/**
 * The shape of every server action in Kadence: resolve the caller's
 * workspace first, validate the input at the boundary, refuse a write to a
 * workspace that may only be read, run the service, refresh the pages
 * that show what changed, and answer with a Result — never a stack.
 */
export async function runAction<S extends z.ZodType, T>(
  raw: unknown,
  schema: S,
  fn: (ctx: OrgContext, input: z.infer<S>) => Promise<T>,
  revalidate: string[] = [],
  options: ActionOptions = {},
): Promise<Result<T>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  try {
    if (options.whileExpired !== "allowed" && (await planExpired(ctx)))
      return fail("forbidden", PLAN_EXPIRED);
    const data = await fn(ctx, parsed.data as z.infer<S>);
    for (const path of revalidate) revalidatePath(path, "layout");
    return ok(data);
  } catch (error) {
    if (error instanceof Refused) return fail(error.code, error.detail);
    await log.error("action: failed", { orgId: ctx.orgId, error: errorName(error) });
    return fail("generic");
  }
}
