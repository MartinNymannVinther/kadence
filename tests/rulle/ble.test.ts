import { describe, expect, it } from "vitest";
import { viewOf } from "@/modules/rulle/ble/bytes";
import { CrankCadence, parsePowerMeasurement } from "@/modules/rulle/ble/cycling-power";
import {
  control,
  parseControlResponse,
  parseFeatures,
  parseIndoorBikeData,
  parsePowerRange,
  parseStatus,
} from "@/modules/rulle/ble/ftms";
import { parseHeartRate } from "@/modules/rulle/ble/heart-rate";

const bytesOf = (array: Uint8Array) => Array.from(array);

describe("Indoor Bike Data (FTMS 4.9)", () => {
  it("reads speed, cadence and power when the flags say so", () => {
    // Flags 0x0044: cadence (bit 2) and power (bit 6); bit 0 clear, so speed comes first.
    const data = parseIndoorBikeData(viewOf([0x44, 0x00, 0xea, 0x0b, 0xb4, 0x00, 0xfa, 0x00]));
    expect(data).toEqual({ speedKmh: 30.5, cadence: 90, power: 250 });
  });

  it("leaves speed out when More Data is set, and reads past the fields it does not use", () => {
    // Flags 0x0B61: More Data, resistance (5), power (6), energy (8), heart rate (9), elapsed (11).
    const data = parseIndoorBikeData(
      viewOf([0x61, 0x0b, 0x10, 0x00, 0x2c, 0x01, 0x0a, 0x00, 0x58, 0x02, 0x05, 0x8c, 0x3c, 0x00]),
    );
    expect(data).toEqual({ power: 300, heartRate: 140, elapsedSeconds: 60 });
  });

  it("reads the total distance as three bytes", () => {
    // Flags 0x0011: More Data and total distance (bit 4).
    expect(parseIndoorBikeData(viewOf([0x11, 0x00, 0x10, 0x27, 0x00]))).toEqual({
      distanceM: 10_000,
    });
  });

  it("keeps what it had when the value is cut short", () => {
    expect(parseIndoorBikeData(viewOf([0x44, 0x00, 0xea, 0x0b, 0xb4]))).toEqual({ speedKmh: 30.5 });
    expect(parseIndoorBikeData(viewOf([0x44]))).toEqual({});
  });

  it("drops numbers no bike has", () => {
    expect(parseIndoorBikeData(viewOf([0x41, 0x00, 0xff, 0x7f]))).toEqual({});
  });
});

describe("what a trainer can do", () => {
  it("reads the machine's and the target settings' bits", () => {
    // Machine: cadence (1), heart rate (10), power (14). Targets: power (3), simulation (13).
    const machine = (1 << 1) | (1 << 10) | (1 << 14);
    const target = (1 << 3) | (1 << 13);
    const view = new DataView(new ArrayBuffer(8));
    view.setUint32(0, machine, true);
    view.setUint32(4, target, true);
    expect(parseFeatures(view)).toEqual({
      cadence: true,
      heartRate: true,
      power: true,
      targetPower: true,
      simulation: true,
    });
    expect(parseFeatures(viewOf([0, 0, 0, 0, 0, 0, 0, 0])).targetPower).toBe(false);
  });

  it("reads the power range, and ignores one that makes no sense", () => {
    expect(parsePowerRange(viewOf([0x00, 0x00, 0xd0, 0x07, 0x01, 0x00]))).toEqual({
      min: 0,
      max: 2000,
      step: 1,
    });
    expect(parsePowerRange(viewOf([0x00, 0x00, 0x00, 0x00, 0x01, 0x00]))).toBeNull();
    expect(parsePowerRange(viewOf([0x00]))).toBeNull();
  });
});

