import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { THRESHOLD_KEYS } from "@/modules/load/threshold-estimate";
import { CONFIDENCES, METHODS, MISSING, NOTES } from "@/modules/load/threshold-shared";

/**
 * The thresholds card's words are looked up by a key built at runtime —
 * an explanation per threshold, and per method, missing reason, note and
 * confidence in the proposal (docs/adr/0094) — which messages.test.ts
 * cannot follow. Every one exists in both languages, as a sentence.
 */

type Tree = { [key: string]: string | Tree };
const words = (catalogue: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], catalogue);

const needed = [
  ...THRESHOLD_KEYS.map((k) => `riders.thresholds.explain.${k}`),
  ...METHODS.map((k) => `riders.thresholds.propose.method.${k}`),
  ...MISSING.map((k) => `riders.thresholds.propose.missing.${k}`),
  ...NOTES.map((k) => `riders.thresholds.propose.note.${k}`),
  ...CONFIDENCES.map((k) => `riders.thresholds.propose.confidence.${k}`),
];

describe("the thresholds card's words", () => {
  it.each([
    ["da", da],
    ["en", en],
  ])("are all there in %s", (_, catalogue) => {
    const missing = needed.filter((path) => typeof words(catalogue, path) !== "string");
    expect(missing).toEqual([]);
  });

  it("explain every threshold in two or three short sentences, without exclamation marks", () => {
    for (const catalogue of [da, en])
      for (const key of THRESHOLD_KEYS) {
        const text = words(catalogue, `riders.thresholds.explain.${key}`) as string;
        const sentences = text.split(/(?<=\.)\s+/).length;
        expect(sentences, key).toBeGreaterThanOrEqual(2);
        expect(sentences, key).toBeLessThanOrEqual(3);
        expect(text).not.toContain("!");
      }
  });

  it("never use TrainingPeaks' trademarked words", () => {
    const all = needed.map((p) => `${words(da, p)} ${words(en, p)}`).join(" ");
    expect(all).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
  });
});
