import { eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { clubChampions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { clubChampionshipOn, getChampionship } from "./service";
import type { ClubClass } from "./standings";

/**
 * The club's roll of honour (docs/adr/0051): champions crowned from a
 * season's standings, and years from before Kadence typed in by hand.
 */

async function requireOn(tx: Parameters<typeof clubChampionshipOn>[0], ctx: OrgContext) {
  if (!(await clubChampionshipOn(tx, ctx.orgId))) throw new Refused("notFound", "clubOff");
}

/**
 * The season's winners into the roll of honour: the top of each class
 * with points, as "Klubmester" for the championship's year. A class
 * already crowned that year is left as it is.
 */
export async function crownChampions(
  ctx: OrgContext,
  championshipId: string,
  title: string,
): Promise<{ crowned: number }> {
  const view = await getChampionship(ctx, championshipId);
  if (!view) throw new Refused("notFound");
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const existing = await tx
      .select({ class: clubChampions.class, title: clubChampions.title })
      .from(clubChampions)
      .where(eq(clubChampions.year, view.season));
    let crowned = 0;
    for (const [cls, table] of Object.entries(view.standings)) {
      const top = table[0];
      if (!top || top.points === 0) continue;
      if (existing.some((e) => e.class === cls && e.title === title)) continue;
      await tx.insert(clubChampions).values({
        orgId: ctx.orgId,
        year: view.season,
        class: cls,
        title,
        riderId: top.riderId,
        name: top.name,
      });
      crowned += 1;
    }
    return { crowned };
  });
}

export async function addChampion(
  ctx: OrgContext,
  input: {
    year: number;
    class: ClubClass;
    title: string;
    name: string;
    riderId?: string | null;
    note?: string;
  },
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await requireOn(tx, ctx);
    const [row] = await tx
      .insert(clubChampions)
      .values({
        orgId: ctx.orgId,
        ...input,
        riderId: input.riderId ?? null,
        note: input.note ?? "",
      })
      .returning({ id: clubChampions.id });
    return row!;
  });
}

export async function removeChampion(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx.delete(clubChampions).where(eq(clubChampions.id, id));
  });
}
