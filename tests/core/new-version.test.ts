import { describe, expect, it } from "vitest";
import { isNewBuild } from "@/core/new-version";

describe("a page left open across a deploy", () => {
  it("is told when the server runs another build", () => {
    expect(isNewBuild("2026-10-12T18:00:00Z", "2026-10-12T19:00:00Z")).toBe(true);
  });

  it("is told nothing by the same build, by a build without a time, or by a strange answer", () => {
    expect(isNewBuild("2026-10-12T18:00:00Z", "2026-10-12T18:00:00Z")).toBe(false);
    expect(isNewBuild("", "2026-10-12T19:00:00Z")).toBe(false);
    expect(isNewBuild("2026-10-12T18:00:00Z", "")).toBe(false);
    expect(isNewBuild("2026-10-12T18:00:00Z", undefined)).toBe(false);
    expect(isNewBuild("2026-10-12T18:00:00Z", 42)).toBe(false);
  });
});
