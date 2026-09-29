/**
 * The Bluetooth SIG's assigned numbers Rulle speaks, as the 16-bit
 * aliases Web Bluetooth accepts in place of the full UUIDs
 * (Bluetooth Assigned Numbers, "GATT Services" and "Characteristics").
 *
 * - Fitness Machine (FTMS): a smart trainer that can be told what to do;
 *   Rulle reads its Indoor Bike Data and sets its target power (ERG).
 * - Cycling Power: a trainer or a power meter that only measures; the
 *   fallback, ridden in free mode.
 * - Heart Rate: a chest strap or a watch that broadcasts.
 */
export const SERVICE = {
  fitnessMachine: 0x1826,
  cyclingPower: 0x1818,
  heartRate: 0x180d,
} as const;

export const CHARACTERISTIC = {
  fitnessMachineFeature: 0x2acc,
  indoorBikeData: 0x2ad2,
  supportedPowerRange: 0x2ad8,
  fitnessMachineControlPoint: 0x2ad9,
  fitnessMachineStatus: 0x2ada,
  cyclingPowerMeasurement: 0x2a63,
  heartRateMeasurement: 0x2a37,
} as const;
