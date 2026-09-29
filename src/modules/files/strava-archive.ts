/**
 * A rider's Strava archive (ADR 0030). Strava's "Download your account"
 * gives a zip with `activities.csv` — a row per activity with its name,
 * its type and the file it was recorded in — and an `activities/` folder
 * with those files, mostly the device's own FIT, gzipped. This finds the
 * activity files in it, newest first, and what the rider called each.
 *
 * The layout and the column names are Strava's, known from how others
 * describe the archive rather than from Strava's own documentation, so
 * they are read as hints: a CSV that cannot be read leaves the rides
 * without their names, never without the rides. Strava writes the list
 * in the language the rider's account is set to — a German account's
 * says "Dateiname" for "Filename" (the header mapping in
 * github.com/martin-ueding/geo-activity-playground,
 * src/geo_activity_playground/features/strava/strava-csv-mapping.json,
 * read 2026-09-29) — so the columns are found by their names where they
 * are known, by what they hold where they are not (the file column is
 * the one of `activities/…` paths), and by where Strava puts them (name
 * third, type fourth) when the rest is the layout Strava writes.
 *
 * The type is a hint too, read in the languages a rider here is likely
 * to have: a type that is plainly something else (a run, a walk, "Løb",
 * "Gåtur") is told apart here; anything else is left to the file, which
 * the import reads for its sport (src/modules/devices/import.ts).
 *
 * Pure: no DOM, no database.
 */

export type RideKind = "bike" | "other" | "unknown";

export type StravaRide = {
  /** The entry's path in the archive. */
  path: string;
  /** The file's own name, which Kadence keeps as the original's name. */
  fileName: string;
  /** What the rider called the activity on Strava; empty when the CSV did not say. */
  title: string;
  kind: RideKind;
};

export type CsvIndex = Map<string, { title: string; type: string }>;

const CSV_NAME = "activities.csv";
const RIDE_FILE = /\.(fit|tcx|gpx)(\.gz)?$/i;
/** A title is kept as a person would read it: one line, no control characters, 120 at most. */
const MAX_TITLE = 120;
export const MAX_CSV_ROWS = 100_000;

// English first, then the Scandinavian languages, German, Dutch and French.
const BIKE =
  /ride|bike|cycl|velomobile|handcycle|gravel|cykel|cykl|sykkel|sykl|radfahrt|fahrrad|rennrad|fiets|vélo|velo/i;
const NOT_BIKE =
  /run|walk|hike|swim|weight|workout|yoga|ski|snowboard|skate|row|kayak|canoe|paddl|golf|soccer|football|tennis|climb|crossfit|elliptical|stair|pilates|badminton|padel|squash|pickleball|surf|sail|hockey|wheelchair|løb|løp|löp|gåtur|vandre|vandring|fottur|promenad|svøm|simning|styrke|vægt|træning|roning|kajak|kano|lauf|spazier|wander|schwimm|kraft|training|rudern|hardlo|wandel|zwem|course à pied|marche|randonn|natation/i;

/**
 * Where the archive's own files sit: "" in Strava's zip, "export_123/"
 * when the zip was unpacked and the folder picked, or packed again. Null
 * when there is no `activities.csv` at the top: not a Strava archive.
 */
export function stravaPrefix(paths: readonly string[]): string | null {
  for (const path of paths) {
    const parts = path.split("/");
    if (parts.length <= 2 && parts.at(-1)!.toLowerCase() === CSV_NAME)
      return parts.length === 2 ? `${parts[0]}/` : "";
  }
  return null;
}

export const csvPath = (prefix: string) => `${prefix}${CSV_NAME}`;

/** RFC 4180: fields in quotes may hold commas, quotes (doubled) and line breaks. */
export function parseCsv(text: string, maxRows = MAX_CSV_ROWS): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let at = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; at < text.length; at++) {
    const c = text[at]!;
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[at + 1] === '"') {
        field += '"';
        at++;
      } else quoted = false;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[at + 1] === "\n") at++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (rows.length >= maxRows) return rows;
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function cleanTitle(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE)
    .trim();
}

