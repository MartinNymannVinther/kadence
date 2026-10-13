import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  NEUTRAL_READER,
  countedNumbers,
  deviationWords,
  readerFor,
  type DeviationReader,
  type DeviationT,
  type DurationT,
  type WeekNote,
} from "@/components/training/deviation-text";
import { deviation, loadAt, type Deviation } from "@/modules/load";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The popover's words for a yellow or red mark (docs/adr/0095 and its
 * amendment of 13 October), read from the real catalogues: a heading in
 * plain words, the plan and the ride in a sentence or two, the whole as
 * "omkring 60 % hårdere" — never a load number — the hint about a
 * threshold set too low, the week's sentence when the page knows the week,
 * and nothing for a session that went as planned.
 */

const TODAY = "2026-10-13";
const PAST = "2026-10-10";
const RIDER: DeviationReader = { who: "you", thresholdsHref: "/settings/me?forslag=1#thresholds" };
const COACH: DeviationReader = { who: "rider", thresholdsHref: "/riders/r1?forslag=1#thresholds" };

function words(
  d: Deviation,
  sport = "bike",
  locale: "da" | "en" = "da",
  week: WeekNote = null,
  reader: DeviationReader = RIDER,
) {
  const messages = locale === "da" ? da : en;
  const t = createTranslator({ locale, messages, namespace: "training.deviation" });
  const duration = createTranslator({ locale, messages, namespace: "training.duration" });
  return deviationWords(
    d,
    sport,
    t as unknown as DeviationT,
    duration as unknown as DurationT,
    locale,
    week,
    reader,
  );
}

const martin = deviation(
  { minutes: 75, load: 53 },
  { minutes: 41, load: 84, method: "power" },
  PAST,
  TODAY,
);

describe("the words of a deviation", () => {
  it("tells Martin's ride in words, with the FTP hint and no load number", () => {
    expect(words(martin)).toEqual({
      heading: "Mere gas end planlagt",
      lines: [
        "Planen var en rolig tur på 1 t 15 min.",
        "Du kørte 41 min og en del hårdere, i gennemsnit omkring 111 % af din FTP.",
        "Samlet var turen omkring 60 % hårdere for kroppen end planlagt, selvom den var kortere.",
      ],
      hint: {
        text: "Føltes turen ikke så hård? Så er din FTP måske sat for lavt.",
        link: "Foreslå tærskler ud fra dine ture",
        href: "/settings/me?forslag=1#thresholds",
      },
    });
  });

  it("speaks of the rider to a coach and links to the rider's page", () => {
    const w = words(martin, "bike", "da", null, COACH);
    expect(w?.lines[1]).toBe(
      "Rytteren kørte 41 min og en del hårdere, i gennemsnit omkring 111 % af sin FTP.",
    );
    expect(w?.hint).toEqual({
      text: "Føltes turen ikke så hård for rytteren? Så er FTP'en måske sat for lavt.",
      link: "Foreslå tærskler ud fra rytterens ture",
      href: "/riders/r1?forslag=1#thresholds",
    });
    // A parent cannot change the thresholds: no hint.
    expect(words(martin, "bike", "da", null, NEUTRAL_READER)?.hint).toBeNull();
  });

  it("reads heart rate as a share of threshold pulse, with its own hint at the cap", () => {
    const capped = Math.round(loadAt(3600, 1.05));
    const d = deviation(
      { minutes: 60, load: 40 },
      { minutes: 60, load: capped, method: "hr" },
      PAST,
      TODAY,
    );
    const w = words(d);
    expect(w?.lines[1]).toBe(
      "Du kørte 1 t og en del hårdere, med en gennemsnitspuls omkring 105 % af din tærskelpuls.",
    );
    expect(w?.hint?.text).toBe(
      "Føltes turen ikke så hård? Så er din tærskelpuls måske sat for lavt.",
    );
  });

  it("says how an RPE ride felt, and a strength session in its own words", () => {
    const d = deviation(
      { sport: "strength", minutes: 45, load: 40 },
      { minutes: 45, load: 20, method: "rpe", rpe: 4 },
      PAST,
      TODAY,
    );
    expect(words(d, "strength")).toEqual({
      heading: "Roligere end planlagt",
      lines: [
        "Planen var et styrkepas på 45 min.",
        "Du trænede 45 min, og det føltes en del lettere end planlagt.",
        "Samlet var passet omkring 50 % lettere for kroppen end planlagt.",
      ],
      hint: null,
    });
  });

  it("says og when the time went the same way as the effort", () => {
    const d = deviation({ minutes: 75, load: 60 }, { minutes: 40, load: 30 }, PAST, TODAY);
    expect(words(d)?.lines.at(-1)).toBe(
      "Samlet var turen omkring 50 % lettere for kroppen end planlagt, og den var også kortere.",
    );
    const long = deviation({ minutes: 60, load: 50 }, { minutes: 90, load: 30 }, PAST, TODAY);
    expect(words(long)?.lines.at(-1)).toBe(
      "Samlet var turen omkring 40 % lettere for kroppen end planlagt, selvom den var længere.",
    );
  });

  it("says twice or more as times", () => {
    const d = deviation({ minutes: 60, load: 40 }, { minutes: 60, load: 100 }, PAST, TODAY);
    expect(words(d)?.lines.at(-1)).toBe(
      "Samlet var turen omkring 2,5 gange så hård for kroppen som planlagt.",
    );
  });

  it("says only the time without anything to measure effort by", () => {
    expect(words(deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY))).toEqual({
      heading: "Kortere end planlagt",
      lines: ["Planen var en rolig tur på 1 t 15 min.", "Du kørte 42 min."],
      hint: null,
    });
  });

  it("says a missed session as not ridden, or not done off the bike", () => {
    const missed = deviation({ minutes: 60 }, null, PAST, TODAY);
    expect(words(missed)).toEqual({
      heading: "Ikke kørt",
      lines: ["Planlagt 1 t. Der er ikke kommet noget ind for passet."],
      hint: null,
    });
    expect(words(missed, "strength")?.heading).toBe("Ikke udført");
  });

  it("names the zone a session was built around, and closes with the week", () => {
    const structure = {
      kind: "bike" as const,
      steps: [
        {
          kind: "step" as const,
          intent: "work" as const,
          seconds: 1800,
          target: { kind: "zone" as const, zone: 4 },
        },
      ],
    };
    const d = deviation(
      { minutes: 30, load: 50, structure },
      {
        minutes: 30,
        load: 25,
        method: "power",
        zoneSeconds: { power: [0, 1500, 120, 180, 0, 0, 0] },
      },
      PAST,
      TODAY,
    );
    const w = words(d, "bike", "da", { state: "inside", ref: "dcu" });
    expect(w?.lines).toEqual([
      "Planen var et pas om tærsklen på 30 min.",
      "Du kørte 30 min og en del roligere, i gennemsnit omkring 71 % af din FTP.",
      "Samlet var turen omkring 50 % lettere for kroppen end planlagt.",
      "Passet var bygget om zone 4 med 30 min der eller over. Turen havde 3 min, mest i zone 2.",
      "Med resten af ugens pas ender ugen inden for DCU's ramme.",
    ]);
  });

  it("speaks English with the same keys", () => {
    expect(words(martin, "bike", "en")).toEqual({
      heading: "More effort than planned",
      lines: [
        "The plan was an easy ride of 1 h 15 min.",
        "You rode 41 min and quite a bit harder, averaging about 111 % of your FTP.",
        "All in all, the ride was about 60 % harder on the body than planned, even though it was shorter.",
      ],
      hint: {
        text: "Did the ride not feel that hard? Then your FTP may be set too low.",
        link: "Suggest thresholds from your rides",
        href: "/settings/me?forslag=1#thresholds",
      },
    });
  });

  it("has no words for a session that went as planned", () => {
    expect(words(deviation({ minutes: 60 }, { minutes: 60 }, PAST, TODAY))).toBeNull();
  });
});

