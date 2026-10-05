"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { sodiumLowMg, type PlanCheck } from "@/modules/calc/fuel-check";
import type { AfterCheck, MealCheck } from "@/modules/calc/meal-check";
import { cn } from "@/lib/utils";
import { laneLines, mealLines, type Line } from "./energy-lines";

function Score({
  step,
  label,
  ok,
  text,
}: {
  step: number;
  label: string;
  ok: boolean;
  text: string;
}) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        ok ? "border-success/40 bg-success-tint" : "border-border bg-card",
      )}
    >
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {step}
      </span>
      <span className="flex flex-col">
        <span className="text-2sm font-semibold">{label}</span>
        <span className={cn("flex items-center gap-1 text-xs", ok ? "text-success" : "text-meta")}>
          <Icon aria-hidden className="size-3.5" />
          {text}
        </span>
      </span>
    </li>
  );
}

/**
 * What the whole plan comes to: each part of the day on target or not,
 * then in words what is short or too much and what would fit — before,
 * hour by hour on the bike, and after — and what holds for the whole
 * session: salt, heat, the stomach, rice cakes that keep an hour or two,
 * bottles beyond two cages. Kadence suggests; the rider chooses.
 */
export function EnergyResults({
  before,
  during,
  after,
  gutTrained,
}: {
  before: MealCheck;
  during: PlanCheck;
  after: AfterCheck;
  gutTrained: boolean;
}) {
  const t = useTranslations("calculators.energy.results");
  const lines = useTranslations("calculators.energy.lines");
  const warnings = useTranslations("calculators.energy.warnings");
  const locale = useLocale();
  const hours = (during.lanes.at(-1)?.lane.toMin ?? 0) / 60;
  const said = (line: Line) =>
    lines(
      line.key as "carbsUnder",
      Object.fromEntries(
        Object.entries(line.values).map(([k, v]) => [
          k,
          line.litres?.includes(k) ? num(v, locale, 2) : v,
        ]),
      ),
    );

  const groups = [
    { key: "before", title: t("before"), lines: mealLines(before, "before") },
    ...during.lanes.map((c) => ({
      key: `during-${c.lane.index}`,
      title: t("hour", { hour: c.lane.index + 1 }),
      lines: laneLines(c, gutTrained),
    })),
    ...after.slots.map((c, i) => ({
      key: `after-${i}`,
      title: after.slots.length > 1 ? t("afterHour", { hour: i + 1 }) : t("after"),
      lines: mealLines(c, "after"),
    })),
  ].filter((g) => g.lines.length > 0);

  const note = (n: PlanCheck["notes"][number]) => {
    switch (n) {
      case "capped":
      case "practise":
      case "heat":
      case "multiple":
        return warnings(n);
      case "sodium":
        return t("notes.sodium", {
          mg: during.totals.sodiumMg,
          low: sodiumLowMg(during.fluidPerHour, hours),
        });
      case "cages":
        return t("notes.cages", { n: during.totals.bottles });
      case "pastFinish":
        return t("notes.pastFinish", { n: during.pastFinish });
      default:
        return t(`notes.${n}` as "notes.fuelHeat");
    }
  };

  return (
    <section aria-labelledby="energy-results" className="flex flex-col gap-3">
      <h3 id="energy-results" className="text-base font-semibold">
        {t("title")}
      </h3>
      <ul className="grid gap-2 sm:grid-cols-3">
        <Score
          step={1}
          label={t("before")}
          ok={before.onTarget}
          text={t(before.onTarget ? "onTarget" : "offTarget")}
        />
        <Score
          step={2}
          label={t("during")}
          ok={during.podium}
          text={t("hours", { on: during.onTarget, total: during.lanes.length })}
        />
        <Score
          step={3}
          label={t("after")}
          ok={after.onTarget === after.slots.length}
          text={t(after.onTarget === after.slots.length ? "onTarget" : "offTarget")}
        />
      </ul>
      {groups.length === 0 ? (
        <p className="text-success flex items-center gap-2 text-reading font-medium">
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          {t("allGood")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.key} className="flex flex-col gap-0.5">
              <span className="text-2sm font-semibold">{g.title}</span>
              {g.lines.map((line) => (
                <span key={line.key} className="text-reading leading-relaxed">
                  {said(line)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {during.notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {during.notes.map((n) => (
            <li
              key={n}
              className="bg-secondary flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
            >
              <Info aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
              {note(n)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
