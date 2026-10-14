import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { getCheckin, saveCheckin } from "@/modules/wellbeing/checkins";
import { addKnownPain } from "@/modules/wellbeing/known-pains";
import { pick, type L, type Text } from "./seed-data";

/** The adult's known pain: his back, which usually hurts at the start. */
export const ADULT_KNOWN_PAIN: { place: Text; usualLevel: number } = {
  place: { da: "Ryg", en: "Back" },
  usualLevel: 2,
};

/** The days back from today his back hurt as usual, ticked on the check-in. */
export const ADULT_BACK_DAYS = [0, 2, 4, 6] as const;

/**
 * Known pains in the demo (docs/adr/0097, ADR 0054): Lars, the adult
 * alone, has a back that always hurts a little at the start. On a few of
 * the last days he answered pain 2 and ticked "Ryg som det plejer", so the
 * days stay green and the pattern is there to see. Runs after the
 * check-ins are seeded, and writes through the ordinary services.
 */
export async function seedKnownPain(
  ctx: OrgContext,
  l: L,
  riderId: string,
  today: string,
): Promise<void> {
  const { id } = await addKnownPain(ctx, {
    riderId,
    place: pick(ADULT_KNOWN_PAIN.place, l),
    usualLevel: ADULT_KNOWN_PAIN.usualLevel,
  });
  for (const ago of ADULT_BACK_DAYS) {
    const onDate = addDaysIso(today, -ago);
    const row = await getCheckin(ctx, riderId, onDate);
    if (!row) continue;
    await saveCheckin(ctx, {
      riderId,
      onDate,
      sleepHours: row.sleepHours,
      sleepQuality: row.sleepQuality,
      energy: row.energy,
      mood: row.mood,
      soreness: row.soreness,
      stress: row.stress,
      ill: row.ill,
      note: row.note,
      pain: ADULT_KNOWN_PAIN.usualLevel,
      painWhere: "",
      knownPainIds: [id],
    });
  }
}
