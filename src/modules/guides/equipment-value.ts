/**
 * "Most speed per krone": the ranked table of docs/research/udstyr.md,
 * section 15. Watts are saved riding alone at 40 km/h, from wind tunnel,
 * drum and lab tests on adults; prices are Danish kroner as read in
 * October 2026 (ECB rate of 2 October 2026 where a price was in pounds or
 * euros). What is left of the gain in the middle of a bunch is a word,
 * because the research gives no number for it.
 *
 * Pure: imports nothing from the database.
 */

export type InBunch = "all" | "some" | "little" | "none";
export type Confidence = "high" | "medium" | "low";

export type ValueRow = {
  id: string;
  /** Kroner, low and high; [0, 0] is free. */
  priceDkk: readonly [number, number];
  /** Watts saved alone at 40 km/h, low and high. */
  watts: readonly [number, number];
  inBunch: InBunch;
  confidence: Confidence;
  /** The figure is the maker's own claim, not an independent measurement. */
  claim?: true;
};

export const VALUE_ROWS: readonly ValueRow[] = [
  { id: "chain", priceDkk: [100, 300], watts: [6, 12], inBunch: "all", confidence: "medium" },
  { id: "position", priceDkk: [0, 0], watts: [8, 35], inBunch: "little", confidence: "medium" },
  { id: "flapping", priceDkk: [0, 0], watts: [10, 10], inBunch: "some", confidence: "medium" },
  { id: "latex", priceDkk: [200, 200], watts: [5, 6], inBunch: "all", confidence: "high" },
  { id: "tyres", priceDkk: [800, 950], watts: [20, 22], inBunch: "all", confidence: "medium" },
  { id: "overshoes", priceDkk: [420, 480], watts: [6, 6], inBunch: "little", confidence: "medium" },
  {
    id: "helmet",
    priceDkk: [900, 1150],
    watts: [4.5, 4.5],
    inBunch: "little",
    confidence: "medium",
  },
  {
    id: "skinsuit",
    priceDkk: [1500, 2100],
    watts: [10, 10],
    inBunch: "some",
    confidence: "medium",
  },
  {
    id: "wheels",
    priceDkk: [8700, 17600],
    watts: [4.6, 6.6],
    inBunch: "little",
    confidence: "medium",
  },
  {
    id: "bike",
    priceDkk: [70000, 110000],
    watts: [17, 32],
    inBunch: "little",
    confidence: "medium",
  },
  {
    id: "pulleys",
    priceDkk: [3000, 4100],
    watts: [2.4, 2.4],
    inBunch: "all",
    confidence: "low",
    claim: true,
  },
  { id: "groupset", priceDkk: [17000, 17000], watts: [0, 0], inBunch: "none", confidence: "high" },
  {
    id: "ceramic",
    priceDkk: [1750, 3100],
    watts: [0.03, 0.03],
    inBunch: "none",
    confidence: "high",
  },
];
