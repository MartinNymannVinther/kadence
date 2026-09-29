/**
 * What the decoder gives back: the handful of FIT messages Kadence uses,
 * with scales and offsets applied and "no value" turned into `undefined`.
 *
 * Every time is epoch milliseconds (UTC). Every number is in the unit the
 * property names or the comment says — metres, metres per second, watts,
 * beats and revolutions per minute, degrees — never FIT's raw integers.
 * Enums (sport, file type, workout step types) stay FIT's numbers; the
 * values Kadence names are in `profile.ts`.
 */

/** One sample of the ride, usually one per second. */
export interface FitRecord {
  t: number;
  power?: number;
  hr?: number;
  cadence?: number;
  /** m/s, enhanced_speed when the device wrote it. */
  speed?: number;
  /** Metres since the start, as the device counted them. */
  distance?: number;
  /** Metres above sea level, enhanced_altitude when the device wrote it. */
  altitude?: number;
  lat?: number;
  lon?: number;
}

export interface FitSession {
  /** When the session message was written, usually its end. */
  t?: number;
  startTime?: number;
  sport?: number;
  subSport?: number;
  /** Seconds from start to end, pauses included. */
  elapsedSeconds?: number;
  /** Seconds the timer ran: auto-pause and stops left out. */
  timerSeconds?: number;
  distanceM?: number;
  ascentM?: number;
  descentM?: number;
  calories?: number;
  avgPower?: number;
  maxPower?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
}

export interface FitLap {
  t?: number;
  startTime?: number;
  elapsedSeconds?: number;
  timerSeconds?: number;
  distanceM?: number;
  avgPower?: number;
  maxPower?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
}

/** A timer start or stop, a marker, a gear change: FIT's `event` and `event_type` enums. */
export interface FitEvent {
  t?: number;
  event?: number;
  eventType?: number;
  data?: number;
}

export interface FitActivity {
  t?: number;
  timerSeconds?: number;
  numSessions?: number;
  /** Local time minus UTC when the activity ended, in seconds, when the device wrote it. */
  localOffsetSeconds?: number;
}

export interface FitWorkout {
  name?: string;
  sport?: number;
  subSport?: number;
  numValidSteps?: number;
  description?: string;
}

/** A workout step as written: FIT's raw duration and target values, read with `profile.ts`. */
export interface FitWorkoutStep {
  messageIndex?: number;
  name?: string;
  durationType?: number;
  durationValue?: number;
  targetType?: number;
  targetValue?: number;
  customTargetLow?: number;
  customTargetHigh?: number;
  intensity?: number;
  notes?: string;
  secondaryTargetType?: number;
  secondaryTargetValue?: number;
  secondaryCustomTargetLow?: number;
  secondaryCustomTargetHigh?: number;
}

export interface FitFile {
  /** False when the file's checksum, or a fourteen-byte header's own, does not match. */
  crcOk: boolean;
  protocolVersion: number;
  profileVersion: number;
  /** FIT's `file` enum: 4 is an activity, 5 a workout. */
  fileType: number;
  manufacturer?: number;
  product?: number;
  /** Which file this is, to a device: none when the writer gave none. */
  serialNumber?: number;
  timeCreated?: number;
  /** The first session's sport, or the sport message's when no session names one. */
  sport?: number;
  subSport?: number;
  records: FitRecord[];
  laps: FitLap[];
  sessions: FitSession[];
  events: FitEvent[];
  activity?: FitActivity;
  workout?: FitWorkout;
  workoutSteps: FitWorkoutStep[];
}
