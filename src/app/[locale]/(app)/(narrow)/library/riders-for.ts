import { todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import type { PlanBasis } from "@/modules/paradigms";
import { riderClass } from "@/modules/season/class";
import type { Me } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";

/**
 * Whom the caller may plan a template for: every rider for a coach, only
 * themselves for a rider, nobody for a parent (who reads, ADR 0011).
 * A coach's riders carry their basis this season, so a strength series
 * for an adult is measured against their profile (ADR 0092).
 */
export async function ridersToPlanFor(
  ctx: OrgContext,
  me: Me | null,
): Promise<Array<{ id: string; name: string; basis?: PlanBasis | null }>> {
  const season = seasonStartYear(todayInCopenhagen());
  if (me?.isCoach)
    return (await getRiders(ctx)).map((r) => ({
      id: r.id,
      name: r.name,
      basis: riderClass(r, season).basis,
    }));
  return me?.rider ? [{ id: me.rider.id, name: me.rider.name }] : [];
}
