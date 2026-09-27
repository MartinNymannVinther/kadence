/**
 * The few numbers from Garmin's FIT profile that Kadence reads or writes:
 * message numbers, field numbers and the enums behind them. The profile
 * defines hundreds of messages; the decoder skips every one not named here
 * (device_info, hrv, developer_data_id, field_description and the rest).
 */

/** 1989-12-31T00:00:00Z, where FIT's clock starts. */
export const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

/**
 * A date_time below this is seconds since the device powered on, not since
 * the epoch; such a time says nothing about the calendar.
 */
export const FIT_MIN_ABSOLUTE_TIME = 0x10000000;

export function fitTimeToMs(seconds: number): number {
  return FIT_EPOCH_MS + seconds * 1000;
}

export function msToFitTime(ms: number): number {
  return Math.round((ms - FIT_EPOCH_MS) / 1000);
}

/** Positions are semicircles: 2^31 of them make 180 degrees. */
export const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;

/** Global message numbers. */
export const MESG = {
  fileId: 0,
  sport: 12,
  session: 18,
  lap: 19,
  record: 20,
  event: 21,
  deviceInfo: 23,
  workout: 26,
  workoutStep: 27,
  activity: 34,
} as const;

/** Field 253 is the timestamp in every message that has one, 254 the message index. */
export const FIELD_TIMESTAMP = 253;
export const FIELD_MESSAGE_INDEX = 254;

/** Field numbers per message. Scales and offsets are applied in `messages.ts`. */
export const FILE_ID = { type: 0, manufacturer: 1, product: 2, serialNumber: 3, timeCreated: 4 };

export const RECORD = {
  positionLat: 0, // sint32 semicircles
  positionLong: 1, // sint32 semicircles
  altitude: 2, // uint16, scale 5, offset 500, m
  heartRate: 3, // uint8 bpm
  cadence: 4, // uint8 rpm
  distance: 5, // uint32, scale 100, m
  speed: 6, // uint16, scale 1000, m/s
  power: 7, // uint16 W
  enhancedSpeed: 73, // uint32, scale 1000, m/s
  enhancedAltitude: 78, // uint32, scale 5, offset 500, m
};

export const SESSION = {
  startTime: 2,
  sport: 5,
  subSport: 6,
  totalElapsedTime: 7, // uint32, scale 1000, s
  totalTimerTime: 8, // uint32, scale 1000, s
  totalDistance: 9, // uint32, scale 100, m
  totalCalories: 11, // uint16 kcal
  avgHeartRate: 16,
  maxHeartRate: 17,
  avgCadence: 18,
  avgPower: 20,
  maxPower: 21,
  totalAscent: 22, // uint16 m
  totalDescent: 23, // uint16 m
};

export const LAP = {
  startTime: 2,
  totalElapsedTime: 7,
  totalTimerTime: 8,
  totalDistance: 9,
  avgHeartRate: 15,
  maxHeartRate: 16,
  avgCadence: 17,
  avgPower: 19,
  maxPower: 20,
};

export const EVENT = { event: 0, eventType: 1, data: 3 };

export const ACTIVITY = { totalTimerTime: 0, numSessions: 1, localTimestamp: 5 };

export const SPORT_MESG = { sport: 0, subSport: 1, name: 3 };

export const WORKOUT = { sport: 4, capabilities: 5, numValidSteps: 6, name: 8, subSport: 11 };

export const WORKOUT_STEP = {
  name: 0, // string
  durationType: 1, // enum wkt_step_duration
  durationValue: 2, // uint32: ms for time; the step to repeat from for repeats
  targetType: 3, // enum wkt_step_target
  targetValue: 4, // uint32: 0 = custom range; the repeat count for repeats
  customTargetLow: 5, // uint32
  customTargetHigh: 6, // uint32
  intensity: 7, // enum intensity
  notes: 8, // string
};

/** Enum `file`: what a FIT file holds. */
export const FILE_TYPE = { activity: 4, workout: 5 } as const;

/** Enum `sport` and `sub_sport`, the values Kadence names. */
export const SPORT = { generic: 0, running: 1, cycling: 2 } as const;
export const SUB_SPORT = { generic: 0, indoorCycling: 6 } as const;

/** Enum `manufacturer`: 255 is "development", for software that is not a device maker. */
export const MANUFACTURER = { garmin: 1, development: 255 } as const;

/** Enum `wkt_step_duration`. */
export const WKT_DURATION = { time: 0, open: 5, repeatUntilStepsCmplt: 6 } as const;

/** Enum `wkt_step_target`. */
export const WKT_TARGET = { heartRate: 1, open: 2, power: 4 } as const;

/** Enum `intensity`. */
export const INTENSITY = { active: 0, rest: 1, warmup: 2, cooldown: 3 } as const;

/**
 * Custom power targets: 0–1000 is percent of FTP, above 1000 watts plus
 * 1000. Custom heart rate targets: 0–100 is percent of max heart rate,
 * above 100 beats per minute plus 100.
 */
export const CUSTOM_POWER_WATTS_OFFSET = 1000;
export const CUSTOM_HR_BPM_OFFSET = 100;
