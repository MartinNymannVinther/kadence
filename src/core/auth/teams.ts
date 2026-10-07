import { count, eq } from "drizzle-orm";
import { cache } from "react";
import { authDb } from "@/core/db/client";
import { memberships } from "@/core/db/schema";

/**
 * How many teams a person belongs to. The team's name at the top of the
 * menu is a switcher only when there is another team to switch to
 * (docs/adr/0068); most people are on one, and the server decides it so
 * the first paint is already right.
 *
 * Read on the auth role, the one that sees a person's membership rows
 * before a team is chosen, like `stillAMember` in ./session.ts. It counts
 * the person's own rows and returns a number, nothing about the teams.
 * Cached per request.
 */
export const teamCount = cache(async (userId: string): Promise<number> => {
  const [row] = await authDb
    .select({ teams: count() })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  return row?.teams ?? 0;
});
