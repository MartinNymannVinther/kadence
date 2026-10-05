"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { coverage } from "@/modules/calc/fuel";
import type { RaceAnswer, RaceInput } from "@/modules/calc/race-fuel";

const card =
  "border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5";

/** The warnings about how the effort was estimated; those about the plan sit with the plan. */
const EFFORT_WARNINGS = new Set(["heartRateAge", "speedSolo"]);

/**
 * What the race costs and the meals around it: the energy estimated from
 * the effort, how much of it the rider's own plan covers, the sweat a
 * rider may lose, and the meals before and after, which are per kg and
 * left out without a weight.
 */
export function EnergyResults({
  input,
  answer,
  planCarbsPerHour,
}: {
  input: RaceInput;
  answer: RaceAnswer;
  /** The carbohydrate the plan on the board gives an hour, on average. */
  planCarbsPerHour: number;
}) {
  const t = useTranslations("calculators.energy");
  const r = (key: string, values?: Record<string, number | string>) =>
    t(`result.${key}` as "title", values);
  const { energy } = answer;
  const perHour =
    energy.kind === "estimate" && answer.hours > 0
      ? { low: energy.kcal.low / answer.hours, high: energy.kcal.high / answer.hours }
      : null;
  const covered = perHour ? coverage(planCarbsPerHour, perHour) : null;
  const warnings = answer.warnings.filter((w) => EFFORT_WARNINGS.has(w));

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {warnings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {warnings.map((w) => (
            <li
              key={w}
              className="bg-sticky text-sticky-ink flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
            >
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t(`warnings.${w}` as "title")}
            </li>
          ))}
        </ul>
      )}

      <section className={card}>
        <h2 className="text-lg font-semibold">{r("energy")}</h2>
        {energy.kind === "estimate" ? (
          <>
            <p className="text-reading text-xl font-semibold tabular-nums">
              {r("kcal", { low: energy.kcal.low, high: energy.kcal.high })}
            </p>
            {energy.workKj !== null && energy.watts !== null && (
              <p className="text-meta text-2sm">
                {r("work", { kj: energy.workKj, watts: energy.watts })}
              </p>
            )}
            {covered && (
              <p className="text-reading leading-relaxed">
                {r("coverage", {
                  low: covered.low * 100,
                  high: Math.min(100, covered.high * 100),
                })}
              </p>
            )}
            <p className="text-meta text-2sm leading-relaxed">{r("energyNote")}</p>
          </>
        ) : (
          <p className="text-reading">
            {r(energy.kind === "needsWeight" ? "needsWeight" : "none")}
          </p>
        )}
      </section>

      {answer.before && answer.after && answer.allowedLossKg !== null ? (
        <>
          <section className={card}>
            <h2 className="text-lg font-semibold">{r("before")}</h2>
            <p className="text-reading leading-relaxed">
              {r("beforeBody", {
                carbs: answer.before.carbs,
                hours: Math.min(4, Math.max(1, input.hoursBefore)),
                low: answer.before.fluidMl.low,
                high: answer.before.fluidMl.high,
              })}
            </p>
            <p className="text-meta text-2sm leading-relaxed">{r("beforeNote")}</p>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">{r("sweat")}</h2>
            <p className="text-reading leading-relaxed">
              {r("loss", { kg: answer.allowedLossKg })}
            </p>
            <p className="text-meta text-2sm">{r("weighIn")}</p>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">{r("after")}</h2>
            <p className="text-reading leading-relaxed">
              {r("afterBody", {
                low: answer.after.carbs.low,
                high: answer.after.carbs.high,
                pLow: answer.after.protein.low,
                pHigh: answer.after.protein.high,
              })}
            </p>
            <p className="text-meta text-2sm leading-relaxed">{r("afterNote")}</p>
          </section>
        </>
      ) : (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm">{r("weightMissing")}</p>
      )}
    </div>
  );
}
