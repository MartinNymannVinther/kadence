import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { durationText } from "@/components/training/duration";
import { shareWeekText, type ShareSession, type ShareWords } from "@/modules/training/share-week";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * "Del ugen": the week as text for the club's chat, in the reader's
 * language — a group session once with how many riders, its time, place,
 * title and length; no rider named in the team's week, the rider named
 * once in their own; nothing but the plan.
 */

function wordsFor(locale: "da" | "en"): ShareWords {
  const messages = locale === "da" ? da : en;
  const t = createTranslator({ locale, messages, namespace: "calendar.share" });
  const duration = createTranslator({ locale, messages, namespace: "training.duration" });
  return {
    week: (n) => t("week", { n }),
    riders: (count) => t("riders", { count }),
    duration: (minutes) => durationText(minutes, duration),
    empty: t("empty"),
  };
}

const MONDAY = "2026-10-05";
const session = (riderId: string, values: Partial<ShareSession>): ShareSession => ({
  riderId,
  onDate: "2026-10-06",
  sport: "bike",
  title: "Intervaller",
  plannedMinutes: 90,
  startTime: "17:30:00",
  meetingPlace: "Klubhuset",
  ...values,
});

const week: ShareSession[] = [
  ...["emma", "oskar", "freja"].map((id) => session(id, {})),
  session("emma", {
    onDate: "2026-10-08",
    title: "Styrke",
    sport: "strength",
    startTime: null,
    meetingPlace: "",
    plannedMinutes: 60,
  }),
  ...["emma", "oskar"].map((id) =>
    session(id, {
      onDate: "2026-10-10",
      title: "Langtur",
      startTime: "09:00",
      plannedMinutes: 180,
    }),
  ),
  session("freja", {
    onDate: "2026-10-10",
    title: "Rulle",
    startTime: "07:15",
    meetingPlace: "",
    plannedMinutes: 45,
  }),
];

describe("Del ugen", () => {
  it("writes the team's week in Danish, a group session once with its riders", () => {
    expect(
      shareWeekText(
        { team: "Demo CK U19", monday: MONDAY, sessions: week, locale: "da" },
        wordsFor("da"),
      ),
    ).toBe(
      [
        "Demo CK U19 · Uge 41",
        "",
        "Tirsdag 6. oktober",
        "– 17.30, Klubhuset: Intervaller (1 t 30 min), 3 ryttere",
        "",
        "Torsdag 8. oktober",
        "– Styrke (1 t), 1 rytter",
        "",
        "Lørdag 10. oktober",
        "– 07.15: Rulle (45 min), 1 rytter",
        "– 09.00, Klubhuset: Langtur (3 t), 2 ryttere",
      ].join("\n"),
    );
  });

  it("writes it in English", () => {
    expect(
      shareWeekText(
        { team: "Demo CK U19", monday: MONDAY, sessions: week, locale: "en" },
        wordsFor("en"),
      ),
    ).toBe(
      [
        "Demo CK U19 · Week 41",
        "",
        "Tuesday 6 October",
        "– 17:30, Klubhuset: Intervaller (1 h 30 min), 3 riders",
        "",
        "Thursday 8 October",
        "– Styrke (1 h), 1 rider",
        "",
        "Saturday 10 October",
        "– 07:15: Rulle (45 min), 1 rider",
        "– 09:00, Klubhuset: Langtur (3 h), 2 riders",
      ].join("\n"),
    );
  });

  it("names the rider once in their own week, and counts nobody", () => {
    const emma = week.filter((s) => s.riderId === "emma");
    const text = shareWeekText(
      { team: "Demo CK U19", monday: MONDAY, sessions: emma, rider: "Emma Holm", locale: "da" },
      wordsFor("da"),
    );
    expect(text.split("\n")[0]).toBe("Demo CK U19 · Emma Holm · Uge 41");
    expect(text).toContain("– 17.30, Klubhuset: Intervaller (1 t 30 min)\n");
    expect(text).not.toMatch(/rytter/);
  });

  it("never names a rider in the team's week", () => {
    const text = shareWeekText(
      { team: "Demo CK U19", monday: MONDAY, sessions: week, locale: "da" },
      wordsFor("da"),
    );
    for (const id of ["emma", "oskar", "freja"]) expect(text).not.toContain(id);
  });

  it("splits a group session whose copy was changed, and leaves sessions of other weeks out", () => {
    const changed = [
      ...week,
      session("oskar", { meetingPlace: "Torvet" }),
      session("emma", { onDate: "2026-10-13" }),
    ];
    const text = shareWeekText(
      { team: "Holdet", monday: MONDAY, sessions: changed, locale: "da" },
      wordsFor("da"),
    );
    expect(text).toContain("– 17.30, Klubhuset: Intervaller (1 t 30 min), 3 ryttere\n");
    expect(text).toContain("– 17.30, Torvet: Intervaller (1 t 30 min), 1 rytter\n");
    expect(text).not.toContain("13. oktober");
  });

  it("says so when the week holds nothing", () => {
    expect(
      shareWeekText(
        { team: "Holdet", monday: "2026-10-07", sessions: [], locale: "da" },
        wordsFor("da"),
      ),
    ).toBe("Holdet · Uge 41\n\nIngen pas i ugen.");
  });
});
