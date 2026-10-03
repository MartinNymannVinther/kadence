"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RaceAnswer, RaceInput } from "@/modules/calc/race-fuel";

const card =
  "border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5";

/** The calculator's answer: energy, carbohydrate, fluid and salt, the plan, and before and after. */
export function EnergyResults({ input, answer }: { input: RaceInput; answer: RaceAnswer }) {
  const t = useTranslations("calculators.energy");
  const r = (key: string, values?: Record<string, number | string>) =>
    t(`result.${key}` as "title", values);
  const { energy, carbs, plan } = answer;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {answer.warnings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {answer.warnings.map((w) => (
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
            <p className="text-meta text-2sm leading-relaxed">{r("energyNote")}</p>
          </>
        ) : (
          <p className="text-reading">
            {r(energy.kind === "needsWeight" ? "needsWeight" : "none")}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{r("carbs")}</h2>
        {carbs.kind === "water" || carbs.kind === "small" ? (
          <p className="text-reading leading-relaxed">{r(carbs.kind)}</p>
        ) : (
          <>
            <p className="text-reading leading-relaxed">
              {r("carbsRange", {
                low: carbs.low,
                high: carbs.high,
                target: carbs.target,
                total: plan.carbsTotal,
              })}
            </p>
            <p className="text-reading leading-relaxed">{r(carbs.kind)}</p>
            {answer.coverage && (
              <p className="text-meta text-2sm leading-relaxed">
                {r("coverage", {
                  low: answer.coverage.low * 100,
                  high: Math.min(100, answer.coverage.high * 100),
                })}
              </p>
            )}
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{r("fluid")}</h2>
        <p className="text-reading">
          {r("fluidRange", { low: answer.fluid.low, high: answer.fluid.high })}
        </p>
        <p className="text-reading">
          {r("sodium", { low: answer.sodium.low, high: answer.sodium.high })}
        </p>
        {answer.allowedLossKg !== null && (
          <p className="text-reading leading-relaxed">{r("loss", { kg: answer.allowedLossKg })}</p>
        )}
        <p className="text-meta text-2sm">{r("weighIn")}</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{r("plan")}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-reading leading-relaxed marker:text-[var(--meta)]">
          <li>{r("bottles", { bottles: plan.bottles, ml: input.bottleMl })}</li>
          {plan.carbsFromBottles > 0 && (
            <li>{r("fromBottles", { grams: plan.carbsFromBottles })}</li>
          )}
          {carbs.target > 0 && <li>{r("pieces", { pieces: plan.pieces })}</li>}
        </ul>
      </section>

      {answer.before && answer.after ? (
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
