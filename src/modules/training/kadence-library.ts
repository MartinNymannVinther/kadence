import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { trainingBlockItems, trainingBlocks, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import {
  SENIOR_BIKE_SESSIONS,
  SENIOR_STRENGTH_PROGRAMMES,
  SENIOR_WEEKS,
} from "@/modules/paradigms";
import { seniorIn } from "@/modules/season/seniors";
import { requireCoach } from "@/modules/team/access";
import { structureMinutes, type Structure } from "@/modules/workouts/structure";

/**
 * "Hent motionistpas" (docs/adr/0092): Kadence's own bike sessions,
 * strength programmes and ready weeks for an adult into the workspace's
 * library, as DCU's programmes are fetched (dcu-library.ts). Templates are
 * marked `source = 'kadence'` — never 'dcu' — with a stable key; the weeks
 * are training blocks with a key of their own, whose items are the
 * installed templates. Fetching again brings everything up to the edition
 * in src/modules/paradigms rather than adding copies; a coach who changes
 * a ready week makes it their own (blocks.ts clears its key), and the
 * next fetch lays Kadence's beside it.
 *
 * Offered only where it is wanted: a workspace with a rider who is past
 * U23 this season — an adult alone, or a club with seniors
 * (season/seniors.ts). Without one it is refused, as the library hides the
 * button. A coach's, as DCU's.
 */

type Locale = "da" | "en";

const LABEL: Record<Locale, { when: string; source: string }> = {
  da: { when: "Hvornår", source: "Kilde" },
  en: { when: "When", source: "Source" },
};

type TemplateValues = {
  name: string;
  sport: "bike" | "strength";
  description: string;
  structure: Structure;
  sourceKey: string;
};

function templateValues(locale: Locale): TemplateValues[] {
  const label = LABEL[locale];
  return [
    ...SENIOR_BIKE_SESSIONS.map((s) => ({
      name: s.name[locale],
      sport: "bike" as const,
      description: `${s.why[locale]}\n\n${label.when}: ${s.when[locale]}.\n${label.source}: ${s.source}.`,
      structure: s.structure,
      sourceKey: s.key,
    })),
    ...Object.values(SENIOR_STRENGTH_PROGRAMMES).map((p) => ({
      name: p.name[locale],
      sport: "strength" as const,
      description: `${p.about[locale]}\n\n${label.source}: ${p.source}.`,
      structure: p.structure,
      sourceKey: p.key,
    })),
  ];
}

/** Updates the row with the key, or adds it; says which. */
async function upsertTemplate(
  tx: AppTransaction,
  ctx: OrgContext,
  t: TemplateValues,
): Promise<{ id: string; added: boolean }> {
  const values = {
    name: t.name,
    sport: t.sport,
    description: t.description,
    structure: t.structure,
    plannedMinutes: structureMinutes(t.structure),
    source: "kadence",
    sourceKey: t.sourceKey,
  };
  const [updated] = await tx
    .update(workoutTemplates)
    .set(values)
    .where(and(eq(workoutTemplates.orgId, ctx.orgId), eq(workoutTemplates.sourceKey, t.sourceKey)))
    .returning({ id: workoutTemplates.id });
  if (updated) return { id: updated.id, added: false };
  const [row] = await tx
    .insert(workoutTemplates)
    .values({ orgId: ctx.orgId, ...values, createdBy: ctx.userId })
    .returning({ id: workoutTemplates.id });
  return { id: row!.id, added: true };
}

async function upsertWeek(
  tx: AppTransaction,
  ctx: OrgContext,
  week: (typeof SENIOR_WEEKS)[number],
  locale: Locale,
  templateIds: Map<string, string>,
): Promise<boolean> {
  const values = {
    name: week.name[locale],
    description: week.description[locale],
    weeks: 1,
    sourceKey: week.key,
  };
  const [updated] = await tx
    .update(trainingBlocks)
    .set(values)
    .where(and(eq(trainingBlocks.orgId, ctx.orgId), eq(trainingBlocks.sourceKey, week.key)))
    .returning({ id: trainingBlocks.id });
  const blockId =
    updated?.id ??
    (
      await tx
        .insert(trainingBlocks)
        .values({ orgId: ctx.orgId, ...values, createdBy: ctx.userId })
        .returning({ id: trainingBlocks.id })
    )[0]!.id;
  await tx.delete(trainingBlockItems).where(eq(trainingBlockItems.blockId, blockId));
  await tx.insert(trainingBlockItems).values(
    week.items.map((item, sort) => {
      const templateId = templateIds.get(item.session);
      if (!templateId) throw new Error(`No installed session for "${item.session}".`);
      return { orgId: ctx.orgId, blockId, day: item.day, sort, templateId };
    }),
  );
  return !updated;
}

export async function installKadenceContent(
  ctx: OrgContext,
  locale: Locale,
): Promise<{ installed: number; updated: number }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    if (!(await seniorIn(tx))) throw new Refused("invalid", "noSenior");
    let installed = 0;
    let updated = 0;
    const count = (added: boolean) => (added ? (installed += 1) : (updated += 1));
    const ids = new Map<string, string>();
    for (const t of templateValues(locale)) {
      const { id, added } = await upsertTemplate(tx, ctx, t);
      ids.set(t.sourceKey, id);
      count(added);
    }
    for (const week of SENIOR_WEEKS) count(await upsertWeek(tx, ctx, week, locale, ids));
    return { installed, updated };
  });
}
