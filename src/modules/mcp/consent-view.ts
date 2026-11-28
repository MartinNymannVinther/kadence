import { eq } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { memberships, organizations } from "@/core/db/schema";
import { connectingRider, type ConnectRefusal } from "./eligibility";

/**
 * What the consent page shows about the person (docs/adr/0118): the
 * workspaces they are a member of, each with whether they may connect an
 * assistant to it, and why not. Read on the auth role, as the workspace
 * switcher's list is: before a workspace is chosen there is none to set.
 */

export type ConsentWorkspace = { orgId: string; name: string; refused: ConnectRefusal | null };

export async function consentWorkspaces(
  userId: string,
  thisYear: number,
): Promise<ConsentWorkspace[]> {
  const rows = await authDb
    .select({ orgId: organizations.id, name: organizations.name })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.name);
  return Promise.all(
    rows.map(async (row) => {
      const rider = await connectingRider({ orgId: row.orgId, userId }, thisYear);
      return { ...row, refused: "refused" in rider ? rider.refused : null };
    }),
  );
}
