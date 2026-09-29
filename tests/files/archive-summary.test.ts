import { describe, expect, it } from "vitest";
import { summarise } from "@/components/activities/archive-summary";
import type { ArchiveProgress } from "@/components/activities/import-archive";

/**
 * What a finished run of a Strava archive says (docs/adr/0030): a line
 * for what happened, why it stopped when it stopped early — and "there
 * were no new rides" only when it went through the whole archive, never
 * beside a reason it stopped before the first ride came in.
 */

const finished = (over: Partial<ArchiveProgress>): ArchiveProgress => ({
  phase: "finished",
  done: 0,
  total: 6,
  imported: 0,
  known: 0,
  skipped: 0,
  unreadable: 0,
  left: 0,
  retryAfterSeconds: 0,
  outcome: "done",
  ...over,
});

describe("a finished run", () => {
  it("that went through everything and found nothing new says so", () => {
    expect(summarise(finished({}))).toEqual({ lines: [{ key: "nothing" }], outcome: null });
  });

  it("that stopped before anything came in says only why, and how many are left", () => {
    expect(summarise(finished({ outcome: "cancelled", left: 6 }))).toEqual({
      lines: [],
      outcome: { key: "cancelled", values: { count: 6 } },
    });
    expect(summarise(finished({ outcome: "failed", left: 6 })).lines).toEqual([]);
    expect(summarise(finished({ outcome: "signedOut", left: 6 }))).toEqual({
      lines: [],
      outcome: { key: "signedOut" },
    });
    expect(
      summarise(finished({ outcome: "limit", left: 6, retryAfterSeconds: 5 * 3600 + 1 })),
    ).toEqual({ lines: [], outcome: { key: "limit", values: { count: 6, hours: 6 } } });
  });

  it("names what happened, one line each, beside why it stopped", () => {
    const summary = summarise(
      finished({ imported: 2, known: 1, skipped: 3, unreadable: 1, outcome: "limit", left: 4 }),
    );
    expect(summary.lines).toEqual([
      { key: "imported", values: { count: 2 } },
      { key: "known", values: { count: 1 } },
      { key: "skipped", values: { count: 3 } },
      { key: "unreadableFiles", values: { count: 1 } },
    ]);
    // A limit that is nearly over still says an hour, never none.
    expect(summary.outcome).toEqual({ key: "limit", values: { count: 4, hours: 1 } });
  });
});
