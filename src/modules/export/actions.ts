"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrgContext } from "@/core/auth/guard";
import { fail, ok, type Result } from "@/core/result";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { deleteAccountIfAlone } from "./account";
import { deleteWorkspace, type DeleteResult } from "./workspace";

/**
 * Dogma three's exit door. The export itself is a download and lives in a
 * route handler; deletion is an action, because it ends with the person
 * being sent somewhere else.
 */

export async function deleteWorkspaceAction(raw: unknown): Promise<Result<DeleteResult>> {
  const ctx = await requireOrgContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(raw);
  if (!parsed.success) return fail("invalid");
  // Read before the workspace is gone: one person's own workspace takes
  // their account with it when nothing else holds it (ADR 0080).
  const personal = (await workspaceKind(ctx.orgId, ctx.userId)) === "personal";
  const result = await deleteWorkspace(ctx, parsed.data.name, await headers());
  if (result === "deleted") {
    if (personal) await deleteAccountIfAlone(ctx.userId);
    redirect("/");
  }
  return ok(result);
}
