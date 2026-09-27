import { describe, expect, it } from "vitest";
import { activityFromFit } from "@/modules/devices/from-fit";
import { decodeFit, FitWriter, MESG } from "@/modules/fit";
import { fitErrorCode, writeFileId } from "./fixtures";

/**
 * Files built to hurt, from the first security review: fields of no bytes
 * that cost reads without taking space, and times and totals no ride can
 * have. Each is refused with a code rather than costing seconds or
 * overflowing a column.
 */

describe("a hostile FIT file", () => {
  it("is refused when a field has no bytes", () => {
    const writer = writeFileId(new FitWriter());
    // A record definition: reserved, little-endian, global 20, one field
    // (number 7, size 0, base type uint16) — then twenty data messages.
    writer.raw(Uint8Array.from([0x41, 0, 0, MESG.record & 0xff, MESG.record >> 8, 1, 7, 0, 0x84]));
    for (let i = 0; i < 20; i++) writer.raw(Uint8Array.from([0x01]));
    const bytes = writer.finish();
    expect(fitErrorCode(() => decodeFit(bytes))).toBe("corrupt");
  });

  it("does not believe a time declared as a float of 1e300", () => {
    const writer = writeFileId(new FitWriter());
    // timestamp (253) declared as float64 (base type 0x89), then power.
    writer.raw(
      Uint8Array.from([
        0x41,
        0,
        0,
        MESG.record & 0xff,
        MESG.record >> 8,
        2,
        253,
        8,
        0x89,
        7,
        2,
        0x84,
      ]),
    );
    const data = new Uint8Array(1 + 8 + 2);
    const view = new DataView(data.buffer);
    data[0] = 0x01;
    view.setFloat64(1, 1e300, true);
    view.setUint16(9, 200, true);
    writer.raw(data);
    const bytes = writer.finish();
    const code = fitErrorCode(() => activityFromFit(bytes, { ftp: 250, thresholdHr: 170 }));
    expect(["empty", "corrupt"]).toContain(code);
  });
});
