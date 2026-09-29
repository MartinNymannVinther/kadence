import {
  FILE_TYPE,
  FIT_LIMITS,
  FitError,
  SPORT,
  type FitFile,
  type FitRecord,
} from "@/modules/fit";
import { completeFromGps } from "./gps";
import { scanXml } from "./xml";

/**
 * GPX 1.0 and 1.1 — what Strava, Komoot, Garmin Connect and many watch
 * apps export — read into the shape of a FIT file, so the rest of Kadence
 * reads it like one. From every track point: position, elevation, time,
 * and from the extensions whatever is there under the names the common
 * exporters use: heart rate (`hr`, `heartrate`), cadence (`cad`,
 * `cadence`), power (`power`, `PowerInWatts`, `watts`) and speed.
 *
 * GPX has no laps and no session totals; distance and speed come from
 * the positions when the file does not carry them (`gps.ts`). The track's
 * `type` says the sport where the exporter wrote one; a file that says
 * nothing is taken for a bike ride, which is what Kadence is for.
 */

/** A track's type in words: English as most exporters write it, then Danish and German. */
const NOT_BIKE =
  /run|walk|hik|swim|ski|row|padd|yoga|strength|workout|løb|gåtur|vandre|svøm|lauf|wander|spazier|schwimm/i;
/**
 * Strava writes the type as a number. Two are known to be no ride: 4, a
 * hike (communityhub.strava.com/developers-api-7/gpx-trk-type-2404,
 * 2023-04-06) and 9, a run (communityhub.strava.com/developers-api-7/
 * allow-import-of-activity-type-on-gpx-3074). Strava does not document
 * the others; the archive's own list says what those were
 * (src/modules/files/strava-archive.ts, ADR 0030).
 */
const STRAVA_NOT_BIKE = new Set(["4", "9"]);

const saysNotBike = (type: string | undefined) =>
  type !== undefined && (NOT_BIKE.test(type) || STRAVA_NOT_BIKE.has(type.trim()));

const num = (text: string) => {
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

export function readGpx(xml: string): FitFile & { title?: string } {
  const records: FitRecord[] = [];
  const stack: string[] = [];
  let point: (Partial<FitRecord> & { lat: number; lon: number }) | null = null;
  let type: string | undefined;
  let title: string | undefined;

  scanXml(xml, {
    open(name, attrs) {
      stack.push(name);
      if (name === "trkpt" || name === "rtept") {
        const lat = num(attrs.lat ?? "");
        const lon = num(attrs.lon ?? "");
        point =
          lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
            ? { lat, lon }
            : null;
      }
    },
    close(name) {
      stack.pop();
      if ((name === "trkpt" || name === "rtept") && point) {
        if (point.t !== undefined) {
          if (records.length >= FIT_LIMITS.maxRecords)
            throw new FitError("too_large", "Too many track points.");
          records.push(point as FitRecord);
        }
        point = null;
      }
    },
    text(text) {
      const name = stack.at(-1)?.toLowerCase();
      const parent = stack.at(-2);
      if (!point) {
        if (name === "type" && parent === "trk") type = text;
        if (name === "name" && parent === "trk") title = text.slice(0, 120);
        return;
      }
      if (name === "time") {
        const t = Date.parse(text);
        if (Number.isFinite(t)) point.t = t;
      } else if (name === "ele") point.altitude = num(text);
      else if (name === "hr" || name === "heartrate") point.hr = num(text);
      else if (name === "cad" || name === "cadence") point.cadence = num(text);
      else if (name === "power" || name === "powerinwatts" || name === "watts")
        point.power = num(text);
      else if (name === "speed") point.speed = num(text);
    },
  });

  if (records.length === 0) throw new FitError("empty", "No track point with a time.");
  completeFromGps(records);
  return {
    crcOk: true,
    protocolVersion: 0,
    profileVersion: 0,
    fileType: FILE_TYPE.activity,
    sport: saysNotBike(type) ? undefined : SPORT.cycling,
    records,
    laps: [],
    sessions: [],
    events: [],
    workoutSteps: [],
    title,
  };
}
