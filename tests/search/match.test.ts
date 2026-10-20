import { describe, expect, it } from "vitest";
import { best, matches, normalize, rank } from "@/modules/search/match";

/**
 * How Søg compares what was typed with a name: folded the same way on
 * both sides, so a phone without ø still finds Søren, and ranked by where
 * the hit lands — the start of the name, the start of a word, anywhere.
 */

describe("normalize", () => {
  it("lower-cases, strips accents and folds the letters NFD leaves whole", () => {
    expect(normalize("Søren")).toBe("soren");
    expect(normalize("Åse")).toBe("ase");
    expect(normalize("Ærø")).toBe("aero");
    expect(normalize("Zoë Kjær")).toBe("zoe kjaer");
    expect(normalize("Müller-Lüdenscheidt")).toBe("muller-ludenscheidt");
  });

  it("collapses runs of space and trims the ends", () => {
    expect(normalize("  Emma \t  Holm ")).toBe("emma holm");
    expect(normalize("   ")).toBe("");
  });
});

describe("matches", () => {
  it("finds a name typed without its Danish letters, in any case", () => {
    expect(matches("soren", "Søren Bak")).toBe(true);
    expect(matches("SØREN", "søren bak")).toBe(true);
    expect(matches("kjaer", "Ida Kjær")).toBe(true);
    expect(matches("asa", "Åsa Lind")).toBe(true);
  });

  it("finds a first name and the start of a surname, in either order", () => {
    expect(matches("emma h", "Emma Holm")).toBe(true);
    expect(matches("holm e", "Emma Holm")).toBe(true);
    expect(matches("emma k", "Emma Holm")).toBe(false);
  });

  it("matches everything when nothing is typed", () => {
    expect(matches("", "Emma Holm")).toBe(true);
    expect(matches("   ", "Emma Holm")).toBe(true);
  });

  it("does not find what is not there", () => {
    expect(matches("oskar", "Emma Holm")).toBe(false);
  });
});

describe("rank", () => {
  it("is 0 at the start of the text, 1 at the start of a word, 2 anywhere", () => {
    expect(rank("tem", "Tempo")).toBe(0);
    expect(rank("emma holm", "Emma Holm")).toBe(0);
    expect(rank("holm", "Emma Holm")).toBe(1);
    expect(rank("jensen", "Emma Holm-Jensen")).toBe(1);
    expect(rank("10", "3 × 10 min AT")).toBe(1);
    expect(rank("mpo", "Tempo")).toBe(2);
    expect(rank("xyz", "Tempo")).toBeNull();
  });

  it("asks every word, at the start of a word for 1 and anywhere for 2", () => {
    expect(rank("holm em", "Emma Holm")).toBe(1);
    expect(rank("olm mm", "Emma Holm")).toBe(2);
    // "emma l" is Emma Lund's start, and only an l somewhere in Emma Holm.
    expect(rank("emma l", "Emma Lund")).toBe(0);
    expect(rank("emma l", "Emma Holm")).toBe(2);
  });
});

describe("best", () => {
  const riders = ["Mikkel Emborg", "Emma Holm", "Jens Mathiesen", "Noemi Berg", "Emil Dahl"];

  it("orders the start of the text first, then a word's start, then anywhere", () => {
    expect(best("em", riders, (name) => [name])).toEqual([
      "Emma Holm",
      "Emil Dahl",
      "Mikkel Emborg",
      "Noemi Berg",
    ]);
  });

  it("keeps the order the items came in within a rank", () => {
    expect(best("e", ["Ebbe", "Emma", "Eva"], (name) => [name])).toEqual(["Ebbe", "Emma", "Eva"]);
  });

  it("keeps no more than the limit, the best ones", () => {
    expect(best("em", riders, (name) => [name], 2)).toEqual(["Emma Holm", "Emil Dahl"]);
    expect(best("em", riders, (name) => [name], 0)).toEqual([]);
  });

  it("puts a hit in the main text before a hit only in the quiet word beside it", () => {
    const tabs = [
      { label: "Profil", meta: "Indstillinger" },
      { label: "Indberetning", meta: undefined },
    ];
    expect(best("ind", tabs, (tab) => [tab.label, tab.meta]).map((tab) => tab.label)).toEqual([
      "Indberetning",
      "Profil",
    ]);
  });

  it("returns everything in its own order when nothing is typed", () => {
    expect(best("", riders, (name) => [name])).toEqual(riders);
  });
});
