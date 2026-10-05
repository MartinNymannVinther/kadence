import type { LaneCheck } from "@/modules/calc/fuel-check";
import type { MealCheck } from "@/modules/calc/meal-check";

/** A sentence to say: its key under `calculators.energy.lines`, and the numbers in it. */
export type Line = { key: string; values: Record<string, number>; litres?: readonly string[] };

/** One hour on the bike, in the order it would be felt: the stomach, then energy, then fluid. */
export function laneLines(c: LaneCheck, gutTrained: boolean): Line[] {
  const lines: Line[] = [];
  if (c.carbState === "gut")
    lines.push({ key: gutTrained ? "gutTrained" : "gutUntrained", values: { g: c.carbs } });
  if (c.carbState === "under" && c.carbRange)
    lines.push({
      key: c.mood === "empty" ? "carbsEmpty" : "carbsUnder",
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
  if (c.fluidState === "flood")
    lines.push({ key: "flood", values: { l: c.fluidL }, litres: ["l"] });
  if (c.fluidState === "under")
    lines.push({
      key: "fluidUnder",
      values: { cum: c.cumFluidL, low: c.fluidRange.low, high: c.fluidRange.high },
      litres: ["cum", "low", "high"],
    });
  if (c.fluidState === "over")
    lines.push({
      key: "fluidOver",
      values: { cum: c.cumFluidL, high: c.fluidRange.high },
      litres: ["cum", "high"],
    });
  return lines;
}

/** A meal before or after: what is short or too much, with what would fit. */
export function mealLines(c: MealCheck, when: "before" | "after"): Line[] {
  const lines: Line[] = [];
  const range = (m: MealCheck["carbs"]) => ({
    value: m.value,
    low: m.target.low,
    high: m.target.high,
  });
  if (c.carbs.state !== "ok")
    lines.push({ key: `${when}.carbs.${c.carbs.state}`, values: range(c.carbs) });
  if (c.protein && c.protein.state !== "ok")
    lines.push({ key: `${when}.protein.${c.protein.state}`, values: range(c.protein) });
  if (c.fluid.state !== "ok")
    lines.push({
      key: `${when}.fluid.${c.fluid.state}`,
      values: range(c.fluid),
      litres: ["value", "low", "high"],
    });
  return lines;
}
