import { describe, expect, it } from "vitest";
import {
  decodeFit,
  FIT_LIMITS,
  FitError,
  FitWriter,
  MESG,
  msToFitTime,
  RECORD,
  SPORT,
  summarizeActivity,
} from "@/modules/fit";
import {
  encodeRide,
  fitErrorCode,
  RECORD_FIELDS,
  recordValues,
  START_MS,
  steadyHour,
  writeFileId,
} from "./fixtures";

const fitTime = (s: number) => msToFitTime(START_MS + s * 1000);

describe("decoding a ride", () => {
  const samples = steadyHour().slice(0, 120);
  const fit = decodeFit(encodeRide(samples, { elapsedSeconds: 120, distanceM: 1190, ascentM: 12 }));

  it("reads the file_id and a whole checksum", () => {
    expect(fit.crcOk).toBe(true);
    expect(fit.fileType).toBe(4);
    expect(fit.manufacturer).toBe(1);
    expect(fit.product).toBe(3121);
    expect(fit.timeCreated).toBe(START_MS);
  });

  it("reads every record back in real units", () => {
    expect(fit.records).toHaveLength(120);
    const record = fit.records[42];
    expect(record?.t).toBe(START_MS + 42_000);
    expect(record?.power).toBe(200);
    expect(record?.hr).toBe(150);
    expect(record?.cadence).toBe(90);
    expect(record?.speed).toBe(10);
    expect(record?.distance).toBe(420);
    expect(record?.altitude).toBeCloseTo(100, 5);
    expect(record?.lat).toBeCloseTo(55.6761 + 42e-5, 6);
    expect(record?.lon).toBeCloseTo(12.5683, 6);
  });

  it("reads the session and takes the sport from it", () => {
    expect(fit.sessions).toHaveLength(1);
    expect(fit.sessions[0]).toMatchObject({
      startTime: START_MS,
      sport: SPORT.cycling,
      elapsedSeconds: 120,
      distanceM: 1190,
      ascentM: 12,
    });
    expect(fit.sport).toBe(SPORT.cycling);
  });
});

