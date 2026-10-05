"use client";

import { useTranslations } from "next-intl";
import type { Range } from "@/modules/calc/energy";

/**
 * Why the bike cannot pay back the race: what a race in a bunch uses in
 * an hour for a typical rider in the class, beside what the stomach can
 * take, on one scale and in words.
 */
export function EnergyBudget({ kcal, gutCap }: { kcal: Range; gutCap: number }) {
  const t = useTranslations("calculators.energy.budget");
  const max = kcal.high * 1.05;
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  const most = Math.round(((gutCap * 4) / ((kcal.low + kcal.high) / 2)) * 100);

  return (
    <figure className="bg-secondary/60 flex flex-col gap-3 rounded-lg p-3 sm:p-4">
      <figcaption className="text-2sm font-semibold">{t("title")}</figcaption>
      <dl className="grid grid-cols-[8rem_1fr] items-center gap-x-3 gap-y-2 sm:grid-cols-[10rem_1fr]">
        <dt className="text-meta text-xs leading-tight">{t("body")}</dt>
        <dd className="flex flex-col gap-0.5">
          <div aria-hidden className="relative h-3.5">
            <div
              className="absolute inset-y-0 left-0 rounded-sm bg-[#c4492f]/35"
              style={{ width: pct(kcal.high) }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-sm bg-[#c4492f]"
              style={{ width: pct(kcal.low) }}
            />
          </div>
          <span className="text-xs tabular-nums">
            {t("bodyKcal", { low: Math.round(kcal.low), high: Math.round(kcal.high) })}
          </span>
        </dd>
        <dt className="text-meta text-xs leading-tight">{t("stomach")}</dt>
        <dd className="flex flex-col gap-0.5">
          <div aria-hidden className="relative h-3.5">
            <div
              className="bg-primary absolute inset-y-0 left-0 rounded-sm"
              style={{ width: pct(gutCap * 4) }}
            />
          </div>
          <span className="text-xs tabular-nums">
            {t("stomachKcal", { g: gutCap, kcal: gutCap * 4 })}
          </span>
        </dd>
      </dl>
      <p className="text-reading leading-relaxed">{t("note", { most })}</p>
    </figure>
  );
}