describe("the Control Point (FTMS 4.16)", () => {
  it("asks for control, starts, stops and resets in one byte or two", () => {
    expect(bytesOf(control.requestControl())).toEqual([0x00]);
    expect(bytesOf(control.startOrResume())).toEqual([0x07]);
    expect(bytesOf(control.stop())).toEqual([0x08, 0x01]);
    expect(bytesOf(control.reset())).toEqual([0x01]);
  });

  it("sets the watts as a little-endian sint16, within what the trainer holds", () => {
    expect(bytesOf(control.setTargetPower(250))).toEqual([0x05, 0xfa, 0x00]);
    expect(bytesOf(control.setTargetPower(1200.4))).toEqual([0x05, 0xb0, 0x04]);
    expect(bytesOf(control.setTargetPower(-20))).toEqual([0x05, 0x00, 0x00]);
    expect(bytesOf(control.setTargetPower(900, { min: 50, max: 800, step: 1 }))).toEqual([
      0x05, 0x20, 0x03,
    ]);
  });

  it("sets a road: no wind, the grade in hundredths of a per cent, rolling and wind resistance", () => {
    expect(bytesOf(control.setSimulation(0))).toEqual([0x11, 0, 0, 0, 0, 40, 51]);
    expect(bytesOf(control.setSimulation(0.05))).toEqual([0x11, 0, 0, 0xf4, 0x01, 40, 51]);
    expect(bytesOf(control.setSimulation(-0.025))).toEqual([0x11, 0, 0, 0x06, 0xff, 40, 51]);
  });

  it("reads the trainer's answer to each command", () => {
    expect(parseControlResponse(viewOf([0x80, 0x05, 0x01]))).toEqual({
      opCode: 0x05,
      result: "success",
    });
    expect(parseControlResponse(viewOf([0x80, 0x00, 0x05]))).toEqual({
      opCode: 0x00,
      result: "not_permitted",
    });
    expect(parseControlResponse(viewOf([0x05, 0x01]))).toBeNull();
  });

  it("hears when another app has taken control", () => {
    expect(parseStatus(viewOf([0xff]))).toBe("control_lost");
    expect(parseStatus(viewOf([0x02, 0x01]))).toBe("stopped");
    expect(parseStatus(viewOf([0x08, 0xfa, 0x00]))).toBe("other");
  });
});

describe("Cycling Power (CPS 3.2)", () => {
  it("reads the watts and the crank's revolutions past the fields before them", () => {
    // Flags 0x0021: pedal power balance (bit 0) and crank revolution data (bit 5).
    const measurement = parsePowerMeasurement(
      viewOf([0x21, 0x00, 0xc8, 0x00, 0x64, 0x0a, 0x00, 0x00, 0x04]),
    );
    expect(measurement).toEqual({ power: 200, crank: { revolutions: 10, eventTime: 1024 } });
  });

  it("reads past wheel revolutions to the crank's", () => {
    // Flags 0x0030: wheel (bit 4) and crank (bit 5).
    const measurement = parsePowerMeasurement(
      viewOf([0x30, 0x00, 0x96, 0x00, 1, 2, 3, 4, 5, 6, 0x07, 0x00, 0x00, 0x08]),
    );
    expect(measurement).toEqual({ power: 150, crank: { revolutions: 7, eventTime: 2048 } });
  });

  it("gives the cadence from successive crank events, over the wrap of both counters", () => {
    const cadence = new CrankCadence();
    expect(cadence.update({ revolutions: 100, eventTime: 0 }, 0)).toBeNull();
    // One revolution in 683/1024 s is 90 per minute.
    expect(cadence.update({ revolutions: 101, eventTime: 683 }, 700)).toBe(90);
    const wrapped = new CrankCadence();
    wrapped.update({ revolutions: 65_535, eventTime: 65_000 }, 0);
    expect(wrapped.update({ revolutions: 0, eventTime: 147 }, 700)).toBe(90);
  });

  it("says the legs have stopped when no revolution has come for a while", () => {
    const cadence = new CrankCadence();
    cadence.update({ revolutions: 10, eventTime: 0 }, 0);
    cadence.update({ revolutions: 11, eventTime: 683 }, 700);
    expect(cadence.update({ revolutions: 11, eventTime: 683 }, 1_500)).toBe(90);
    expect(cadence.update({ revolutions: 11, eventTime: 683 }, 5_000)).toBe(0);
  });
});

describe("Heart Rate (HRS 3.1)", () => {
  it("reads one byte or two, as the first flag says", () => {
    expect(parseHeartRate(viewOf([0x00, 0x48]))).toBe(72);
    expect(parseHeartRate(viewOf([0x01, 0x9b, 0x00]))).toBe(155);
    expect(parseHeartRate(viewOf([0x10, 0x8c, 0x00, 0x04]))).toBe(140);
  });

  it("reads nothing from a strap that has lost the skin, or a pulse no one has", () => {
    expect(parseHeartRate(viewOf([0x04, 0x48]))).toBeNull();
    expect(parseHeartRate(viewOf([0x06, 0x48]))).toBe(72);
    expect(parseHeartRate(viewOf([0x00, 0x00]))).toBeNull();
    expect(parseHeartRate(viewOf([]))).toBeNull();
  });
});