describe("the catalogue's words", () => {
  const popover = (messages: typeof da) => {
    const { howCounted: _counted, ...rest } = messages.training.deviation;
    return JSON.stringify(rest);
  };

  it("never say load in the popover, never shout, never borrow a trademark", () => {
    expect(popover(da)).not.toMatch(/belastning/i);
    expect(popover(en as unknown as typeof da)).not.toMatch(/\bload\b/i);
    const all = JSON.stringify([da.training.deviation, en.training.deviation]);
    expect(all).not.toContain("!");
    expect(all).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
  });

  it("put the numbers only behind Sådan er det regnet", () => {
    const t = createTranslator({ locale: "da", messages: da, namespace: "training.deviation" });
    expect(t("howCounted.summary")).toBe("Sådan er det regnet");
    expect(t("howCounted.body")).toBe(
      "Kadence vurderer, hvor meget en tur trækker på kroppen, ud fra tiden og hvor hårdt du kørte i forhold til din FTP (eller puls eller hvordan det føltes). En time præcis på FTP tæller 100.",
    );
    expect(t("howCounted.numbers", countedNumbers(martin, "da")!)).toBe(
      "Denne tur: 84. Planen: 53.",
    );
    // Read by minutes there is no load to show.
    expect(
      countedNumbers(deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY), "da"),
    ).toBeNull();
  });
});

describe("who reads", () => {
  it("is the rider on their own session, a coach on another's, else neutral", () => {
    expect(readerFor({ ownRiderId: "r1", isCoach: false }, "r1")).toEqual(RIDER);
    expect(readerFor({ ownRiderId: "r1", isCoach: true }, "r1")).toEqual(RIDER);
    expect(readerFor({ ownRiderId: null, isCoach: true }, "r1")).toEqual(COACH);
    expect(readerFor({ ownRiderId: "r2", isCoach: false }, "r1")).toEqual(NEUTRAL_READER);
    expect(readerFor(null, "r1")).toEqual(NEUTRAL_READER);
  });
});
