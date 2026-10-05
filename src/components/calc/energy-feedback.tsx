"use client";

import { CircleCheck, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { sodiumLowMg, type LaneCheck, type PlanCheck } from "@/modules/calc/fuel-check";

/** What to say about one hour, in the order the rider would feel it: the stomach, then energy, then fluid. */
function laneLines(
  c: LaneCheck,
  gutTrained: boolean,
): Array<{ key: string; values: Record<string, number> }> {
  const lines: Array<{ key: string; values: Record<string, number> }> = [];
  if (c.carbState === "gut")
    lines.push({ key: gutTrained ? "gutTrained" : "gutUntrained", values: { g: c.carbs } });
  if (c.carbState === "under" && c.carbRange)
    lines.push({
      key: "carbsUnder",
      values: {
        cum: c.cumCarbs,
        low: Math.round(c.carbRange.low),
        high: Math.round(c.carbRange.high),
      },
    });
  if (c.carbState === "over" && c.carbRange)
    lines.push({
      key: "carbsOver",
      values: { cum: c.cumCarbs, high: Math.round(c.carbRange.high) },
    });
  if (c.fluidState === "flood") lines.push({ key: "flood", values: { l: c.fluidL } });
  if (c.fluidState === "under")
    lines.push({
      key: "fluidUnder",
      values: { cum: c.cumFluidL, low: c.fluidRange.low, high: c.fluidRange.high },
    });
  if (c.fluidState === "over")
    lines.push({ key: "fluidOver", values: { cum: c.cumFluidL, high: c.fluidRange.high } });
  return lines;
}

const LITRES = new Set(["cum", "low", "high", "l"]);

/**
 * The plan in words: hour by hour what is short or too much and what
 * would help, then what holds for the whole race — salt, heat, the
 * stomach, rice cakes that keep for an hour or two, bottles beyond the
 * two cages. Kadence suggests; the rider chooses.
 */
export function EnergyFeedback({ check, gutTrained }: { check: PlanCheck; gutTrained: boolean }) {
  const t = useTranslations("calculators.energy.builder");
  const warnings = useTranslations("calculators.energy.warnings");
  const result = useTranslations("calculators.energy.result");
  const locale = useLocale();
  const hours = (check.lanes.at(-1)?.lane.toMin ?? 0) / 60;

  const said = (key: string, values: Record<string, number>) => {
    const fluid = key.startsWith("fluid") || key === "flood";
    const shown = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, fluid && LITRES.has(k) ? num(v, locale, 2) : v]),
    );
    return t(`feedback.${key}` as "feedback.allGood", shown);
  };

  const hoursWithLines = check.lanes
    .map((c) => ({ c, lines: laneLines(c, gutTrained) }))
    .filter((h) => h.lines.length > 0);

  const note = (n: PlanCheck["notes"][number]) => {
    switch (n) {
      case "capped":
      case "practise":
      case "heat":
        return warnings(n);
      case "multiple":
        return result("multiple");
      case "sodium":
        return t("notes.sodium", {
          mg: check.totals.sodiumMg,
          low: sodiumLowMg(check.fluidPerHour, hours),
        });
      case "cages":
        return t("notes.cages", { n: check.totals.bottles });
      case "pastFinish":
        return t("notes.pastFinish", { n: check.pastFinish });
      default:
        return t(`notes.${n}` as "notes.fuelHeat");
    }
  };

  return (
    <section aria-labelledby="energy-feedback" className="flex flex-col gap-3">
      <h3 id="energy-feedback" className="text-base font-semibold">
        {t("feedback.title")}
      </h3>
      {hoursWithLines.length === 0 ? (
        <p className="text-success flex items-center gap-2 text-reading font-medium">
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          {t("feedback.allGood")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {hoursWithLines.map(({ c, lines }) => (
            <li key={c.lane.index} className="flex flex-col gap-0.5">
              <span className="text-2sm font-semibold">
                {t("feedback.hour", { hour: c.lane.index + 1 })}
              </span>
              {lines.map((line) => (
                <span key={line.key} className="text-reading leading-relaxed">
                  {said(line.key, line.values)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {check.notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {check.notes.map((n) => (
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
