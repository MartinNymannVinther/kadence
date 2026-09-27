/**
 * Where a parent's link stands (ADR 0011): not yet invited, invited, the
 * invitation run out, joined and waiting for the rider's yes, confirmed —
 * or lapsed, from the year the rider turns 18, until the rider says yes
 * again as an adult.
 */
export type GuardianState =
  "notInvited" | "invited" | "expired" | "waiting" | "confirmed" | "lapsed";

export function guardianState(
  guardian: {
    userId: string | null;
    invitationId: string | null;
    confirmedAt: Date | null;
    confirmedAsAdult: boolean;
  },
  riderBirthYear: number,
  pendingInvitations: Set<string>,
  thisYear = new Date().getFullYear(),
): GuardianState {
  if (!guardian.userId) {
    if (!guardian.invitationId) return "notInvited";
    return pendingInvitations.has(guardian.invitationId) ? "invited" : "expired";
  }
  if (!guardian.confirmedAt) return "waiting";
  if (thisYear >= riderBirthYear + 18 && !guardian.confirmedAsAdult) return "lapsed";
  return "confirmed";
}
