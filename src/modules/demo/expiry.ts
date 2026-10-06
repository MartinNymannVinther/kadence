import { sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { demoWorkspaces } from "@/core/db/schema";

/**
 * When a demo is thrown away, for the stripe's "slettes om 23 t". The
 * stripe counts down rather than repeating the full lifetime, because a
 * visitor who comes back the next morning should see that the demo has
 * an hour left, not a day.
 */
export async function demoExpiresAt(orgId: string): Promise<Date | null> {
  const [row] = await authDb
    .select({ expiresAt: demoWorkspaces.expiresAt })
    .from(demoWorkspaces)
    .where(sql`${demoWorkspaces.organizationId} = ${orgId}`)
    .limit(1);
  return row?.expiresAt ?? null;
}

/** Whole hours left, rounded up and never below one, until the clean-up takes it. */
export function hoursLeft(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 3_600_000));
}
