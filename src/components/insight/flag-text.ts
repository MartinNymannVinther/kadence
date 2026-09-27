import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { num } from "@/components/charts/format";
import type { Flag } from "@/modules/load";

/**
 * A guardrail's flag as a sentence (src/modules/load/guardrails.ts): the
 * rule names its kind and the numbers behind it, and the words come from
 * `insight.flag` so they read in the reader's language — "Ugen er 11,2
 * timer på cyklen, over DCU's ramme på 9,8 timer for U19 1. år". Pure.
 */

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type FlagContext = {
  locale: string;
  /** The rider's class in words, "U19 1. år", for the corridor's sentence. */
  klass: string;
};

const n = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

export function flagSentence(flag: Flag, t: Translate, { locale, klass }: FlagContext): string {
  const v = flag.values;
  const hours = (key: string) => num(n(v[key]), locale, 1);
  const day = (key: string) =>
    typeof v[key] === "string"
      ? `${weekdayShort(v[key] as string, locale)} ${dayMonth(v[key] as string, locale)}`
      : "";
  switch (flag.kind) {
    case "hours_above_corridor":
      return t("hours_above_corridor", { hours: hours("hours"), high: hours("high"), klass });
    case "hours_below_corridor":
      return t("hours_below_corridor", { hours: hours("hours"), low: hours("low"), klass });
    case "ramp":
      return t("ramp", {
        hours: hours("hours"),
        average: hours("average"),
        percent: n(v.percent),
        limit: n(v.limit),
      });
    case "longest_ride":
      return typeof v.km === "number"
        ? t("longest_ride_km", {
            hours: hours("hours"),
            km: n(v.km),
            limitHours: n(v.limitHours),
            limitKm: n(v.limitKm),
          })
        : t("longest_ride", {
            hours: hours("hours"),
            limitHours: n(v.limitHours),
            limitKm: n(v.limitKm),
          });
    case "strength_spacing":
      return t("strength_spacing", { first: day("first"), second: day("second") });
    case "wellbeing_talk":
      return t("wellbeing_talk", { days: n(v.yellowDays) });
    case "wellbeing_help":
      return v.zone === "red"
        ? t("wellbeing_help_red")
        : t("wellbeing_help_long", { days: n(v.yellowDays) });
    case "pain":
      return t(n(v.pain) >= 3 ? "pain_3" : "pain_2");
    case "sleep_short":
      return t("sleep_short", {
        average: hours("average"),
        nights: n(v.nights),
        limit: n(v.limit),
      });
    case "sleep_below_minimum":
      return t("sleep_below_minimum", {
        average: hours("average"),
        nights: n(v.nights),
        minimum: n(v.minimum),
      });
    case "compliance":
      return t("compliance", { red: n(v.red), judged: n(v.judged) });
  }
}

/** The signs behind a wellbeing flag, as the keys of `insight.sign`. */
export function flagSigns(flag: Flag): string[] {
  if (flag.kind !== "wellbeing_talk" && flag.kind !== "wellbeing_help") return [];
  return String(flag.values.signs ?? "")
    .split(",")
    .filter(Boolean);
}
