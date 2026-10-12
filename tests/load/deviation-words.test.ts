import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  deviationWords,
  type DeviationT,
  type DurationT,
  type WeekNote,
} from "@/components/training/deviation-text";
import { deviation, type Deviation } from "@/modules/load";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The popover's words for a yellow or red mark (docs/adr/0095), read
 * from the real catalogues: a heading in plain words, two or three short
 * lines, the week's sentence when the page knows the week — and nothing
 * for a session that went as planned.
 */

const TODAY = "2026-10-12";
const PAST = "2026-10-10";

function words(d: Deviation, sport = "bike", locale: "da" | "en" = "da", week: WeekNote = null) {
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
  );
}

describe("the words of a deviation", () => {
  it("says a short ride plainly, without blame", () => {
    expect(words(deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY))).toEqual({
      heading: "Kortere end planlagt",
      lines: [
        "Planlagt 1 t 15 min. Kørt 42 min.",
        "Passet havde kun en varighed, så der var ikke mere at sammenligne med.",
      ],
    });
  });

  it("says a missed session as not ridden, or not done off the bike", () => {
    const missed = deviation({ minutes: 60 }, null, PAST, TODAY);
    expect(words(missed)).toEqual({
      heading: "Ikke kørt",
      lines: ["Planlagt 1 t. Der er ikke kommet noget ind for passet."],
    });
    expect(words(missed, "strength")?.heading).toBe("Ikke udført");
  });

  it("puts load first for a harder ride, and closes with the week", () => {
    const d = deviation({ minutes: 60, load: 50 }, { minutes: 60, load: 80 }, PAST, TODAY);
    expect(words(d, "bike", "da", { state: "inside", ref: "dcu" })).toEqual({
      heading: "Hårdere end planlagt",
      lines: [
        "Belastning 80 mod planlagt 50.",
        "Planlagt 1 t. Kørt 1 t.",
        "Passet havde kun en varighed, så der var ikke mere at sammenligne med.",
        "Med resten af ugens pas ender ugen inden for DCU's ramme.",
      ],
    });
    expect(words(d, "bike", "da", { state: "over", ref: "motionist" })?.lines.at(-1)).toBe(
      "Med resten af ugens pas ender ugen over profilens ramme.",
    );
  });

  it("names the zone a session was built around and where the ride went", () => {
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
      { minutes: 30, load: 25, zoneSeconds: { power: [0, 1500, 120, 180, 0, 0, 0] } },
      PAST,
      TODAY,
    );
    expect(words(d)?.lines).toContain(
      "Passet var bygget om zone 4 med 30 min der eller over. Turen havde 3 min, mest i zone 2.",
    );
  });

  it("speaks English with the same keys", () => {
    expect(words(deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY), "bike", "en")).toEqual({
      heading: "Shorter than planned",
      lines: [
        "Planned 1 h 15 min. Ridden 42 min.",
        "The session only had a duration, so there was nothing more to compare with.",
      ],
    });
  });

  it("has no words for a session that went as planned, and never an exclamation mark", () => {
    expect(words(deviation({ minutes: 60 }, { minutes: 60 }, PAST, TODAY))).toBeNull();
    const all = JSON.stringify([da.training.deviation, en.training.deviation]);
    expect(all).not.toContain("!");
    expect(all).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
  });
});
