import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  APPLY_KEYS,
  appliedWords,
  applyWords,
  planAudience,
  type PlanAudience,
  type Words,
} from "@/components/week-plan/audience";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * What the week planner says when the week is laid in (ADR 0080; 0059
 * amended 2026-10-12): a club lays it in for its riders as group
 * sessions, also when it has one rider, since a team may grow; a person
 * planning their own week reads "din kalender", a parent their child's,
 * and neither is asked whom the week is for or told about "Ret alle".
 */

const EMMA = { id: "r_emma", name: "Emma Holm" };
const LARS = { id: "r_lars", name: "Lars" };

/** The words as the planner shows them; the key is built at runtime, as next-intl allows. */
function say(locale: "da" | "en", words: Words): string {
  const t = createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "weekPlan",
  }) as unknown as (key: string, values: Words["values"]) => string;
  return t(words.key, words.values);
}

describe("planAudience", () => {
  it("is the team in a club, with many riders or one", () => {
    expect(planAudience({ workspace: "club", selfRiderId: null, riders: [EMMA, LARS] })).toEqual({
      kind: "team",
    });
    expect(planAudience({ workspace: "club", selfRiderId: null, riders: [EMMA] })).toEqual({
      kind: "team",
    });
  });

  it("is the person's own week when they are the personal workspace's rider", () => {
    expect(planAudience({ workspace: "personal", selfRiderId: EMMA.id, riders: [EMMA] })).toEqual({
      kind: "self",
    });
  });

  it("is the child's week when a parent owns the personal workspace", () => {
    expect(planAudience({ workspace: "personal", selfRiderId: null, riders: [EMMA] })).toEqual({
      kind: "child",
      name: "Emma Holm",
    });
  });

  it("falls back to the team's words in a personal workspace that holds more than one rider", () => {
    expect(
      planAudience({ workspace: "personal", selfRiderId: EMMA.id, riders: [EMMA, LARS] }),
    ).toEqual({ kind: "team" });
  });
});

describe("applyWords", () => {
  const one = { sessions: 6, riders: 1, weeks: 1 };
  const team: PlanAudience = { kind: "team" };
  const self: PlanAudience = { kind: "self" };
  const child: PlanAudience = { kind: "child", name: "Emma Holm" };

  it("keeps the club's words, with riders to choose, for one rider and for many", () => {
    const single = applyWords(team, one, "da");
    expect(single).toEqual({
      summary: { key: "apply.summary", values: one },
      confirm: { key: "apply.confirm", values: one },
      empty: "apply.empty",
      chooseRiders: true,
    });
    expect(say("da", single.confirm)).toBe("Læg ugen ind hos 1 rytter");
    const many = applyWords(team, { sessions: 6, riders: 12, weeks: 3 }, "da");
    expect(many.summary.key).toBe("apply.summaryWeeks");
    expect(say("da", many.confirm)).toBe("Læg ugerne ind hos 12 ryttere");
    expect(say("da", many.summary)).toContain("holdpas");
  });

  it("says 'din kalender' for a person's own week, without riders, group sessions or 'Ret alle'", () => {
    const words = applyWords(self, one, "da");
    expect(words.chooseRiders).toBe(false);
    expect(words.empty).toBe("apply.emptyOne");
    expect(say("da", words.summary)).toBe("6 pas i din kalender.");
    expect(say("da", words.confirm)).toBe("Læg ugen ind i din kalender");
    expect(say("en", words.confirm)).toBe("Lay the week into your calendar");
    for (const text of [say("da", words.summary), say("da", words.confirm)]) {
      expect(text).not.toMatch(/rytter|holdpas|Ret alle/);
    }
  });

  it("keeps the series for several weeks, without group sessions", () => {
    const words = applyWords(self, { sessions: 6, riders: 1, weeks: 4 }, "da");
    expect(words.summary.key).toBe("apply.summaryOwnWeeks");
    expect(say("da", words.summary)).toBe(
      "6 pas om ugen i din kalender i 4 uger i træk. Hvert pas bliver en serie over ugerne, så du kan rette dem samlet bagefter.",
    );
    expect(say("da", words.confirm)).toBe("Læg ugerne ind i din kalender");
  });

  it("names the child's calendar by first name, for a parent", () => {
    const words = applyWords(child, one, "da");
    expect(words.chooseRiders).toBe(false);
    expect(say("da", words.summary)).toBe("6 pas i Emmas kalender.");
    expect(say("da", words.confirm)).toBe("Læg ugen ind i Emmas kalender");
    expect(say("en", applyWords(child, one, "en").confirm)).toBe(
      "Lay the week into Emma's calendar",
    );
    const lars = applyWords({ kind: "child", name: "Lars" }, one, "da");
    expect(say("da", lars.confirm)).toBe("Læg ugen ind i Lars' kalender");
  });
});

describe("appliedWords", () => {
  it("tells a club how many riders got the week, and a person their own calendar", () => {
    expect(say("da", appliedWords({ kind: "team" }, { count: 12, riders: 2 }, "da"))).toBe(
      "12 pas er lagt ind hos 2 ryttere.",
    );
    expect(say("da", appliedWords({ kind: "self" }, { count: 6, riders: 1 }, "da"))).toBe(
      "6 pas er lagt ind i din kalender.",
    );
    expect(
      say("da", appliedWords({ kind: "child", name: "Emma" }, { count: 1, riders: 1 }, "da")),
    ).toBe("1 pas er lagt ind i Emmas kalender.");
  });
});

describe("the words exist", () => {
  it("in Danish and English, for every audience", () => {
    const keys = Object.values(APPLY_KEYS).flatMap((k) => [
      ...k.summary,
      ...k.confirm,
      k.applied,
      k.empty,
    ]);
    for (const messages of [da, en]) {
      const plan = messages.weekPlan as Record<string, unknown>;
      for (const key of keys) {
        const found = key
          .split(".")
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], plan);
        expect(typeof found, key).toBe("string");
      }
    }
  });
});
