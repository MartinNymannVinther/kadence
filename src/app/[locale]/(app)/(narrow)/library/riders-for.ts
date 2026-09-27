import type { OrgContext } from "@/core/db/tenant";
import type { Me } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";

/**
 * Whom the caller may plan a template for: every rider for a coach, only
 * themselves for a rider, nobody for a parent (who reads, ADR 0011).
 */
export async function ridersToPlanFor(
  ctx: OrgContext,
  me: Me | null,
): Promise<Array<{ id: string; name: string }>> {
  if (me?.isCoach) return (await getRiders(ctx)).map((r) => ({ id: r.id, name: r.name }));
  return me?.rider ? [{ id: me.rider.id, name: me.rider.name }] : [];
}
