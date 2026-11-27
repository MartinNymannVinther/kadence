import { ageInYear, SELF_CONSENT_AGE } from "@/core/access/age";
import type { OrgContext } from "@/core/db/tenant";
import { whoAmI } from "@/modules/team/access";

/**
 * Who may connect their own assistant to a workspace (docs/adr/0118),
 * asked on the consent page before the button is shown, again by the
 * consent endpoint itself, and on every call to /api/mcp:
 *
 * - **a rider**, about themselves. A coach's tools come with the next wave
 *   (docs/plan-mcp.md §8); a parent is not offered a connection at all.
 * - **from the year they turn 15**: a person's own account rests on their
 *   own consent, which a child in Denmark gives from 15
 *   (databeskyttelsesloven § 6, stk. 2 and 3, `SELF_CONSENT_AGE`).
 *
 * Whether the person is still a member, and whether the installation has
 * MCP on, is asked before this, by the caller.
 */

export type ConnectRefusal = "notRider" | "tooYoung";

/** Pure: the rule on what the database said about the person. */
export function refusalFor(
  rider: { birthYear: number } | null,
  thisYear: number,
): ConnectRefusal | null {
  if (!rider) return "notRider";
  if (ageInYear(rider.birthYear, thisYear) < SELF_CONSENT_AGE) return "tooYoung";
  return null;
}

/** The person's own rider in the workspace, or why they may not connect. */
export async function connectingRider(
  ctx: OrgContext,
  thisYear: number,
): Promise<{ riderId: string } | { refused: ConnectRefusal }> {
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const refused = refusalFor(me?.rider ?? null, thisYear);
  if (refused || !me?.rider) return { refused: refused ?? "notRider" };
  return { riderId: me.rider.id };
}
