import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The words beside a plan (docs/adr/0091): for a senior they name the
 * profile and never DCU; for U17–U23 they read word for word as they did
 * before the profiles came.
 */

type Words = (key: string, values?: Record<string, string | number>) => string;
const t = (namespace: string, locale: "da" | "en" = "da"): Words =>
  createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: namespace as "season",
  }) as unknown as Words;

describe("the words for U17–U23 are unchanged", () => {
  it("in the season plan, the week's bar and the strength line", () => {
    expect(t("season")("totals", { plan: 5, scheduled: 4, ridden: 3, dcu: 6, ref: "dcu" })).toBe(
      "Sæsonen i alt: sæsonplan 5 t · lagt ind 4 t · kørt 3 t · DCU 6 t",
    );
    expect(t("season.deviation")("over", { hours: "2", ref: "dcu" })).toBe("2 t over DCU");
    expect(t("season.deviation")("breakOver", { ref: "dcu" })).toBe("DCU holder pause");
    expect(t("season.reset")("button", { ref: "dcu" })).toBe("Fyld ud igen fra DCU");
    expect(t("volume")("state.inside", { ref: "dcu" })).toBe("inden for DCU's ramme");
    expect(t("volume")("dcuBreak", { ref: "dcu" })).toBe("DCU: pause og frit");
    expect(t("calendar.totals")("strength", { done: 1, planned: 2, dcu: "2–3", ref: "dcu" })).toBe(
      "Styrke: 1 af 2 pas udført. DCU anbefaler 2–3 om ugen.",
    );
    expect(t("insight.badge")("hours_above_corridor", { ref: "dcu" })).toBe("Over DCU's ramme");
    expect(t("season.chart", "en")("dcu", { ref: "dcu" })).toBe("DCU");
  });
});

describe("the words for a senior", () => {
  it("name the profile and never DCU", () => {
    const said = [
      t("season")("totals", { plan: 5, scheduled: 4, ridden: 3, dcu: 6, ref: "motionist" }),
      t("season.deviation")("under", { hours: "1", ref: "supermotionist" }),
      t("season.reset")("title", { ref: "motionist" }),
      t("volume")("state.over", { ref: "motionist" }),
      t("calendar.totals")("strength", { done: 0, planned: 1, dcu: "1", ref: "motionist" }),
      t("season")("basisSenior", { profile: "super-motionist" }),
      t("insight")("basisSenior", { profile: "motionist" }),
    ];
    expect(said).toEqual([
      "Sæsonen i alt: sæsonplan 5 t · lagt ind 4 t · kørt 3 t · Motionist 6 t",
      "1 t under Supermotionist",
      "Fyld planen ud igen fra profilen?",
      "over profilens ramme",
      "Styrke: 0 af 1 pas udført. Motionist foreslår 1 om ugen.",
      "Supermotionist",
      "Motionist",
    ]);
    for (const line of said) expect(line).not.toContain("DCU");
  });

  it("say so in English too", () => {
    expect(t("volume", "en")("state.under", { ref: "supermotionist" })).toBe(
      "below the profile's range",
    );
    expect(t("riders.trainingProfile", "en")("superMotionistBody")).toContain("About 10 hours");
  });
});
