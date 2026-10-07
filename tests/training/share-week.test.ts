import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { durationText } from "@/components/training/duration";
import type { ShareEvent } from "@/modules/training/share-events";
import { shareWeekText, type ShareSession, type ShareWords } from "@/modules/training/share-week";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * "Del ugen": the week as text for the club's chat, in the reader's
 * language — a group session once with how many riders, its time, place,
 * title and length; no rider named in the team's week, the rider named
 * once in their own; the team's races and camps with when, where and who
 * drives, and a rider's own races and camps in their own week only;
 * nothing but the plan.
 */

function wordsFor(locale: "da" | "en"): ShareWords {
  const messages = locale === "da" ? da : en;
  const t = createTranslator({ locale, messages, namespace: "calendar.share" });
  const duration = createTranslator({ locale, messages, namespace: "training.duration" });
  const kinds = createTranslator({ locale, messages, namespace: "training.eventKind" });
  // As the button words them (src/components/calendar/share-week-button.tsx).
  return {
    week: (n) => t("week", { n }),
    riders: (count) => t("riders", { count }),
    duration: (minutes) => durationText(minutes, duration),
    empty: t("empty"),
    events: {
      kind: (kind) => (kind === "other" ? "" : kinds(kind as "race").toLocaleLowerCase(locale)),
      until: (day) => t("until", { day }),
      transport: (note) => t("transport", { note }),
    },
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

  describe("with events", () => {
    const event = (values: Partial<ShareEvent>): ShareEvent => ({
      riderId: null,
      kind: "race",
      title: "Fyn Rundt",
      startsOn: "2026-10-10",
      endsOn: "2026-10-10",
      startTime: "09:30",
      meetingPlace: "Odense Havn",
      transportNote: "Bus fra klubhuset kl. 7.45",
      ...values,
    });
    const events: ShareEvent[] = [
      event({}),
      // A camp from the Saturday before, until Tuesday.
      event({
        kind: "camp",
        title: "Holdsamling",
        startsOn: "2026-10-03",
        endsOn: "2026-10-06",
        meetingPlace: "Hareskoven",
        transportNote: "",
      }),
      // The rider's own: a race of hers, and what is hers alone.
      event({ riderId: "emma", title: "Emmas løb", startsOn: "2026-10-11", endsOn: "2026-10-11" }),
      ...(["exam", "ill", "holiday", "school", "other"] as const).map((kind) =>
        event({ riderId: "emma", kind, title: `Privat ${kind}`, transportNote: "" }),
      ),
    ];

    it("puts the team's race among the day's sessions, with when, where and who drives", () => {
      const text = shareWeekText(
        { team: "Demo CK U19", monday: MONDAY, sessions: week, events, locale: "da" },
        wordsFor("da"),
      );
      expect(text).toContain(
        [
          "Lørdag 10. oktober",
          "– 07.15: Rulle (45 min), 1 rytter",
          "– 09.00, Klubhuset: Langtur (3 t), 2 ryttere",
          "– 09.30, Odense Havn: Fyn Rundt (løb)",
          "  Kørsel: Bus fra klubhuset kl. 7.45",
        ].join("\n"),
      );
    });

    it("writes a camp that began last week on Monday, without its starting time", () => {
      const text = shareWeekText(
        { team: "Holdet", monday: MONDAY, sessions: [], events, locale: "da" },
        wordsFor("da"),
      );
      expect(text).toContain(
        "Mandag 5. oktober\n– Holdsamling (lejr, til og med tirsdag 6. oktober)",
      );
      expect(text).not.toContain("Hareskoven");
    });

    it("keeps every rider's own event out of the team's week", () => {
      const text = shareWeekText(
        { team: "Holdet", monday: MONDAY, sessions: [], events, locale: "da" },
        wordsFor("da"),
      );
      expect(text).not.toContain("Emma");
      expect(text).not.toContain("Privat");
    });

    it("gives a rider's own week their races, and never an exam, school, a holiday or a day ill", () => {
      const text = shareWeekText(
        { team: "Holdet", monday: MONDAY, sessions: [], events, rider: "Emma Holm", locale: "da" },
        wordsFor("da"),
      );
      expect(text).toContain("Søndag 11. oktober\n– 09.30, Odense Havn: Emmas løb (løb)");
      expect(text).not.toContain("Privat");
    });

    it("writes it in English", () => {
      const text = shareWeekText(
        { team: "Holdet", monday: MONDAY, sessions: [], events, locale: "en" },
        wordsFor("en"),
      );
      expect(text).toContain(
        "Saturday 10 October\n– 09:30, Odense Havn: Fyn Rundt (race)\n  Driving: Bus fra klubhuset kl. 7.45",
      );
      expect(text).toContain("Monday 5 October\n– Holdsamling (camp, until Tuesday 6 October)");
    });

    it("says the week is empty only when it holds neither sessions nor events", () => {
      const text = shareWeekText(
        { team: "Holdet", monday: MONDAY, sessions: [], events: [events[0]!], locale: "da" },
        wordsFor("da"),
      );
      expect(text).not.toContain("Ingen pas i ugen.");
    });
  });
});
