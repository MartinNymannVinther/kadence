"use client";

import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { Range } from "@/modules/calc/energy";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  /** Drawn from 0 to `low`, then paler to `high`. */
  range: Range;
  shown: string;
  tone: "body" | "limit" | "goal" | "plan";
};

const TONE: Record<Row["tone"], { solid: string; pale: string }> = {
  body: { solid: "bg-[#c4492f]", pale: "bg-[#c4492f]/35" },
  limit: { solid: "bg-foreground/70", pale: "bg-foreground/25" },
  goal: { solid: "bg-success-tint border border-dashed border-success/60", pale: "" },
  plan: { solid: "bg-primary", pale: "bg-primary/40" },
};

function Bars({ title, rows, max }: { title: string; rows: Row[]; max: number }) {
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-2sm font-semibold">{title}</h4>
      <dl className="grid grid-cols-[7.5rem_1fr] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[9rem_1fr]">
        {rows.map((row) => {
          const t = TONE[row.tone];
          return (
            <div key={row.key} className="contents">
              <dt className="text-meta text-xs leading-tight">{row.label}</dt>
              <dd className="flex min-w-0 flex-col gap-0.5">
                <div aria-hidden className="relative h-3">
                  {row.tone === "goal" ? (
                    <div
                      className={cn("absolute inset-y-0 rounded-sm", t.solid)}
                      style={{
                        left: pct(row.range.low),
                        width: pct(row.range.high - row.range.low),
                      }}
                    />
                  ) : (
                    <>
                      <div
                        className={cn("absolute inset-y-0 left-0 rounded-sm", t.pale)}
                        style={{ width: pct(row.range.high) }}
                      />
                      <div
                        className={cn("absolute inset-y-0 left-0 rounded-sm", t.solid)}
                        style={{ width: pct(row.range.low) }}
                      />
                    </>
                  )}
                </div>
                <span className="text-2xs leading-tight tabular-nums">{row.shown}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * One hour on the bike, side by side: what the body uses, what the
 * stomach can take, what is recommended and what the plan gives — for
 * energy and for fluid. It shows why the plan cannot pay back the whole
 * race on the bike, and why the meals before and after count.
 */
export function EnergyBudget({
  kcalPerHour,
  gutCap,
  advice,
  planCarbs,
  sweat,
  absorb,
  fluidGoal,
  planFluid,
  allowedLossL,
}: {
  kcalPerHour: Range | null;
  gutCap: number;
  /** The carbohydrate recommended an hour; null when the session asks none. */
  advice: Range | null;
  planCarbs: number;
  sweat: Range;
  absorb: Range;
  fluidGoal: Range;
  planFluid: number;
  allowedLossL: number;
}) {
  const t = useTranslations("calculators.energy.budget");
  const locale = useLocale();
  const kcal = (g: number) => g * 4;
  const l = (n: number) => num(n, locale, 2);

  const energy: Row[] = [
    ...(kcalPerHour
      ? [
          {
            key: "body",
            label: t("body"),
            range: kcalPerHour,
            shown: t("bodyKcal", {
              low: Math.round(kcalPerHour.low),
              high: Math.round(kcalPerHour.high),
            }),
            tone: "body" as const,
          },
        ]
      : []),
    {
      key: "limit",
      label: t("stomach"),
      range: { low: kcal(gutCap), high: kcal(gutCap) },
      shown: t("stomachCarbs", { g: gutCap, kcal: kcal(gutCap) }),
      tone: "limit",
    },
    ...(advice
      ? [
          {
            key: "goal",
            label: t("goal"),
            range: { low: kcal(advice.low), high: kcal(advice.high) },
            shown: t("goalCarbs", { low: advice.low, high: advice.high }),
            tone: "goal" as const,
          },
        ]
      : []),
    {
      key: "plan",
      label: t("plan"),
      range: { low: kcal(planCarbs), high: kcal(planCarbs) },
      shown: t("planCarbs", { g: Math.round(planCarbs), kcal: Math.round(kcal(planCarbs)) }),
      tone: "plan",
    },
  ];
  const fluid: Row[] = [
    {
      key: "body",
      label: t("sweat"),
      range: sweat,
      shown: t("litres", { low: l(sweat.low), high: l(sweat.high) }),
      tone: "body",
    },
    {
      key: "limit",
      label: t("stomach"),
      range: absorb,
      shown: t("litres", { low: l(absorb.low), high: l(absorb.high) }),
      tone: "limit",
    },
    {
      key: "goal",
      label: t("goalFluid"),
      range: fluidGoal,
      shown: t("litres", { low: l(fluidGoal.low), high: l(fluidGoal.high) }),
      tone: "goal",
    },
    {
      key: "plan",
      label: t("plan"),
      range: { low: planFluid, high: planFluid },
      shown: t("litre", { l: l(planFluid) }),
      tone: "plan",
    },
  ];
  const share =
    kcalPerHour && planCarbs > 0
      ? Math.round((kcal(planCarbs) / ((kcalPerHour.low + kcalPerHour.high) / 2)) * 100)
      : null;
  const most = kcalPerHour
    ? Math.round((kcal(gutCap) / ((kcalPerHour.low + kcalPerHour.high) / 2)) * 100)
    : null;

  return (
    <figure className="bg-secondary/60 flex flex-col gap-4 rounded-lg p-3 sm:p-4">
      <figcaption className="text-2sm font-semibold">{t("title")}</figcaption>
      <Bars
        title={t("energy")}
        rows={energy}
        max={Math.max(...energy.map((r) => r.range.high)) * 1.08}
      />
      <p className="text-reading leading-relaxed">
        {most !== null ? t("energyNote", { most, share: share ?? 0 }) : t("energyNoEffort")}
      </p>
      <Bars
        title={t("fluid")}
        rows={fluid}
        max={Math.max(...fluid.map((r) => r.range.high)) * 1.08}
      />
      <p className="text-reading leading-relaxed">{t("fluidNote", { loss: l(allowedLossL) })}</p>
    </figure>
  );
}
