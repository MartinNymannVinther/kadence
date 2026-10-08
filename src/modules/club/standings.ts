/**
 * The club championship's arithmetic (docs/adr/0051): the order in a
 * round, the points it gives, the season's standings per class, the
 * personal bests on a course the club rides again, and the year's biggest
 * improvement. The club types the results; nothing here guesses one.
 *
 * Pure: imports nothing from the database.
 */

export type ClubClass = "U17" | "U19" | "U23" | "open";
export const CLUB_CLASSES: readonly ClubClass[] = ["U17", "U19", "U23", "open"];

export type RoundKind = "tt" | "hill" | "road" | "crit" | "other";
export const ROUND_KINDS: readonly RoundKind[] = ["tt", "hill", "road", "crit", "other"];

export type EntryStatus = "finished" | "dnf" | "dns";

/** Points for 1st to 8th; every other finisher gets one for riding. */
export const DEFAULT_POINTS: readonly number[] = [10, 8, 6, 5, 4, 3, 2, 1];
export const FINISHER_POINT = 1;

export type RoundIn = { id: string; heldOn: string; title: string; measure: "time" | "place" };

export type EntryIn = {
  id: string;
  roundId: string;
  riderId: string | null;
  name: string;
  class: ClubClass;
  timeMs: number | null;
  place: number | null;
  status: EntryStatus;
};

/** One person across the season: a rider by id, a guest by name. */
export const personKey = (e: Pick<EntryIn, "riderId" | "name">) =>
  e.riderId ?? `name:${e.name.trim().toLowerCase()}`;

/**
 * Each finisher's place within their class in one round: by time, fastest
 * first, or by the place typed in. Equal times share a place (1, 1, 3).
 * A rider who did not finish has none.
 */
export function roundPlaces(round: RoundIn, entries: readonly EntryIn[]): Map<string, number> {
  const places = new Map<string, number>();
  for (const cls of CLUB_CLASSES) {
    const finishers = entries.filter(
      (e) =>
        e.roundId === round.id &&
        e.class === cls &&
        e.status === "finished" &&
        (round.measure === "time" ? e.timeMs !== null : e.place !== null),
    );
    const value = (e: EntryIn) => (round.measure === "time" ? e.timeMs! : e.place!);
    const sorted = [...finishers].sort((a, b) => value(a) - value(b));
    sorted.forEach((e, i) => {
      const previous = sorted[i - 1];
      const place = previous && value(previous) === value(e) ? places.get(previous.id)! : i + 1;
      places.set(e.id, place);
    });
  }
  return places;
}

export function pointsFor(place: number, table: readonly number[] = DEFAULT_POINTS): number {
  return table[place - 1] ?? FINISHER_POINT;
}

export type Standing = {
  key: string;
  riderId: string | null;
  name: string;
  class: ClubClass;
  points: number;
  /** Rounds ridden to the finish. */
  finished: number;
  /** Rounds won, the first tie-break. */
  wins: number;
  /** The place in each round, in the rounds' order; null where not placed. */
  places: (number | null)[];
};

/** The season per class, most points first; then more wins, then the name. */
export function standings(
  rounds: readonly RoundIn[],
  entries: readonly EntryIn[],
  table: readonly number[] = DEFAULT_POINTS,
): Record<ClubClass, Standing[]> {
  const ordered = [...rounds].sort((a, b) => a.heldOn.localeCompare(b.heldOn));
  const placesByRound = new Map(ordered.map((r) => [r.id, roundPlaces(r, entries)]));
  const people = new Map<string, Standing>();
  for (const e of entries) {
    const key = `${e.class}|${personKey(e)}`;
    if (!people.has(key))
      people.set(key, {
        key: personKey(e),
        riderId: e.riderId,
        name: e.name,
        class: e.class,
        points: 0,
        finished: 0,
        wins: 0,
        places: ordered.map(() => null),
      });
    const standing = people.get(key)!;
    const index = ordered.findIndex((r) => r.id === e.roundId);
    const place = placesByRound.get(e.roundId)?.get(e.id);
    if (index < 0 || place === undefined) continue;
    standing.places[index] = place;
    standing.points += pointsFor(place, table);
    standing.finished += 1;
    if (place === 1) standing.wins += 1;
  }
  const out = Object.fromEntries(CLUB_CLASSES.map((c) => [c, [] as Standing[]])) as Record<
    ClubClass,
    Standing[]
  >;
  for (const s of people.values()) out[s.class].push(s);
  for (const c of CLUB_CLASSES)
    out[c].sort(
      (a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name, "da"),
    );
  return out;
}

export type TimedEntry = {
  id: string;
  key: string;
  name: string;
  course: string;
  heldOn: string;
  timeMs: number;
};

const course = (title: string) => title.trim().toLowerCase();

/**
 * Entries that beat the same person's every earlier time on the same
 * course — the club's own fixed time trial, say. A first ride on a course
 * is not yet a record: there is nothing to beat.
 */
export function personalBests(entries: readonly TimedEntry[]): Set<string> {
  const best = new Map<string, number>();
  const out = new Set<string>();
  const ordered = [...entries].sort((a, b) => a.heldOn.localeCompare(b.heldOn));
  for (const e of ordered) {
    const key = `${e.key}|${course(e.course)}`;
    const before = best.get(key);
    if (before !== undefined && e.timeMs < before) out.add(e.id);
    if (before === undefined || e.timeMs < before) best.set(key, e.timeMs);
  }
  return out;
}

export type Improvement = { key: string; name: string; course: string; percent: number };

/**
 * The year's biggest improvement: the same person on the same course,
 * their best this year against their best the year before, in percent.
 * Null when nobody rode a course both years faster than before.
 */
export function mostImproved(entries: readonly TimedEntry[], year: number): Improvement | null {
  const bestIn = (y: number) => {
    const map = new Map<string, TimedEntry>();
    for (const e of entries) {
      if (Number(e.heldOn.slice(0, 4)) !== y) continue;
      const key = `${e.key}|${course(e.course)}`;
      const known = map.get(key);
      if (!known || e.timeMs < known.timeMs) map.set(key, e);
    }
    return map;
  };
  const now = bestIn(year);
  const before = bestIn(year - 1);
  let top: Improvement | null = null;
  for (const [key, e] of now) {
    const prev = before.get(key);
    if (!prev || e.timeMs >= prev.timeMs) continue;
    const percent = ((prev.timeMs - e.timeMs) / prev.timeMs) * 100;
    if (!top || percent > top.percent)
      top = { key: e.key, name: e.name, course: e.course, percent };
  }
  return top;
}

/** "mm:ss" or "h:mm:ss" (or with tenths) to milliseconds; null when it is not a time. */
export function parseTime(text: string): number | null {
  const parts = text.trim().replace(",", ".").split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [h, m, s] = parts.length === 3 ? nums : [0, ...nums];
  if (m! >= 60 || s! >= 60) return null;
  const ms = Math.round(((h! * 60 + m!) * 60 + s!) * 1000);
  return ms > 0 ? ms : null;
}

/** Milliseconds as "m:ss" or "h:mm:ss", with tenths when there are any. */
export function formatTime(ms: number): string {
  const tenths = Math.round(ms / 100) % 10;
  const total = Math.floor(Math.round(ms / 100) / 10);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = `${String(s).padStart(2, "0")}${tenths ? `.${tenths}` : ""}`;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
