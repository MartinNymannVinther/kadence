import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { reasonSentence, resultParts, usualSentence } from "@/components/wellbeing/checkin-why";
import { addDaysIso } from "@/core/dates";
import { checkinReasons, usualPainPlaces } from "@/modules/load/checkin-reasons";
import { guardrails } from "@/modules/load/guardrails";
import { lastingPainFlag } from "@/modules/load/known-pain-flag";
import { countedPain, painIsUsual } from "@/modules/load/usual-pain";
import { checkinZone, isRedCheckin, type Checkin } from "@/modules/load/wellbeing";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * Known pains (docs/adr/0097): when a rider's back always hurts a little,
 * a check-in that says "Ryg som det plejer" must not turn the day yellow
 * and tell them to cut training in half. A pain above the usual level, or
 * in a new place, follows ATK's ladder as before; pain 3 is always red.
 * The card says why a day is yellow or red, and names a coach only in a
 * club. A young rider's known pain three weeks running is a quiet point
 * for the coach.
 */

const good: Checkin = {
  sleepHours: 8,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  soreness: 4,
  stress: 4,
  pain: 0,
  painWhere: "",
  ill: 0,
};
const BACK = { id: "kp_back", place: "Ryg", level: 2 };
const KNEE = { id: "kp_knee", place: "Venstre knæ", level: 1 };

describe("a known pain at its usual level", () => {
  it("does not colour the day: back usual 2, pain 2 and the tick is green", () => {
    const day = { ...good, pain: 2, usualPains: [BACK] };
    expect(painIsUsual(day)).toBe(true);
    expect(countedPain(day)).toBe(0);
    expect(checkinZone(day)).toEqual({ zone: "green", signs: [] });
  });

  it("is yellow as today without the tick", () => {
    expect(checkinZone({ ...good, pain: 2 })).toEqual({ zone: "yellow", signs: ["pain"] });
    expect(checkinZone({ ...good, pain: 2, usualPains: [] }).zone).toBe("yellow");
  });

  it("is red at pain 3, ticked or not", () => {
    const day = { ...good, pain: 3, usualPains: [BACK] };
    expect(painIsUsual(day)).toBe(false);
    expect(checkinZone(day)).toEqual({ zone: "red", signs: ["pain"] });
    expect(isRedCheckin(day)).toBe(true);
  });

  it("follows the ladder above the usual level", () => {
    const day = { ...good, pain: 2, usualPains: [KNEE] };
    expect(painIsUsual(day)).toBe(false);
    expect(checkinZone(day).zone).toBe("yellow");
    // Two ticked: the highest usual level is what today's pain is held to.
    expect(checkinZone({ ...day, usualPains: [KNEE, BACK] }).zone).toBe("green");
  });

  it("follows the ladder for a new place", () => {
    const knee = { ...good, pain: 2, painWhere: "Højre knæ", usualPains: [BACK] };
    expect(checkinZone(knee).zone).toBe("yellow");
    for (const where of ["Ryg", "ryggen", "Nedre ryg", " RYG "])
      expect(checkinZone({ ...knee, painWhere: where }).zone).toBe("green");
  });

  it("is a tick of pain 0 or 1 that changes nothing", () => {
    expect(checkinZone({ ...good, usualPains: [BACK] }).zone).toBe("green");
    expect(checkinZone({ ...good, pain: 1, usualPains: [BACK] }).zone).toBe("green");
  });

  it("leaves every other rule as it was", () => {
    const tired = { ...good, pain: 2, usualPains: [BACK], sleepHours: 5 };
    expect(checkinZone(tired)).toEqual({ zone: "yellow", signs: ["short_sleep"] });
    expect(checkinZone({ ...good, pain: 2, usualPains: [BACK], ill: 1 })).toEqual({
      zone: "red",
      signs: ["ill"],
    });
  });

  it("raises no pain flag for the coach, which a pain above it still does", () => {
    const usual = { ...good, pain: 2, usualPains: [BACK] };
    const kinds = (pain: number) =>
      guardrails({ bikeHours: 0, latestPain: pain }).map((f) => f.kind);
    expect(kinds(countedPain(usual))).toEqual([]);
    expect(kinds(countedPain({ ...usual, usualPains: [] }))).toEqual(["pain"]);
    expect(kinds(countedPain({ ...usual, pain: 3 }))).toEqual(["pain"]);
  });
});

function why(locale: "da" | "en") {
  const t = createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "checkin.why",
  });
  return (key: string, values?: Record<string, string | number>) => t(key as "ill", values);
}
const say = (checkin: Checkin, locale: "da" | "en" = "da") =>
  checkinReasons(checkin).map((r) => reasonSentence(r, why(locale), locale));

