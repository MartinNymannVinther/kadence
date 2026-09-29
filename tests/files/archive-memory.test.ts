import { describe, expect, it } from "vitest";
import {
  recallRefusals,
  refusalOf,
  rememberRefusals,
  type RefusalMemory,
} from "@/components/activities/archive-memory";

/**
 * What Kadence turned away of an archive, remembered in the browser
 * (docs/adr/0030): per rider, for thirty days, only what will be turned
 * away again, and never a reason to fail when the storage is odd or gone.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 29, 12);
const hash = (n: number) => n.toString(16).padStart(64, "0");

function storage(): RefusalMemory & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

describe("a refusal", () => {
  it("is what will be answered again, not a failure that may pass", () => {
    expect(refusalOf("duplicate")).toBe("duplicate");
    expect(refusalOf("conflict")).toBe("duplicate");
    expect(refusalOf("not_bike")).toBe("not_bike");
    for (const code of ["bad_crc", "unknown_format", "too_large", "empty"])
      expect(refusalOf(code), code).toBe("unreadable");
    for (const code of [undefined, "generic", "rateLimited", "busy"])
      expect(refusalOf(code), String(code)).toBeNull();
  });

  it("is remembered for the rider, and for no one else", () => {
    const memory = storage();
    rememberRefusals(memory, "ida", new Map([[hash(1), "duplicate"]]), NOW);
    rememberRefusals(memory, "ida", new Map([[hash(2), "not_bike"]]), NOW);
    expect(recallRefusals(memory, "ida", NOW)).toEqual(
      new Map([
        [hash(1), "duplicate"],
        [hash(2), "not_bike"],
      ]),
    );
    expect(recallRefusals(memory, "oskar", NOW).size).toBe(0);
  });

  it("is forgotten after thirty days", () => {
    const memory = storage();
    rememberRefusals(memory, "ida", new Map([[hash(1), "unreadable"]]), NOW);
    expect(recallRefusals(memory, "ida", NOW + 30 * DAY).size).toBe(1);
    expect(recallRefusals(memory, "ida", NOW + 31 * DAY).size).toBe(0);
  });

  it("keeps the newest five thousand", () => {
    const memory = storage();
    const old = new Map(Array.from({ length: 5_000 }, (_, i) => [hash(i), "duplicate" as const]));
    rememberRefusals(memory, "ida", old, NOW - DAY);
    rememberRefusals(memory, "ida", new Map([[hash(9_999), "not_bike"]]), NOW);
    const recalled = recallRefusals(memory, "ida", NOW);
    expect(recalled.size).toBe(5_000);
    expect(recalled.get(hash(9_999))).toBe("not_bike");
  });

  it("is nothing when the storage holds something else, is full, or is not there", () => {
    const odd = storage();
    odd.items.set("kadence:archive-refused:ida", "not json");
    expect(recallRefusals(odd, "ida", NOW).size).toBe(0);
    odd.items.set(
      "kadence:archive-refused:ida",
      JSON.stringify({ "not-a-hash": ["d", 1], [hash(1)]: ["x", 1], [hash(2)]: "d" }),
    );
    expect(recallRefusals(odd, "ida", NOW).size).toBe(0);

    const full: RefusalMemory = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => rememberRefusals(full, "ida", new Map([[hash(1), "duplicate"]]))).not.toThrow();
    expect(recallRefusals(null, "ida").size).toBe(0);
    expect(() => rememberRefusals(null, "ida", new Map([[hash(1), "duplicate"]]))).not.toThrow();
  });
});