describe("the fields a record may carry", () => {
  it("prefers the enhanced speed and altitude over the plain ones", () => {
    const file = writeFileId(new FitWriter())
      .define(1, MESG.record, [
        { num: 253, type: "uint32" },
        { num: RECORD.speed, type: "uint16" },
        { num: RECORD.altitude, type: "uint16" },
        { num: RECORD.enhancedSpeed, type: "uint32" },
        { num: RECORD.enhancedAltitude, type: "uint32" },
      ])
      .write(1, { 253: fitTime(0), 6: 5000, 2: 3000, 73: 7250, 78: 3500 })
      .write(1, { 253: fitTime(1), 6: 5000, 2: 3000, 73: null, 78: null })
      .finish();
    const [enhanced, plain] = decodeFit(file).records;
    expect(enhanced).toMatchObject({ speed: 7.25, altitude: 200 });
    expect(plain).toMatchObject({ speed: 5, altitude: 100 });
  });

  it("drops FIT's invalid values instead of reading them as numbers", () => {
    const file = encodeRide([
      { s: 0, power: null, hr: null, cadence: null, speed: null, distance: null, altitude: null },
      { s: 1, power: 0, hr: 140 },
    ]);
    const [empty, zero] = decodeFit(file).records;
    expect(empty).toBeDefined();
    for (const key of ["power", "hr", "cadence", "speed", "distance", "altitude", "lat", "lon"])
      expect(empty?.[key as keyof typeof empty]).toBeUndefined();
    expect(zero?.power).toBe(0);
    expect(zero?.hr).toBe(140);
  });

  it("resolves compressed timestamps, across the 32-second wrap", () => {
    const writer = writeFileId(new FitWriter())
      .define(1, MESG.record, [
        { num: 253, type: "uint32" },
        { num: RECORD.power, type: "uint16" },
      ])
      .define(2, MESG.record, [{ num: RECORD.power, type: "uint16" }])
      .write(1, { 253: fitTime(0), 7: 100 });
    for (let s = 1; s <= 70; s++)
      writer.write(2, { 7: 100 + s }, { timeOffset: fitTime(s) & 0x1f });
    const records = decodeFit(writer.finish()).records;
    expect(records).toHaveLength(71);
    records.forEach((record, s) => {
      expect(record.t).toBe(START_MS + s * 1000);
      expect(record.power).toBe(100 + s);
    });
  });

  it("reads big-endian definitions, signs included", () => {
    const file = new FitWriter()
      .define(
        0,
        MESG.fileId,
        [
          { num: 0, type: "enum" },
          { num: 1, type: "uint16" },
        ],
        {
          bigEndian: true,
        },
      )
      .write(0, { 0: 4, 1: 32 })
      .define(1, MESG.record, RECORD_FIELDS, { bigEndian: true })
      .write(
        1,
        recordValues({ s: 5, power: 312, hr: 171, speed: 11.5, lat: -33.8688, lon: 151.2093 }),
      )
      .finish();
    const fit = decodeFit(file);
    expect(fit.manufacturer).toBe(32);
    expect(fit.records[0]).toMatchObject({ t: START_MS + 5000, power: 312, hr: 171, speed: 11.5 });
    expect(fit.records[0]?.lat).toBeCloseTo(-33.8688, 6);
    expect(fit.records[0]?.lon).toBeCloseTo(151.2093, 6);
  });

  it("skips developer fields by their size and keeps its place", () => {
    const writer = writeFileId(new FitWriter())
      // developer_data_id and field_description: read by nobody, skipped by size
      .define(5, 207, [
        { num: 1, type: "byte", size: 16 },
        { num: 3, type: "uint8" },
      ])
      .write(5, { 3: 0 })
      .define(6, 206, [
        { num: 0, type: "uint8" },
        { num: 1, type: "uint8" },
        { num: 2, type: "uint8" },
        { num: 3, type: "string", size: 8 },
      ])
      .write(6, { 0: 0, 1: 0, 2: 0x84, 3: "Balance" })
      .define(
        1,
        MESG.record,
        [
          { num: 253, type: "uint32" },
          { num: RECORD.power, type: "uint16" },
        ],
        {
          developerFields: [
            { num: 0, size: 2, devIndex: 0 },
            { num: 1, size: 4, devIndex: 0 },
          ],
        },
      );
    for (let s = 0; s < 10; s++)
      writer.write(
        1,
        { 253: fitTime(s), 7: 250 + s },
        {
          // Bytes that would read as a definition header if not skipped.
          developerData: new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46]),
        },
      );
    const records = decodeFit(writer.finish()).records;
    expect(records.map((r) => r.power)).toEqual([250, 251, 252, 253, 254, 255, 256, 257, 258, 259]);
  });

  it("skips messages it does not read, such as device_info", () => {
    const file = writeFileId(new FitWriter())
      .define(4, MESG.deviceInfo, [
        { num: 253, type: "uint32" },
        { num: 2, type: "uint16" },
        { num: 27, type: "string", size: 12 },
      ])
      .write(4, { 253: fitTime(0), 2: 1, 27: "Edge 540" })
      .define(1, MESG.record, RECORD_FIELDS)
      .write(1, recordValues({ s: 0, power: 180 }))
      .finish();
    expect(decodeFit(file).records.map((r) => r.power)).toEqual([180]);
  });
});

