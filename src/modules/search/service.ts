import { Refused } from "@/core/action";
import type { OrgContext } from "@/core/db/tenant";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { listTemplates } from "@/modules/training/templates";

/**
 * What Søg can find beyond the menu, read once when the palette first
 * opens (the search approved with docs/mockups/navigation). It goes to the
 * browser, so it holds names and the few fields a row shows, nothing
 * else: no birth years, thresholds or check-ins.
 */
export type SearchIndex = {
  riders: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; name: string; sport: string; plannedMinutes: number }>;
};

/**
 * Read through the ordinary services, under the same RLS as every page
 * (ADR 0011): the riders are those the database lets the caller see — all
 * of them for a coach, the rider themselves, a parent's children who have
 * confirmed the link and share their training — and the library is the
 * team's, for the people whose menu has it, a coach or a rider (ADR 0061);
 * a parent does not plan sessions, so it stays out of their search as it
 * stays out of their menu. Archived riders and templates are left out, as
 * the lists leave them out.
 */
export async function searchIndex(ctx: OrgContext): Promise<SearchIndex> {
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me) throw new Refused("forbidden");
  const library = me.isCoach || me.rider !== null;
  const [riders, templates] = await Promise.all([
    getRiders(ctx),
    library ? listTemplates(ctx) : Promise.resolve([]),
  ]);
  return {
    riders: riders.map((rider) => ({ id: rider.id, name: rider.name })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      sport: template.sport,
      plannedMinutes: template.plannedMinutes,
    })),
  };
}