describe("why a day is yellow or red", () => {
  it("names nothing on a green day", () => {
    expect(checkinReasons(good)).toEqual([]);
  });

  it("says each sign in the rider's own answers", () => {
    expect(say({ ...good, ill: 1 })).toEqual(["Du svarede, at du er syg."]);
    expect(say({ ...good, mood: 1 })).toEqual(["Du svarede, at humøret er helt i bund."]);
    expect(say({ ...good, pain: 2 })).toEqual([
      "Du svarede, at noget gør mere ondt end det plejer, når du starter og dagen efter.",
    ]);
    expect(say({ ...good, pain: 2, painWhere: "Ryg", usualPains: [KNEE] })).toEqual([
      "Du svarede, at noget gør mere ondt end det plejer, når du starter og dagen efter (Ryg).",
    ]);
    expect(say({ ...good, pain: 3, painWhere: "Ryg" })).toEqual([
      "Du svarede, at noget gør ondt under træning eller i hverdagen (Ryg).",
    ]);
    expect(say({ ...good, energy: 1, soreness: 1 })).toEqual([
      "Du svarede helt i bund på energien og benene.",
    ]);
    expect(say({ pain: 0, ill: 0, sleepQuality: 2, energy: 3, mood: 2 })).toEqual([
      "Dine svar ligger i snit på 2,3.",
    ]);
    expect(say({ ...good, sleepHours: 5.5 })).toEqual(["Du sov under 6 timer i nat."]);
    expect(say({ ...good, sleepHours: 5.5 }, "en")).toEqual([
      "You slept less than 6 hours last night.",
    ]);
  });

  it("names the red signs on a red day, in the zone's order", () => {
    expect(checkinReasons({ ...good, ill: 1, pain: 3, sleepHours: 5 }).map((r) => r.sign)).toEqual([
      "ill",
      "pain",
    ]);
  });

  it("says a known pain as usual does not colour the day", () => {
    const day = { ...good, pain: 2, usualPains: [BACK] };
    expect(usualPainPlaces(day)).toEqual(["Ryg"]);
    expect(usualSentence(usualPainPlaces(day), why("da"), "da")).toBe(
      "Ryg som det plejer. Det farver ikke dagen.",
    );
    expect(usualPainPlaces({ ...day, pain: 3 })).toEqual([]);
    expect(usualPainPlaces({ ...day, painWhere: "Knæ" })).toEqual([]);
  });
});

describe("the answered card", () => {
  const yellow = { ...good, pain: 2 };

  it("names the coach only in a club, and only on a yellow or red day", () => {
    expect(resultParts(yellow, "yellow", true).coachLine).toBe(true);
    expect(resultParts(yellow, "yellow", false).coachLine).toBe(false);
    expect(resultParts(good, "green", true).coachLine).toBe(false);
  });

  it("gives no advice to cut training for a known pain at its usual level", () => {
    expect(resultParts(yellow, "yellow", true).advice).toEqual(["pain2Advice"]);
    const usual = { ...yellow, usualPains: [BACK] };
    expect(resultParts(usual, checkinZone(usual).zone, true)).toEqual({
      reasons: [],
      usual: ["Ryg"],
      coachLine: false,
      advice: [],
    });
    expect(resultParts({ ...usual, pain: 3 }, "red", false).advice).toEqual(["pain3Advice"]);
  });
});

describe("a known pain three weeks running", () => {
  const TODAY = "2026-11-20";
  const ticked = (ago: number, pains = [BACK]) => ({
    date: addDaysIso(TODAY, -ago),
    usualPains: pains,
  });

  it("is a quiet point when the same known pain is ticked in each of the three weeks", () => {
    const flag = lastingPainFlag([ticked(20), ticked(10), ticked(1)], TODAY);
    expect(flag).toEqual({
      kind: "known_pain_lasting",
      severity: "info",
      values: { place: "Ryg", days: 3, since: addDaysIso(TODAY, -20) },
    });
  });

  it("is nothing with a week without it, or before three weeks", () => {
    expect(lastingPainFlag([ticked(20), ticked(1)], TODAY)).toBeNull();
    expect(lastingPainFlag([ticked(13), ticked(6), ticked(0)], TODAY)).toBeNull();
    expect(lastingPainFlag([ticked(21), ticked(10), ticked(1)], TODAY)).toBeNull();
  });

  it("counts each known pain on its own", () => {
    const days = [ticked(20, [BACK]), ticked(10, [KNEE]), ticked(1, [BACK])];
    expect(lastingPainFlag(days, TODAY)).toBeNull();
  });

  it("comes into the guardrails only when the caller asks for it", () => {
    const checkins = [ticked(20), ticked(10), ticked(1)];
    expect(guardrails({ bikeHours: 0 }).map((f) => f.kind)).toEqual([]);
    expect(
      guardrails({ bikeHours: 0, knownPains: { checkins, today: TODAY } }).map((f) => f.kind),
    ).toEqual(["known_pain_lasting"]);
  });
});
