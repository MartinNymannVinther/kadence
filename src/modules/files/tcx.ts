import {
  FILE_TYPE,
  FIT_LIMITS,
  FitError,
  SPORT,
  type FitFile,
  type FitLap,
  type FitRecord,
} from "@/modules/fit";
import { completeFromGps } from "./gps";
import { scanXml } from "./xml";

/**
 * TCX (Garmin's Training Center XML) — what Garmin Connect, Polar Flow and
 * TrainingPeaks export — read into the shape of a FIT file. Each lap
 * becomes a lap from its `StartTime` to its last track point, with the
 * lap's own distance; each track point a record with time, position,
 * altitude, distance, heart rate, cadence, and from the `TPX` extension
 * speed and watts. The activity's `Sport` says bike or not: "Biking" is a
 * ride, "Running" and "Other" are not.
 *
 * Positions without distance or speed are filled in from GPS (`gps.ts`).
 */

const num = (text: string) => {
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

type OpenLap = { startTime?: number; distanceM?: number; last?: number };

export function readTcx(xml: string): FitFile {
  const records: FitRecord[] = [];
  const laps: FitLap[] = [];
  const stack: string[] = [];
  let sport: string | undefined;
  let lap: OpenLap | null = null;
  let point: Partial<FitRecord> | null = null;

  scanXml(xml, {
    open(name, attrs) {
      stack.push(name);
      if (name === "Activity" && sport === undefined) sport = attrs.Sport ?? "";
      if (name === "Lap") {
        const start = Date.parse(attrs.StartTime ?? "");
        lap = { startTime: Number.isFinite(start) ? start : undefined };
      }
      if (name === "Trackpoint") point = {};
    },
    close(name) {
      stack.pop();
      if (name === "Trackpoint" && point) {
        if (point.t !== undefined) {
          if (records.length >= FIT_LIMITS.maxRecords)
            throw new FitError("too_large", "Too many track points.");
          records.push(point as FitRecord);
          if (lap) lap.last = point.t;
        }
        point = null;
      }
      if (name === "Lap" && lap) {
        if (lap.startTime !== undefined && laps.length < FIT_LIMITS.maxLaps)
          laps.push({
            startTime: lap.startTime,
            t: lap.last !== undefined ? lap.last + 1000 : undefined,
            distanceM: lap.distanceM,
          });
        lap = null;
      }
    },
    text(text) {
      const name = stack.at(-1);
      const parent = stack.at(-2);
      if (point) {
        if (name === "Time") {
          const t = Date.parse(text);
          if (Number.isFinite(t)) point.t = t;
        } else if (name === "LatitudeDegrees") point.lat = inRange(num(text), 90);
        else if (name === "LongitudeDegrees") point.lon = inRange(num(text), 180);
        else if (name === "AltitudeMeters") point.altitude = num(text);
        else if (name === "DistanceMeters") point.distance = num(text);
        else if (name === "Value" && parent === "HeartRateBpm") point.hr = num(text);
        else if (name === "Cadence") point.cadence = num(text);
        else if (name === "Speed") point.speed = num(text);
        else if (name === "Watts") point.power = num(text);
      } else if (lap && name === "DistanceMeters" && parent === "Lap") {
        lap.distanceM = num(text);
      }
    },
  });

  if (records.length === 0) throw new FitError("empty", "No track point with a time.");
  // A point without a position is still a second of the ride; GPS fills
  // in only where there are positions.
  completeFromGps(records);
  return {
    crcOk: true,
    protocolVersion: 0,
    profileVersion: 0,
    fileType: FILE_TYPE.activity,
    sport: sport === undefined || /bik|cycl/i.test(sport) ? SPORT.cycling : undefined,
    records,
    laps,
    sessions: [],
    events: [],
    workoutSteps: [],
  };
}

function inRange(value: number | undefined, limit: number) {
  return value !== undefined && Math.abs(value) <= limit ? value : undefined;
}