/** Column names as Strava writes them in English and in German; others are found without their names. */
const FILE_COLUMN = ["filename", "file name", "dateiname"];
const NAME_COLUMN = ["activity name", "name der aktivität"];
const TYPE_COLUMN = ["activity type", "aktivitätsart"];
/** Where Strava puts them: activity number, date, name, type, … */
const NAME_AT = 2;
const TYPE_AT = 3;
const ACTIVITY_FILE = /^activities\/[^/]+\.(fit|tcx|gpx)(\.gz)?$/i;
/** Rows looked at to tell a column by what it holds. */
const SAMPLE = 50;

/** The column whose cells are the activities' files, whatever it is called. */
function fileColumnByContent(header: string[], rows: string[][]): number {
  let best = -1;
  let most = 0;
  for (let column = 0; column < header.length; column++) {
    let files = 0;
    for (const row of rows.slice(0, SAMPLE))
      if (ACTIVITY_FILE.test((row[column] ?? "").trim().replace(/\\/g, "/"))) files += 1;
    if (files > most) [best, most] = [column, files];
  }
  return best;
}

/** Strava's own layout: the first column is the activity's number on every row that has one. */
function isStravasLayout(header: string[], rows: string[][]): boolean {
  const firsts = rows.slice(0, SAMPLE).flatMap((row) => (row[0]?.trim() ? [row[0].trim()] : []));
  return header.length > TYPE_AT && firsts.length > 0 && firsts.every((id) => /^\d+$/.test(id));
}

/**
 * The CSV's rows by the file each names, lower case: "activities/123.fit.gz".
 * Its columns are found by their English or German names, else the file
 * by what it holds and the name and the type by where Strava puts them.
 */
export function readActivitiesCsv(text: string): CsvIndex {
  const [header, ...rows] = parseCsv(text);
  const index: CsvIndex = new Map();
  if (!header) return index;
  const column = (names: string[]) =>
    header.findIndex((h) => names.includes(h.trim().toLowerCase()));
  let file = column(FILE_COLUMN);
  if (file < 0) file = fileColumnByContent(header, rows);
  if (file < 0) return index;
  let name = column(NAME_COLUMN);
  let type = column(TYPE_COLUMN);
  if (file > TYPE_AT && isStravasLayout(header, rows)) {
    // A list in another language: its third and fourth columns, not a
    // later one that happens to be called "Type" in it.
    if (name < 0) name = NAME_AT;
    if (type < 0) type = TYPE_AT;
  } else {
    if (name < 0) name = column(["name"]);
    if (type < 0) type = column(["type"]);
  }
  for (const row of rows) {
    const path = (row[file] ?? "").trim().replace(/\\/g, "/").toLowerCase();
    if (!path) continue;
    index.set(path, {
      title: name < 0 ? "" : cleanTitle(row[name] ?? ""),
      type: type < 0 ? "" : (row[type] ?? "").trim(),
    });
  }
  return index;
}

export function kindOf(type: string): RideKind {
  const t = type.trim();
  if (!t) return "unknown";
  if (BIKE.test(t)) return "bike";
  return NOT_BIKE.test(t) ? "other" : "unknown";
}

/** Strava numbers its activities as they come in, so a larger number is a later ride. */
const numberOf = (fileName: string) => {
  const digits = /^(\d{1,16})/.exec(fileName)?.[1];
  return digits ? Number(digits) : -1;
};

/** The activity files in the archive's `activities/` folder, newest first. */
export function stravaRides(
  paths: readonly string[],
  prefix: string,
  csv: CsvIndex = new Map(),
): StravaRide[] {
  const folder = `${prefix}activities/`.toLowerCase();
  const rides: StravaRide[] = [];
  for (const path of paths) {
    if (!path.toLowerCase().startsWith(folder)) continue;
    const fileName = path.slice(folder.length);
    if (!fileName || fileName.includes("/") || fileName.startsWith(".")) continue;
    if (!RIDE_FILE.test(fileName)) continue;
    const row = csv.get(`activities/${fileName}`.toLowerCase());
    rides.push({
      path,
      fileName,
      title: row?.title ?? "",
      kind: row ? kindOf(row.type) : "unknown",
    });
  }
  return rides.sort(
    (a, b) => numberOf(b.fileName) - numberOf(a.fileName) || b.fileName.localeCompare(a.fileName),
  );
}
