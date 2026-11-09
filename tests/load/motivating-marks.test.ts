import { readFileSync } from "node:fs";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  countedBasis,
  countedWords,
  deviationWords,
  type DeviationT,
  type DurationT,
} from "@/components/training/deviation-text";
import {
  compliance,
  deviation,
  planIntensity,
  planIntensityOf,
  plannedLoad,
  rpeLoad,
  type Deviation,
  type DeviationPlanned,
} from "@/modules/load";
import type { Exercise, StrengthStructure } from "@/modules/workouts/structure";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The marks in words that motivate (the amendment of 15 October to
 * docs/adr/0095). Martin looked at "Styrketræning", 1 t planned with
 * nothing in "Træningspasset", done in 1 t at RPE 3, and read "Langt fra planen",
 * "Roligere end planlagt … omkring 70 % lettere", an explanation about
 * his FTP and "Belastning 17" in the "Udført" block: "Det lyder stadig
 * forkert med 'langt fra planen', find på noget mere motiverende."
 */

const TODAY = "2026-10-15";
const PAST = "2026-10-14";

type Catalogue = typeof da;
const translators = (messages: Catalogue, locale: "da" | "en") => ({
  t: createTranslator({ locale, messages, namespace: "training.deviation" }),
  states: createTranslator({ locale, messages, namespace: "training.state" }),
  duration: createTranslator({ locale, messages, namespace: "training.duration" }),
});
const DA = translators(da, "da");
const EN = translators(en as unknown as Catalogue, "en");

function words(d: Deviation, sport: string) {
  return deviationWords(
    d,
    sport,
    DA.t as unknown as DeviationT,
    DA.duration as unknown as DurationT,
    "da",
  );
}

const counted = (d: Deviation, sport: string, locale: "da" | "en" = "da") =>
  countedWords(d, sport, (locale === "da" ? DA : EN).t as unknown as DeviationT, locale);

const SQUAT: Exercise = {
  name: "Squat",
  group: "legs",
  sets: 3,
  reps: "12",
  load: "",
  note: "",
};
const strength = (...exercises: Exercise[]): StrengthStructure => ({
  kind: "strength",
  warmup: "",
  exercises,
  progression: [],
  minutes: 60,
});

describe("the marks' words", () => {
  it("are motivating in Danish, with the same tone in English", () => {
    expect(DA.states("asPlanned")).toBe("Som planlagt");
    expect(DA.states("offPlan")).toBe("Tæt på planen");
    expect(DA.states("farOff")).toBe("Din egen version");
    expect(DA.states("missed")).toBe("Ikke nået");
    expect(EN.states("asPlanned")).toBe("As planned");
    expect(EN.states("offPlan")).toBe("Close to the plan");
    expect(EN.states("farOff")).toBe("Your own version");
    expect(EN.states("missed")).toBe("Not reached");
  });

  it("call a missed session 'Ikke nået' in every sport", () => {
    const missed = deviation({ minutes: 60 }, null, PAST, TODAY);
    for (const sport of ["bike", "strength", "other"]) {
      expect(words(missed, sport)?.heading).toBe("Ikke nået");
      expect(words(missed, sport)?.lines).toEqual([
        "Planlagt 1 t. Der er ikke kommet noget ind for træningspasset.",
      ]);
    }
  });

  it("are gone in their old form from every message, help text included", () => {
    const danish = readFileSync("messages/da.json", "utf8");
    expect(danish).not.toContain("Langt fra planen");
    expect(danish).not.toContain("Afveg fra planen");
    expect(danish).not.toMatch(/langt fra planen/i);
    const english = readFileSync("messages/en.json", "utf8");
    expect(english).not.toMatch(/far from the plan/i);
    expect(english).not.toContain("Off the plan");
  });
});

describe("whether a strength plan says how hard", () => {
  it("says it only with an exercise in it", () => {
    expect(planIntensity(strength())).toBe("none");
    expect(planIntensity(strength(SQUAT))).toBe("set");
    expect(planIntensityOf({ sport: "strength", structure: { exercises: [] } })).toBe("none");
    expect(planIntensityOf({ sport: "strength", structure: strength(SQUAT) })).toBe("set");
    // A row written before the strength kind existed reads as an empty session.
    expect(planIntensityOf({ sport: "strength", structure: { steps: [] } })).toBe("none");
  });
});

describe("Martin's strength session, 15 October", () => {
  const structure = strength();
  const planned: DeviationPlanned = {
    sport: "strength",
    minutes: 60,
    load: plannedLoad(structure),
    structure,
    intensity: planIntensity(structure),
  };
  const done = {
    minutes: 60,
    load: Math.round(rpeLoad(60, 3)),
    method: "rpe" as const,
    rpe: 3,
    sport: "strength" as const,
  };

  it("was planned at 60 and felt as 17", () => {
    expect(planned.load).toBe(60);
    expect(done.load).toBe(17);
    expect(planned.intensity).toBe("none");
  });

  it("is green by its minutes, with nothing to explain", () => {
    const d = deviation(planned, done, PAST, TODAY);
    expect(d.colour).toBe("green");
    expect(d.measuredBy).toBe("minutes");
    expect(d.heading).toBeNull();
    expect(words(d, "strength")).toBeNull();
    expect(counted(d, "strength")).toBeNull();
  });

  it("was red, 'Roligere end planlagt', before the amendment", () => {
    const before = deviation({ ...planned, intensity: "set" }, done, PAST, TODAY);
    expect(before.colour).toBe("red");
    expect(before.heading).toBe("easier");
  });

  it("is still judged by how it felt, far off, once the plan holds an exercise", () => {
    const full = { ...planned, structure: strength(SQUAT), intensity: "set" as const };
    expect(compliance(full, done, PAST, TODAY)).toBe("red");
    expect(compliance(full, { ...done, load: 40 }, PAST, TODAY)).toBe("green");
  });

  it("is still judged by time when the minutes are far off", () => {
    const d = deviation(planned, { ...done, minutes: 20, load: 6 }, PAST, TODAY);
    expect(d.colour).toBe("red");
    expect(d.heading).toBe("shorter");
    expect(words(d, "strength")?.lines.join(" ")).not.toMatch(/føltes|lettere|hårdere/);
  });
});

