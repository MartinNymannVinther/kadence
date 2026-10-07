import { sql } from "drizzle-orm";

/**
 * The addresses the caller may read, as a table to join (drizzle/0036,
 * docs/adr/0070).
 *
 * The application role has no SELECT on `users.email` any more — a member
 * reads a teammate's name, never their address. What a page still needs
 * comes from `team_member_addresses()`, a definer function that answers
 * from the context alone: the caller's own address, the whole team's to a
 * coach, and to a rider the addresses of the people who hold a guardian
 * link to them. A left join on it leaves the address null for everyone
 * the caller may not read, so a list keeps its rows and loses a column.
 */
export const memberAddresses = sql`team_member_addresses() as member_addresses`;

export const memberAddress = {
  userId: sql<string>`member_addresses.user_id`,
  email: sql<string | null>`member_addresses.email`,
};
