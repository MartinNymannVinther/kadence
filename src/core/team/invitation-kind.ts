import { sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";

/**
 * Whom an invitation is for, before anybody is signed in (docs/adr/0065).
 *
 * A rider's and a parent's invitation both have the role "member"; what
 * tells them apart is the rider or guardian row a coach prepared, which
 * the auth role cannot read. `invitation_kind` (drizzle/0030) is the one
 * definer that answers, and only for an invitation that is still pending
 * and in date: "rider", or "guardian" with the rider's first name, or
 * nothing at all.
 */
export type InvitationKind =
  { kind: "rider" } | { kind: "guardian"; riderFirstName: string | null };

export async function invitationKind(invitationId: string): Promise<InvitationKind | null> {
  if (!invitationId || invitationId.length > 200) return null;
  const result = await authDb.execute(
    sql`select kind, rider_first_name from invitation_kind(${invitationId})`,
  );
  const row = result.rows[0] as { kind: string; rider_first_name: string | null } | undefined;
  if (row?.kind === "rider") return { kind: "rider" };
  if (row?.kind === "guardian")
    return { kind: "guardian", riderFirstName: row.rider_first_name || null };
  return null;
}
