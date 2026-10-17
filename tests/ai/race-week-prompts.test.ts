import { describe, expect, it } from "vitest";
import { groupWeekPrompt } from "@/modules/assist/group-week-prompt";
import { groupWeekEvents, raceWeekRules } from "@/modules/assist/race-week";
import { weekDraftPrompt, type WeekDraftContext } from "@/modules/assist/week-draft-prompt";

/**
 * The race-week rules in the words each week draft sends the model
 * (docs/adr/0101): the youth group's beside DCU's race rules, an adult
 * group's in the adult wording, and the per-rider draft's for both; and a
 * person's own race reaching the prompt with its title (docs/adr/0102). The
 * prompts read the environment through the AI's limits, so this runs with
 * `pnpm test`; the rules, the calendar and the guard alone are in
 * race-week.test.ts.
 */

const MONDAY = "2026-10-19";
const text = (messages: Array<{ content: string }>) => messages.map((m) => m.content).join("\n");

describe("the race-week rules in the prompts", () => {
  it("are in the youth group's week, beside DCU's race rules", () => {
    const prompt = text(
      groupWeekPrompt(
        { monday: MONDAY, guided: true, basis: "U19-1", wish: "", events: [], templates: [] },
        "da",
      ),
    );
    expect(prompt).toContain(raceWeekRules("youth"));
    expect(prompt).toContain("DCU race rules for U19");
    expect(prompt).not.toContain("race or event");
  });

  it("are in an adult group's week, in the adult wording", () => {
    for (const guided of [true, false]) {
      const prompt = text(
        groupWeekPrompt(
          {
            monday: MONDAY,
            guided,
            basis: "senior-motionist",
            wish: "Jeg kører løb lørdag d. 24",
            events: [],
            templates: [],
          },
          "da",
        ),
      );
      expect(prompt).toContain(raceWeekRules("adult"));
      expect(prompt).not.toContain("DCU race rules");
      expect(prompt).toContain("<data>\nJeg kører løb lørdag d. 24\n</data>");
    }
  });

  it("are in the per-rider draft, youth and senior", () => {
    const base: WeekDraftContext = {
      monday: MONDAY,
      guided: true,
      category: "U19",
      basis: "U19-1",
      phase: "base",
      corridor: { low: 8, target: 10, high: 12 },
      senior: null,
      strength: { min: 2, max: 3 },
      planned: [],
      events: [],
      recentWeeks: [],
      flags: [],
      templates: [],
    };
    expect(text(weekDraftPrompt(base, "da"))).toContain(raceWeekRules("youth"));
    const senior = text(
      weekDraftPrompt(
        {
          ...base,
          category: "senior",
          basis: "senior-motionist",
          senior: { profile: "motionist", monthHours: 16 },
        },
        "da",
      ),
    );
    expect(senior).toContain(raceWeekRules("adult"));
  });

  it("carry a personal workspace's own race into the prompt, with its title", () => {
    const { prompt } = groupWeekEvents(
      [
        {
          kind: "race",
          title: "Løb i Hillerød",
          riderId: "r_martin",
          startsOn: "2026-10-24",
          endsOn: "2026-10-24",
          priority: null,
        },
      ],
      true,
    );
    const user = text(
      groupWeekPrompt(
        {
          monday: MONDAY,
          guided: true,
          basis: "senior-motionist",
          wish: "Jeg kører løb lørdag d. 24",
          events: prompt,
          templates: [],
        },
        "da",
      ),
    );
    expect(user).toContain(
      '{"kind":"race","title":"Løb i Hillerød","from":"2026-10-24","to":"2026-10-24","priority":null}',
    );
  });
});
