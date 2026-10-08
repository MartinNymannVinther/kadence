import type { Dose, ProgramView } from "./types";

/**
 * A translator for the `exercises` namespace: next-intl's `useTranslations`
 * or `getTranslations("exercises")` on a page, `createTranslator` in a test.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** How heavy, in a word ("let", "moderat", "tung"), or "" when the dose does not say. */
export function loadWord(dose: Dose, t: Translate): string {
  return dose.load ? t(`dose.loads.${dose.load}`) : "";
}

/**
 * A dose in words, as the card shows it beside the name: "30 sek pr. side",
 * "3 × 10", "3 × 30 sek", "10 pr. side", "10 gange", and the load after a
 * dot when it has one: "3 × 10 · moderat". Whole minutes from a minute up
 * read as minutes ("2 min"); anything else as seconds.
 */
export function formatDose(dose: Dose, t: Translate): string {
  const amount = amountWithSets(dose, t);
  return dose.load ? t("dose.withLoad", { amount, load: loadWord(dose, t) }) : amount;
}

function amountWithSets(dose: Dose, t: Translate): string {
  const sets = dose.sets ?? 1;
  const perSide = dose.perSide ?? false;
  let amount: string;
  if (dose.kind === "time") {
    amount =
      dose.seconds >= 60 && dose.seconds % 60 === 0
        ? t("dose.minutes", { minutes: dose.seconds / 60 })
        : t("dose.seconds", { seconds: dose.seconds });
  } else {
    if (sets === 1 && !perSide) return t("dose.times", { reps: dose.reps });
    amount = String(dose.reps);
  }
  if (perSide) amount = t("dose.perSide", { amount });
  return sets > 1 ? t("dose.sets", { sets, amount }) : amount;
}

/** A rough seconds for one set of a dose: a hold as given, a rep about three seconds, doubled per side. */
function doseSeconds(dose: Dose): number {
  const perSet = dose.kind === "time" ? dose.seconds : dose.reps * 3;
  return perSet * (dose.sets ?? 1) * (dose.perSide ? 2 : 1);
}

/** A programme's whole time on the gallery's card, rounded to the nearest minute, at least one. */
export function programMinutes(program: Pick<ProgramView, "parts">): number {
  const seconds = program.parts
    .flatMap((part) => part.items)
    .reduce((sum, item) => sum + doseSeconds(item.dose), 0);
  return Math.max(1, Math.round(seconds / 60));
}
