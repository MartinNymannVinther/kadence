import { addDaysIso, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { listTemplates } from "@/modules/training/templates";
import { TEAM_SCOPE } from "@/modules/training/week-draft-merge";
import { saveWeekPlanDraft } from "@/modules/training/week-plan-draft";
import { pick, TEMPLATES, type L } from "./seed-data";

/**
 * The week after next, half planned (docs/adr/0054; ADR 0043, amended
 * 2026-10-07): a draft the team's coaches share, so "Planlæg ugen" for
 * that week opens on it and says who saved it last. Tuesday's intervals
 * and Saturday's endurance ride from the coach's library, at the
 * clubhouse, for the whole team; nothing is in the calendar until the
 * week is laid in.
 */
export async function seedWeekDraft(
  ctx: OrgContext,
  l: L,
  { today, riderIds }: { today: string; riderIds: string[] },
): Promise<void> {
  const library = await listTemplates(ctx);
  const named = (i: number) => library.find((t) => t.name === pick(TEMPLATES[i]!.name, l));
  const intervals = named(1);
  const endurance = named(0);
  if (!intervals || !endurance) return;
  const meetingPlace = pick({ da: "Klubhuset", en: "The clubhouse" }, l);
  await saveWeekPlanDraft(ctx, {
    monday: addDaysIso(mondayOf(today), 14),
    scope: TEAM_SCOPE,
    payload: {
      riderIds,
      items: [
        { kind: "template", day: 1, templateId: intervals.id, startTime: "17:30", meetingPlace },
        { kind: "template", day: 5, templateId: endurance.id, startTime: "09:00", meetingPlace },
      ],
    },
  });
}
