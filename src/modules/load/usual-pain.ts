/**
 * Known pains on the check-in (docs/adr/0097). Some riders always have a
 * little pain somewhere, and what matters is a day when it is different.
 * A rider records what always hurts a little
 * and how much it usually does, 1 or 2 on ATK's ladder; on the day's
 * check-in they tick "Ryg som det plejer". A pain answered so is stored,
 * so the pattern stays visible, but it does not colour the day, nor raise
 * the coach's pain flag, nor bring the advice to cut training down.
 *
 * Today's pain is the usual one when all of these hold:
 *
 * - it is 1 or 2 on the ladder (3 is never usual, and always red);
 * - at least one known pain is ticked, and the pain is no higher than
 *   the highest usual level among the ticked;
 * - where it hurts is left empty, or names a ticked place ("Ryg",
 *   "ryggen", "nedre ryg"). A place the rider writes that is none of the
 *   ticked is a new place, and follows the ladder as before.
 *
 * Everything else follows the ladder unchanged: a rider with a known back
 * pain at 2 who answers 2 and ticks it is green; answers 2 without the
 * tick, yellow; answers 3, red. Youth and adults alike.
 *
 * Pure: imports nothing from the database.
 */

/** A ticked known pain as the check-in carries it. */
export type UsualPainLike = { place: string; level: number };
/** The same, with the known pain's id: what a check-in row stores. */
export type TickedPain = UsualPainLike & { id: string };

export interface PainAnswer {
  /** ATK's ladder, 0–3. */
  pain: number;
  /** Where it hurts, in the rider's words. */
  painWhere?: string | null;
  /** The known pains ticked "som det plejer" today. */
  usualPains?: readonly UsualPainLike[] | null;
}

/** The highest a known pain's usual level can be: 3 is never usual. */
export const MAX_USUAL_LEVEL = 2;
/** Known pains a rider may have at once. */
export const MAX_KNOWN_PAINS = 5;
/** A known pain's place, in characters. */
export const MAX_PLACE_LENGTH = 40;

const norm = (text: string) => text.trim().toLocaleLowerCase("da");

/** Whether today's pain is a known pain at its usual level; see the file comment. */
export function painIsUsual(answer: PainAnswer): boolean {
  const usual = answer.usualPains ?? [];
  if (answer.pain < 1 || answer.pain > MAX_USUAL_LEVEL || usual.length === 0) return false;
  const highest = Math.min(MAX_USUAL_LEVEL, Math.max(...usual.map((u) => u.level)));
  if (answer.pain > highest) return false;
  const where = norm(answer.painWhere ?? "");
  if (where === "") return true;
  return usual.some((u) => {
    const place = norm(u.place);
    return place !== "" && (where.includes(place) || place.includes(where));
  });
}

/** The pain that counts for the zone, the advice and the coach's flag: none when it is the usual. */
export function countedPain(answer: PainAnswer): number {
  return painIsUsual(answer) ? 0 : answer.pain;
}