describe("files Kadence refuses or flags", () => {
  const good = () => encodeRide(steadyHour().slice(0, 30), { elapsedSeconds: 30 });

  it("refuses bytes that are not FIT", () => {
    const text = new TextEncoder().encode("date,power\n2026-09-01,200\n".repeat(4));
    expect(fitErrorCode(() => decodeFit(text))).toBe("not_fit");
    expect(fitErrorCode(() => decodeFit(new Uint8Array(0)))).toBe("not_fit");
  });

  it("refuses a file cut short", () => {
    const file = good();
    expect(fitErrorCode(() => decodeFit(file.slice(0, file.length - 10)))).toBe("truncated");
    expect(fitErrorCode(() => decodeFit(file.slice(0, 13)))).toBe("truncated");
  });

  it("refuses a message that runs past the end of the data", () => {
    const file = good();
    const view = new DataView(file.buffer);
    view.setUint32(4, view.getUint32(4, true) - 3, true);
    expect(fitErrorCode(() => decodeFit(file))).toBe("truncated");
  });

  it("flags a checksum that does not match, and refuses it when asked to be strict", () => {
    const file = good();
    file[file.length - 1] = (file[file.length - 1] ?? 0) ^ 0x01;
    const fit = decodeFit(file);
    expect(fit.crcOk).toBe(false);
    expect(fit.records).toHaveLength(30);
    expect(fitErrorCode(() => decodeFit(file, { strictCrc: true }))).toBe("bad_crc");
    expect(decodeFit(good(), { strictCrc: true }).crcOk).toBe(true);
  });

  it("notices a changed byte in the data through the checksum", () => {
    const file = good();
    file[file.length - 20] = (file[file.length - 20] ?? 0) ^ 0x10;
    expect(decodeFit(file).crcOk).toBe(false);
  });

  it("refuses a file larger than 25 MB before reading it", () => {
    expect(fitErrorCode(() => decodeFit(new Uint8Array(FIT_LIMITS.maxBytes + 1)))).toBe(
      "too_large",
    );
  });

  it("refuses more records than it reads", () => {
    const writer = writeFileId(new FitWriter()).define(1, MESG.record, [
      { num: 253, type: "uint32" },
    ]);
    for (let s = 0; s <= FIT_LIMITS.maxRecords; s++) writer.write(1, { 253: fitTime(s) });
    expect(fitErrorCode(() => decodeFit(writer.finish()))).toBe("too_large");
  });

  it("refuses data before its definition", () => {
    const file = writeFileId(new FitWriter())
      .raw(new Uint8Array([0x03, 0x00, 0x00]))
      .finish();
    expect(fitErrorCode(() => decodeFit(file))).toBe("corrupt");
  });

  it("refuses a compressed timestamp with no time before it", () => {
    const file = writeFileId(new FitWriter())
      .define(1, MESG.record, [{ num: RECORD.power, type: "uint16" }])
      .write(1, { 7: 100 }, { timeOffset: 3 })
      .finish();
    expect(fitErrorCode(() => decodeFit(file))).toBe("corrupt");
  });

  it("refuses a file without a file_id", () => {
    const file = new FitWriter()
      .define(1, MESG.record, RECORD_FIELDS)
      .write(1, recordValues({ s: 0, power: 100 }))
      .finish();
    expect(fitErrorCode(() => decodeFit(file))).toBe("corrupt");
  });

  it("refuses a definition with an unknown byte order", () => {
    const file = writeFileId(new FitWriter())
      .raw(new Uint8Array([0x41, 0x00, 0x02, 0x14, 0x00, 0x00]))
      .finish();
    expect(fitErrorCode(() => decodeFit(file))).toBe("corrupt");
  });

  it("never reads out of bounds or hangs on damaged bytes: it decodes or says why not", () => {
    // A small deterministic generator, so a failure can be replayed.
    let seed = 20260927;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const original = encodeRide(steadyHour().slice(0, 40), { elapsedSeconds: 40 });
    for (let round = 0; round < 500; round++) {
      const file = original.slice(0, 14 + Math.floor(random() * (original.length - 14)) + 1);
      const flips = 1 + Math.floor(random() * 8);
      for (let i = 0; i < flips; i++) {
        // Leave the signature alone so the damage reaches the messages.
        const at = 12 + Math.floor(random() * (file.length - 12));
        file[at] = Math.floor(random() * 256);
      }
      try {
        summarizeActivity(decodeFit(file));
      } catch (error) {
        expect(error).toBeInstanceOf(FitError);
      }
    }
  });
});
