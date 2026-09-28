import { describe, expect, it } from "vitest";
import { MAX_RANGE_BYTES, parseRange } from "@/core/map/file";

/** The map file is served by single byte ranges, checked against its size, never trusted. */
describe("the map's byte ranges", () => {
  const size = 1000;
  it("reads a closed range, an open one, and clamps the end to the file", () => {
    expect(parseRange("bytes=0-99", size)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=900-", size)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=950-5000", size)).toEqual({ start: 950, end: 999 });
  });

  it("refuses what is no single satisfiable range", () => {
    for (const header of [
      null,
      "",
      "bytes=-100",
      "bytes=5-2",
      "bytes=1000-1001",
      "bytes=0-1,5-9",
      "items=0-1",
    ])
      expect(parseRange(header, size)).toBeNull();
  });

  it("caps a request at a few megabytes", () => {
    expect(MAX_RANGE_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
});
