import { Bytes } from "./bytes";

/**
 * The Fitness Machine Service (FTMS 1.0), the part of it an indoor bike
 * uses: what the trainer reports (Indoor Bike Data), what it can do
 * (Fitness Machine Feature, Supported Power Range), and the Control Point
 * through which Rulle takes control, sets the watts (ERG) or a flat road
 * (simulation), and gets an answer to each. Byte layouts as the
 * specification's sections 4.3, 4.9, 4.14, 4.16 and 4.17 give them, all
 * little-endian. Pure: DataViews in, numbers out, bytes to write.
 */

export type IndoorBikeData = {
  speedKmh?: number;
  cadence?: number;
  distanceM?: number;
  power?: number;
  heartRate?: number;
  elapsedSeconds?: number;
};

/** Indoor Bike Data (0x2AD2): the fields its flags say are there, in the order the spec lists them. */
export function parseIndoorBikeData(view: DataView): IndoorBikeData {
  const bytes = new Bytes(view);
  const flags = bytes.u16();
  if (flags === undefined) return {};
  const has = (bit: number) => (flags & (1 << bit)) !== 0;
  const out: IndoorBikeData = {};
  // Bit 0 is "More Data": when it is clear, instantaneous speed is present.
  if (!has(0)) out.speedKmh = scale(bytes.u16(), 0.01);
  if (has(1)) bytes.skip(2); // average speed
  if (has(2)) out.cadence = scale(bytes.u16(), 0.5);
  if (has(3)) bytes.skip(2); // average cadence
  if (has(4)) out.distanceM = bytes.u24();
  if (has(5)) bytes.skip(2); // resistance level
  if (has(6)) out.power = bytes.s16();
  if (has(7)) bytes.skip(2); // average power
  if (has(8)) bytes.skip(5); // expended energy: total, per hour, per minute
  if (has(9)) out.heartRate = bytes.u8();
  if (has(10)) bytes.skip(1); // metabolic equivalent
  if (has(11)) out.elapsedSeconds = bytes.u16();
  return clean(out);
}

export type MachineFeatures = {
  cadence: boolean;
  heartRate: boolean;
  power: boolean;
  /** The trainer holds a target power: ERG. */
  targetPower: boolean;
  /** The trainer rides a simulated road: grade, wind, rolling resistance. */
  simulation: boolean;
};

/** Fitness Machine Feature (0x2ACC): two bit fields, what it measures and what it can be set to. */
export function parseFeatures(view: DataView): MachineFeatures {
  const bytes = new Bytes(view);
  const machine = bytes.u32() ?? 0;
  const target = bytes.u32() ?? 0;
  const bit = (field: number, n: number) => (field & (1 << n)) !== 0;
  return {
    cadence: bit(machine, 1),
    heartRate: bit(machine, 10),
    power: bit(machine, 14),
    targetPower: bit(target, 3),
    simulation: bit(target, 13),
  };
}

export type PowerRange = { min: number; max: number; step: number };

/** Supported Power Range (0x2AD8): the least and most the trainer holds, and its step. */
export function parsePowerRange(view: DataView): PowerRange | null {
  const bytes = new Bytes(view);
  const min = bytes.s16();
  const max = bytes.s16();
  const step = bytes.u16();
  if (min === undefined || max === undefined || max <= 0 || max < min) return null;
  return { min: Math.max(0, min), max, step: step && step > 0 ? step : 1 };
}

/** Control Point op codes (FTMS 4.16.1). */
export const OP = {
  requestControl: 0x00,
  reset: 0x01,
  setTargetPower: 0x05,
  startOrResume: 0x07,
  stopOrPause: 0x08,
  setSimulation: 0x11,
  response: 0x80,
} as const;

export const control = {
  requestControl: () => Uint8Array.of(OP.requestControl),
  reset: () => Uint8Array.of(OP.reset),
  startOrResume: () => Uint8Array.of(OP.startOrResume),
  stop: () => Uint8Array.of(OP.stopOrPause, 0x01),
  /** ERG: hold `watts`, clamped to what the trainer says it can. */
  setTargetPower(watts: number, range?: PowerRange | null): Uint8Array {
    let w = Math.round(Number.isFinite(watts) ? watts : 0);
    if (range) w = Math.min(range.max, Math.max(range.min, w));
    w = Math.min(0x7fff, Math.max(0, w));
    return Uint8Array.of(OP.setTargetPower, w & 0xff, (w >> 8) & 0xff);
  },
  /**
   * A road to ride: `grade` as rise over run (0.05 is 5 %), no wind, a
   * road tyre's rolling resistance and a rider's wind resistance. Rulle's
   * free mode is a flat road (grade 0): the rider's own gears and legs.
   */
  setSimulation(grade: number, crr = 0.004, cw = 0.51): Uint8Array {
    const g = Math.round(Math.min(0.4, Math.max(-0.4, grade)) * 10000); // 0.01 % steps
    const c = Math.min(255, Math.max(0, Math.round(crr * 10000)));
    const k = Math.min(255, Math.max(0, Math.round(cw * 100)));
    return Uint8Array.of(OP.setSimulation, 0, 0, g & 0xff, (g >> 8) & 0xff, c, k);
  },
};

export type ControlResult =
  "success" | "not_supported" | "invalid_parameter" | "failed" | "not_permitted" | "unknown";

const RESULTS: Record<number, ControlResult> = {
  0x01: "success",
  0x02: "not_supported",
  0x03: "invalid_parameter",
  0x04: "failed",
  0x05: "not_permitted",
};

/** The Control Point's indication: which command it answers, and how. Null when it is no response. */
export function parseControlResponse(
  view: DataView,
): { opCode: number; result: ControlResult } | null {
  const bytes = new Bytes(view);
  if (bytes.u8() !== OP.response) return null;
  const opCode = bytes.u8();
  const code = bytes.u8();
  if (opCode === undefined || code === undefined) return null;
  return { opCode, result: RESULTS[code] ?? "unknown" };
}

/** Fitness Machine Status (0x2ADA): only the news Rulle acts on. */
export type MachineStatus = "control_lost" | "stopped" | "reset" | "other";

export function parseStatus(view: DataView): MachineStatus {
  const code = new Bytes(view).u8();
  if (code === 0xff) return "control_lost";
  if (code === 0x02 || code === 0x03) return "stopped";
  if (code === 0x01) return "reset";
  return "other";
}

function scale(value: number | undefined, factor: number): number | undefined {
  return value === undefined ? undefined : value * factor;
}

/** Only numbers a bike can have; a trainer that sends 0xFFFF for "unknown" sends nothing. */
function clean(data: IndoorBikeData): IndoorBikeData {
  const out: IndoorBikeData = {};
  if (data.speedKmh !== undefined && data.speedKmh <= 150) out.speedKmh = data.speedKmh;
  if (data.cadence !== undefined && data.cadence <= 250) out.cadence = data.cadence;
  if (data.distanceM !== undefined) out.distanceM = data.distanceM;
  if (data.power !== undefined && data.power >= 0 && data.power <= 3000) out.power = data.power;
  if (data.heartRate !== undefined && data.heartRate > 0 && data.heartRate < 255)
    out.heartRate = data.heartRate;
  if (data.elapsedSeconds !== undefined) out.elapsedSeconds = data.elapsedSeconds;
  return out;
}
