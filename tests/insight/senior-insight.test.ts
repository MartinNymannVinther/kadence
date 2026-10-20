import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import type { RiderRow } from "@/core/db/schema";
import { flagSentence } from "@/components/insight/flag-text";
import { riderSignals } from "@/components/insight/signals";
import { weekBars } from "@/components/load/week-bars";
import { coachTips } from "@/modules/coach/tips";
import { weeklyCorridor } from "@/modules/dcu";
import type { InsightActivity } from "@/modules/insight/gather";
import { riderInsight } from "@/modules/insight/rider";
import { DCU_2025, seniorWeeklyCorridor } from "@/modules/paradigms";
import { raceRulesLine } from "@/modules/assist/week-draft-prompt";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The attention list and the week's chart for a senior (docs/adr/0091):
 * the corridor and the longest ride are the training profile's, the words
 * say so and never name DCU, DCU's race rules stay U17–U23's, and the
 * health flags stay for everyone. A U19 rider reads exactly as before.
 */

const TODAY = "2026-12-10"; // a Thursday
const MONDAY = "2026-12-07";

const rider = (over: Partial<RiderRow>) =>
  ({
    id: "r",
    name: "Lars",
    birthYear: 1984,
    categoryOverride: null,
    trainingProfile: null,
    shareWellbeing: true,
    ...over,
  }) as unknown as RiderRow;

const ride = (onDate: string, hours: number, km: number | null): InsightActivity => ({
  id: `a_${onDate}_${hours}`,
  riderId: "r",
  onDate,
  sport: "bike",
  seconds: hours * 3600,
  distanceM: km === null ? null : km * 1000,
  load: 60 * hours,
});

function sentence(locale: "da" | "en", flag: Parameters<typeof flagSentence>[0], klass: string) {
  const t = createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "insight.flag",
  });
  return flagSentence(flag, (key, values) => t(key as "ramp", values), { locale, klass });
}

describe("a senior's week in the attention list", () => {
  it("is measured against the profile's corridor, Motionist by default", () => {
    const insight = riderInsight(rider({}), [], [], [], TODAY, true);
    expect(insight.category).toBe("senior");
    expect(insight.basis).toBe("senior-motionist");
    expect(insight.corridor).toEqual(seniorWeeklyCorridor("senior-motionist", MONDAY));
  });

  it("flags a ride past the motionist's 3 hours, in the profile's words", () => {
    const insight = riderInsight(rider({}), [ride("2026-12-08", 3.5, 80)], [], [], TODAY, true);
    const flag = insight.flags.find((f) => f.kind === "longest_ride");
    expect(flag?.values).toMatchObject({ limitHours: 3, limitKm: 90, ref: "motionist" });
    const da = sentence("da", flag!, "Motionist");
    expect(da).toContain("Profilen Motionist lægger op til højst 3 timer eller 90 km.");
    expect(da).not.toContain("DCU");
    expect(sentence("en", flag!, "Motionist")).toContain(
      "The Motionist profile suggests at most 3 h",
    );
    expect(riderSignals(insight)?.badges).toContainEqual({
      kind: "longest_ride",
      severity: "warn",
      ref: "motionist",
    });
  });

  it("lets a supermotionist ride 5 hours or 150 km", () => {
    const sup = rider({ trainingProfile: "super-motionist" });
    const ok = riderInsight(sup, [ride("2026-12-08", 4.5, 130)], [], [], TODAY, true);
    expect(ok.flags.some((f) => f.kind === "longest_ride")).toBe(false);
    const long = riderInsight(sup, [ride("2026-12-08", 4.5, 160)], [], [], TODAY, true);
    expect(long.flags.find((f) => f.kind === "longest_ride")?.values).toMatchObject({
      limitHours: 5,
      limitKm: 150,
      ref: "supermotionist",
    });
  });

  it("says the corridor is the profile's, not DCU's", () => {
    const rides = ["07", "08", "09", "10"].map((d) => ride(`2026-12-${d}`, 2, null));
    const insight = riderInsight(rider({}), rides, [], [], TODAY, true);
    const flag = insight.flags.find((f) => f.kind === "hours_above_corridor")!;
    expect(flag.values.ref).toBe("motionist");
    const words = sentence("da", flag, "Motionist");
    expect(words).toContain("over profilens ramme");
    expect(words).not.toContain("DCU");
  });

  it("keeps the health flags for an adult, without the 14–17-year-olds' sleep minimum", () => {
    const checks = [8, 9, 10].map((day) => ({
      riderId: "r",
      onDate: `2026-12-${String(day).padStart(2, "0")}`,
      pain: day === 10 ? 3 : 0,
      ill: 0,
      energy: 4,
      mood: 4,
      sleepHours: 7,
    }));
    const insight = riderInsight(rider({}), [], [], checks as never, TODAY, true);
    const kinds = insight.flags.map((f) => f.kind);
    expect(kinds).toContain("pain");
    expect(kinds).not.toContain("sleep_below_minimum");
  });

  it("sets nothing when the team plans without a paradigm", () => {
    const insight = riderInsight(
      rider({}),
      [ride("2026-12-08", 6, 180)],
      [],
      [],
      TODAY,
      true,
      [],
      [],
      null,
    );
    expect(insight.corridor).toBeNull();
    expect(insight.flags.some((f) => f.kind === "longest_ride")).toBe(false);
  });

  it("draws the weekly chart against the profile's corridor", () => {
    const insight = riderInsight(rider({}), [], [], [], TODAY, true);
    const bars = weekBars(insight);
    const now = bars.find((b) => b.current)!;
    const c = seniorWeeklyCorridor("senior-motionist", MONDAY);
    expect(now.corridor).toEqual({ low: c.low, target: c.target, high: c.high });
  });
});

describe("a U19 rider beside them", () => {
  it("reads exactly as before: DCU's corridor, DCU's longest ride, no ref", () => {
    const u19 = rider({ birthYear: 2010, trainingProfile: "super-motionist" });
    const insight = riderInsight(u19, [ride("2026-12-08", 5.5, 160)], [], [], TODAY, true);
    expect(insight.basis).toBe("U19-1");
    expect(insight.corridor).toEqual(weeklyCorridor("U19-1", MONDAY));
    const flag = insight.flags.find((f) => f.kind === "longest_ride")!;
    expect(flag.values).toEqual({ hours: 5.5, km: 160, limitHours: 5, limitKm: 150 });
    expect(sentence("da", flag, "U19 1. år")).toContain("DCU anbefaler højst 5 timer eller 150 km");
  });
});

describe("DCU's race rules", () => {
  it("are not told about a senior and give no stage-race tip", () => {
    expect(raceRulesLine("senior")).toBe("No DCU race rules for this class.");
    const tips = coachTips({
      today: "2027-05-01",
      riders: [{ category: "senior", yearInClass: null, sex: "male" }],
      events: [
        { id: "e", kind: "race", title: "Etapeløb", startsOn: "2027-05-10", endsOn: "2027-05-16" },
      ],
      flagKinds: [],
      allowYouthWeight: false,
    });
    expect(tips.some((t) => t.id === "stageTooLong")).toBe(false);
  });

  it("strength reads the profile's rhythm for a senior and DCU's for the rest", () => {
    expect(DCU_2025.strengthFrequency("senior-motionist", "2027-03-02").perWeekMax).toBe(1);
    expect(DCU_2025.strengthFrequency("U19-1", "2027-03-02").perWeekMax).toBe(3);
  });
});
