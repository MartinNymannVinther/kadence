import type { Dose } from "./types";

/**
 * A translator for the `exercises` namespace: next-intl's `useTranslations`
 * or `getTranslations("exercises")` on a page, `createTranslator` in a test.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * A dose in words, as the card shows it beside the name: "30 sek pr. side",
 * "3 × 10", "3 × 30 sek", "10 pr. side", "10 gange". Whole minutes from a
 * minute up read as minutes ("2 min"); anything else as seconds.
 */
export function formatDose(dose: Dose, t: Translate): string {
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
