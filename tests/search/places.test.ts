import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { settingsGroups } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { HELP_TOPICS, helpHref } from "@/modules/search/help-topics";
import { SPORTS } from "@/modules/training/vocabulary";

/**
 * The words Søg's rows are given at runtime — a section of Hjælp by its
 * key, a settings tab by its key, a session's sport — which the static
 * check in tests/i18n cannot follow. Each one has to be in both
 * catalogues, or the palette would show a key instead of a word.
 */

type Messages = { [key: string]: string | Messages };

function word(catalogue: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === "object" ? (node as Messages)[part] : undefined,
      catalogue,
    );
}

const CATALOGUES = [
  ["da", da],
  ["en", en],
] as const;

const missing = (paths: string[]) =>
  CATALOGUES.flatMap(([locale, catalogue]) =>
    paths.filter((path) => typeof word(catalogue, path) !== "string").map((p) => `${locale}: ${p}`),
  );

describe("the sections of Hjælp that Søg lists", () => {
  it("each has a title and a body in both catalogues", () => {
    const paths = HELP_TOPICS.flatMap((key) => [
      `help.howTo.${key}.title`,
      `help.howTo.${key}.body`,
    ]);
    expect(missing(paths)).toEqual([]);
  });

  it("are listed once each, Søg's own among them", () => {
    expect(new Set(HELP_TOPICS).size).toBe(HELP_TOPICS.length);
    expect(HELP_TOPICS).toContain("search");
  });

  it("are reached at the section's anchor on the help page", () => {
    expect(helpHref("search")).toBe("/help#help-search");
  });
});

describe("the settings tabs that Søg finds", () => {
  it("each has a label under settings.nav, whoever is looking", () => {
    const keys = new Set<string>();
    for (const owner of [false, true])
      for (const isCoach of [false, true])
        for (const isRider of [false, true])
          for (const group of settingsGroups({ owner, isCoach, isRider }))
            for (const item of group.items) keys.add(item.key);
    expect(keys.size).toBeGreaterThan(0);
    expect(missing([...keys].map((key) => `settings.nav.${key}`))).toEqual([]);
  });
});

describe("the sessions that Søg finds", () => {
  it("have a word for every sport", () => {
    expect(missing(SPORTS.map((sport) => `training.sport.${sport}`))).toEqual([]);
  });
});
