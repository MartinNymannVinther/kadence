import { readFileSync } from "node:fs";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/push/latest";
import { localized, possessive, renderNote, type NoteLocale } from "@/modules/push/texts";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * What a reminder says (docs/adr/0060): every note in both languages from
 * messages/*.json, never a key left showing, never an exclamation mark,
 * and a path in the reader's language. The service worker's own fallback
 * — the one text it cannot fetch — is held to the catalogue here.
 */

const MESSAGES = { da, en } as const;

function translate(locale: NoteLocale) {
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "reminders.notify",
  });
  return (key: string, values?: Record<string, string>) =>
    (t as unknown as (k: string, v?: Record<string, string>) => string)(key, values);
}

const NOTES: Array<Note | null> = [
  null,
  { kind: "checkin", path: "/today" },
  { kind: "plan", path: "/calendar" },
  {
    kind: "comment",
    title: "Intervaller 4 × 8",
    author: "Træner Ole",
    path: "/calendar/session/s1",
  },
  { kind: "comment", title: null, author: null, path: "/calendar?week=2026-10-05&rider=r1" },
  { kind: "week", children: ["Emma Holm"], path: "/parents" },
  { kind: "wellbeing", path: "/calendar#opmaerksomhed" },
];

describe("a reminder in words", () => {
  for (const locale of ["da", "en"] as const)
    it(`says every note in ${locale}, plainly`, () => {
      const t = translate(locale);
      for (const note of NOTES) {
        const shown = renderNote(note, t, locale);
        for (const text of [shown.title, shown.body]) {
          expect(text.length).toBeGreaterThan(0);
          expect(text).not.toContain("reminders.");
          expect(text).not.toContain("{");
          expect(text).not.toContain("!");
        }
        expect(shown.url.startsWith(locale === "en" ? "/en/" : "/")).toBe(true);
      }
    });

  it("names the session, who wrote, and whose week, in Danish", () => {
    const t = translate("da");
    expect(renderNote(NOTES[3]!, t, "da")).toEqual({
      title: "Ny kommentar på Intervaller 4 × 8",
      body: "Fra Træner Ole.",
      url: "/calendar/session/s1",
    });
    expect(renderNote(NOTES[1]!, t, "da")).toEqual({
      title: "Husk dagens check-in",
      body: "Det tager et halvt minut.",
      url: "/today",
    });
    expect(renderNote(NOTES[5]!, t, "da").title).toBe("Emmas uge er klar");
    expect(renderNote(null, t, "da").title).toBe("Der er nyt i Kadence");
  });

  it("tells a coach that a rider needs a talk, without a name or an answer", () => {
    expect(renderNote(NOTES[6]!, translate("da"), "da")).toEqual({
      title: "En rytter har brug for en snak",
      body: "Se, hvem det er, under opmærksomhedspunkterne.",
      url: "/calendar#opmaerksomhed",
    });
    expect(renderNote(NOTES[6]!, translate("en"), "en").url).toBe("/en/calendar#opmaerksomhed");
  });

  it("puts English paths under /en", () => {
    expect(renderNote(NOTES[2]!, translate("en"), "en")).toEqual({
      title: "The plan has changed",
      body: "See the coming days.",
      url: "/en/calendar",
    });
    expect(localized("/parents", "da")).toBe("/parents");
  });

  it("makes a possessive of first names", () => {
    expect(possessive(["Emma Holm"], "da")).toBe("Emmas");
    expect(possessive(["Jonas Berg"], "da")).toBe("Jonas'");
    expect(possessive(["Emma Holm", "Jonas Berg"], "da")).toBe("Emma og Jonas'");
    expect(possessive(["Emma"], "en")).toBe("Emma's");
    expect(possessive(["Emma", "Jonas"], "en")).toBe("Emma and Jonas's");
  });
});

describe("the service worker's fallback", () => {
  const worker = readFileSync("public/sw.js", "utf8");

  it("says what the catalogue says, in both languages", () => {
    for (const locale of ["da", "en"] as const) {
      const notify = MESSAGES[locale].reminders.notify;
      expect(worker).toContain(`title: "${notify.fallbackTitle}"`);
      expect(worker).toContain(`body: "${notify.fallbackBody}"`);
    }
  });

  it("only shows reminders: no fetch handler, no cache", () => {
    expect(worker).toContain('addEventListener("push"');
    expect(worker).toContain('addEventListener("notificationclick"');
    expect(worker).not.toContain('addEventListener("fetch"');
    expect(worker).not.toMatch(/caches\.|indexedDB/);
    expect(worker).toContain('credentials: "include"');
  });

  it("opens a path in Kadence with its anchor, and nothing outside", () => {
    expect(worker).toContain("target.pathname + target.search + target.hash");
    expect(worker).toContain("target.origin === self.location.origin");
  });
});
