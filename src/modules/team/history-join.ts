import { Refused } from "@/core/action";
import { personalWorkspaceOf } from "@/core/access/workspaces";
import { acceptTeamInvitation, findTeamInvitation, type AcceptResult } from "@/core/team/service";
import { deleteWorkspace } from "@/modules/export/workspace";
import { claimPendingLinks } from "./claim";
import { moveRiderHistory, ownRiderIn, type MoveRefusal } from "./history-move";

/**
 * Joining a team from a personal workspace (docs/adr/0081). The person
 * accepts the invitation as anyone does; then, when they said yes to
 * "Tag din træning med over på holdet?", their rows move from the rider
 * row in their own workspace onto the one the coach prepared, and the
 * emptied workspace is deleted as its owner deletes it. Said no, or
 * nothing of theirs to move, and they are simply on the team, with two
 * workspaces and the switcher.
 *
 * Nothing here can leave the person worse off than a plain accept: the
 * move is all or nothing in the database, and a move that is refused
 * leaves them on the team with their history where it was, which is
 * what "no" gives.
 */

export type JoinHistoryOutcome =
  /** On the team; nothing was asked to move, or there was nothing of theirs to move. */
  | { outcome: "accepted" }
  /** On the team with the history moved; whether the old workspace is gone too. */
  | { outcome: "moved"; oldWorkspaceDeleted: boolean }
  /** On the team, but the history stayed in the personal workspace, and why. */
  | { outcome: "historyStayed"; reason: MoveRefusal | "noRiderRow" | "generic" }
  | { outcome: Exclude<AcceptResult, "accepted"> };

export async function acceptWithHistory(
  headers: Headers,
  input: { invitationId: string; userId: string; takeHistory: boolean },
): Promise<JoinHistoryOutcome> {
  const { invitationId, userId, takeHistory } = input;
  const invitation = await findTeamInvitation(invitationId);
  if (!invitation || invitation.state !== "pending") return { outcome: "invalid" };
  const personal = await personalWorkspaceOf(userId);

  const accepted = await acceptTeamInvitation(headers, invitationId);
  if (accepted !== "accepted") return { outcome: accepted };
  if (!takeHistory || !personal) return { outcome: "accepted" };

  const fromCtx = { orgId: personal.orgId, userId };
  const toCtx = { orgId: invitation.organizationId, userId };
  const from = await ownRiderIn(fromCtx);
  if (!from) return { outcome: "accepted" };

  // The row the coach prepared is theirs once the link is claimed, which
  // the first page they open would otherwise do (src/modules/team/access.ts).
  await claimPendingLinks(toCtx);
  const to = await ownRiderIn(toCtx);
  if (!to) return { outcome: "historyStayed", reason: "noRiderRow" };

  try {
    await moveRiderHistory(toCtx, from.id, to.id);
  } catch (error) {
    if (error instanceof Refused && error.detail) {
      return { outcome: "historyStayed", reason: error.detail as MoveRefusal };
    }
    console.error("join: moving the history failed", error);
    return { outcome: "historyStayed", reason: "generic" };
  }

  // The workspace is empty of training now; it goes as its owner would
  // delete it, name and all. If that fails the person still has it, and
  // Data has the same door.
  const deleted = await deleteWorkspace(fromCtx, personal.name, headers);
  if (deleted !== "deleted") console.error("join: the emptied workspace was not deleted", deleted);
  return { outcome: "moved", oldWorkspaceDeleted: deleted === "deleted" };
}