describe("Sådan er det regnet, by sport", () => {
  const bike = deviation(
    { sport: "bike", minutes: 75, load: 53, intensity: "set" },
    { minutes: 41, load: 84, method: "power", sport: "bike" },
    PAST,
    TODAY,
  );
  const run = deviation(
    { sport: "other", minutes: 30, load: 21, intensity: "pulse" },
    { minutes: 31, load: 42, method: "hr", sport: "other" },
    PAST,
    TODAY,
  );
  const gym = deviation(
    { sport: "strength", minutes: 60, load: 60, intensity: "set", structure: strength(SQUAT) },
    { minutes: 60, load: 17, method: "rpe", rpe: 3, sport: "strength" },
    PAST,
    TODAY,
  );
  const felt = deviation(
    { sport: "bike", minutes: 60, load: 60, intensity: "set" },
    { minutes: 60, load: 130, method: "rpe", rpe: 9, sport: "bike" },
    PAST,
    TODAY,
  );

  it("reads the basis from the sport and what measured the load", () => {
    expect(countedBasis("bike", "power")).toBe("ftp");
    expect(countedBasis("bike", "hr")).toBe("ftp");
    expect(countedBasis("bike", "rpe")).toBe("felt");
    expect(countedBasis("other", "hr")).toBe("pulse");
    expect(countedBasis("other", "rpe")).toBe("felt");
    expect(countedBasis("strength", "rpe")).toBe("felt");
    expect(countedBasis("strength", null)).toBe("felt");
  });

  it("keeps the FTP sentence on the bike, and says the ride", () => {
    expect(counted(bike, "bike")).toEqual({
      summary: "Sådan er det regnet",
      body: "Kadence vurderer, hvor meget en tur trækker på kroppen, ud fra tiden og hvor hårdt du kørte i forhold til din FTP (eller puls eller hvordan det føltes). En time præcis på FTP tæller 100.",
      numbers: "Denne tur: 84. Planen: 53.",
    });
  });

  it("speaks of the pulse off the bike, and says the session", () => {
    expect(counted(run, "other")).toEqual({
      summary: "Sådan er det regnet",
      body: "Kadence vurderer, hvor meget et træningspas trækker på kroppen, ud fra tiden og din puls i forhold til din tærskelpuls. En time præcis på tærskelpulsen tæller 100.",
      numbers: "Dette træningspas: 42. Planen: 21.",
    });
  });

  it("speaks of how it felt in the gym, and never of FTP", () => {
    const words = counted(gym, "strength");
    expect(words).toEqual({
      summary: "Sådan er det regnet",
      body: "Kadence vurderer, hvor meget et træningspas trækker på kroppen, ud fra tiden og hvor hårdt det føltes. En time på hårdt (8 af 10) tæller 100.",
      numbers: "Dette træningspas: 17. Planen: 60.",
    });
    expect(JSON.stringify(words)).not.toMatch(/FTP|turen|Denne tur/);
  });

  it("speaks of how it felt for a ride by RPE, and says the ride", () => {
    expect(counted(felt, "bike")?.body).toBe(
      "Kadence vurderer, hvor meget en tur trækker på kroppen, ud fra tiden og hvor hårdt det føltes. En time på hårdt (8 af 10) tæller 100.",
    );
    expect(counted(felt, "bike")?.numbers).toBe("Denne tur: 130. Planen: 60.");
  });

  it("has the same in English", () => {
    expect(counted(gym, "strength", "en")).toEqual({
      summary: "How it is counted",
      body: "Kadence estimates how much a session draws on the body from its time and how hard it felt. An hour at hard (8 out of 10) counts 100.",
      numbers: "This session: 17. The plan: 60.",
    });
    expect(counted(run, "other", "en")?.body).toMatch(
      /your heart rate compared with your threshold/,
    );
    expect(counted(bike, "bike", "en")?.numbers).toBe("This ride: 84. The plan: 53.");
  });
});

describe("the Udført block", () => {
  it("shows no load row: the number is only behind Sådan er det regnet", () => {
    const source = readFileSync("src/components/session/done-summary.tsx", "utf8");
    expect(source).not.toMatch(/t\(\s*"load"\s*\)/);
    expect(source).not.toMatch(/activity\.load\b/);
    expect("load" in da.session.done).toBe(false);
    expect("load" in en.session.done).toBe(false);
  });
});
