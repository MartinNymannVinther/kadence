import type { InvitationKind } from "@/core/team/invitation-kind";

/**
 * What the join page says an invitation is for (docs/adr/0065). Pure, for
 * the tests.
 *
 * A coach's invitation says "som træner" by its role alone. A member's
 * says "som rytter" or "som forælder til Emma" when `invitation_kind`
 * knows, "som forælder" when the rider's name has no first word to give,
 * and only the team when it is for neither — somebody a coach invited to
 * the team as such, or a row that has gone since.
 */
export type JoinAs = {
  role: "coach" | "rider" | "parentOf" | "parent" | "member";
  /** The rider's first name for "parentOf", else "". */
  child: string;
};

export function joinAs(coach: boolean, kind: InvitationKind | null): JoinAs {
  if (coach) return { role: "coach", child: "" };
  if (kind?.kind === "rider") return { role: "rider", child: "" };
  if (kind?.kind === "guardian") {
    return kind.riderFirstName
      ? { role: "parentOf", child: kind.riderFirstName }
      : { role: "parent", child: "" };
  }
  return { role: "member", child: "" };
}
