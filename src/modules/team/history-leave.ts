import { Refused } from "@/core/action";
import { personalWorkspaceOf } from "@/core/access/workspaces";
import { auth } from "@/core/auth/auth";
import { createPersonalWorkspaceFor } from "@/core/auth/personal-workspace";
import type { OrgContext } from "@/core/db/tenant";
import { forgetReminders } from "@/core/team/leave";
import { leaveWorkspace } from "@/core/team/service";
import { startPlanQuietly } from "@/modules/billing/start";
import { deleteWorkspace } from "@/modules/export/workspace";
import { moveRiderHistory, ownRiderIn } from "./history-move";
import { createRider } from "./riders";

/**
 * Leaving a team with the training (docs/adr/0081). A rider who says yes
 * to "Tag din træning med?" gets a personal workspace of their own — made
 * by the server, since nobody on a team may create one themselves (ADR
 * 0048) — with a rider row carrying their account, their history is
 * moved onto it, and only then do they leave the team. A personal
 * workspace they already own is used instead of a new one.
 *
 * All or nothing in two steps, as ADR 0064 does it: Better Auth's
 * workspace cannot join the database transaction, so the workspace is
 * made first and deleted again if the move is refused; and if the team
 * cannot be left after the move, the history is moved back and the new
 * workspace deleted, so the person stands where they started.
 */

export type LeaveHistoryOutcome =
  | { outcome: "left"; orgId: string }
  /** The personal workspace they already own holds training; nothing was moved or left. */
  | { outcome: "hasHistory" }
  | { outcome: "failed" };

export async function leaveWithHistory(
  headers: Headers,
  ctx: OrgContext,
  input: { workspaceName: string },
): Promise<LeaveHistoryOutcome> {
  const from = await ownRiderIn(ctx);
  if (!from) throw new Refused("forbidden");

  // Where the history goes: the personal workspace they own, or a new one.
  const existing = await personalWorkspaceOf(ctx.userId);
  const target = existing ?? (await createPersonalWorkspaceFor(ctx.userId, input.workspaceName));
  if (!target) return { outcome: "failed" };
  const created = existing === null;
  const toCtx = { orgId: target.orgId, userId: ctx.userId };
  const undoCreation = async () => {
    if (!created) return;
    const gone = await deleteWorkspace(toCtx, target.name, headers);
    if (gone !== "deleted") console.error("leave: the new workspace was not deleted", gone);
  };

  let toId: string;
  try {
    const own = await ownRiderIn(toCtx);
    toId =
      own?.id ??
      (
        await createRider(toCtx, {
          name: from.name,
          birthYear: from.birthYear,
          sex: null,
          categoryOverride: null,
          userId: ctx.userId,
        })
      ).id;
    await moveRiderHistory(toCtx, from.id, toId);
    // A new workspace of one's own is priced as any other (docs/adr/0090).
    if (created)
      await startPlanQuietly(target.orgId, { kind: "personal", birthYear: from.birthYear });
  } catch (error) {
    await undoCreation();
    if (error instanceof Refused && error.detail === "target_has_history") {
      return { outcome: "hasHistory" };
    }
    console.error("leave: moving the history failed", error);
    return { outcome: "failed" };
  }

  if (!(await leaveWorkspace(headers, ctx.orgId))) {
    // Back where they were: the team's row has no history now, so the
    // move back is allowed, and the workspace made for nothing goes.
    try {
      await moveRiderHistory(ctx, toId, from.id);
    } catch (error) {
      console.error("leave: moving the history back failed", error);
    }
    await undoCreation();
    return { outcome: "failed" };
  }
  await forgetReminders(ctx);
  try {
    await auth.api.setActiveOrganization({ body: { organizationId: target.orgId }, headers });
  } catch (error) {
    console.error("leave: could not open the personal workspace", error);
  }
  return { outcome: "left", orgId: target.orgId };
}
