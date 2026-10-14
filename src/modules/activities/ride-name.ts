import { looksLikeFileName } from "./file-name-title";

export { looksLikeFileName };

/**
 * What a ride is called on the pages (docs/adr/0098). Worked out each
 * time it is shown, from what the row already holds, so every stored
 * ride has a telling name at once and the stored title stays as it came
 * (the export carries that one):
 *
 * 1. A name a person or a device gave the ride is kept.
 * 2. A file's name (file-name-title.ts) gives way to the planned session
 *    the ride was ridden for ("Intervaller 4×8").
 * 3. Otherwise the ride is named by what it was: "Styrketræning"; a bike
 *    ride without a single position, "Indendørs tur"; else the part of
 *    the day it started in, Copenhagen time, and the sport —
 *    "Morgentur", "Eftermiddagstræning". Kadence stores no more than
 *    bike, strength and other, so a run is "…træning", never "…løb".
 *
 * An entry by hand starts at noon by convention (src/modules/training/complete.ts),
 * so its hour says nothing: it is a "Cykeltur" or a "Træning".
 *
 * Pure: the words are message keys under `activities.names`, read by
 * `rideNameText` with the reader's translator.
 */

export const PARTS_OF_DAY = ["morning", "forenoon", "afternoon", "evening", "night"] as const;
export type PartOfDay = (typeof PARTS_OF_DAY)[number];

export type RideWord =
  `${PartOfDay}Ride` | `${PartOfDay}Workout` | "indoorRide" | "strength" | "bikeRide" | "workout";

export const RIDE_WORDS: readonly RideWord[] = [
  ...PARTS_OF_DAY.flatMap((p) => [`${p}Ride` as const, `${p}Workout` as const]),
  "indoorRide",
  "strength",
  "bikeRide",
  "workout",
];

/** A name to show as it is, or a word to say in the reader's language. */
export type RideName = { title: string } | { word: RideWord };

export type RideNameInput = {
  /** The stored title. */
  title: string;
  /** bike | strength | other */
  sport: string;
  startedAt: Date | string;
  /** fit | wahoo | garmin | polar | manual */
  source: string;
  /** The planned session's title, when the ride was ridden for one. */
  sessionTitle?: string | null;
  /** The ride has samples, and not one of them has a position. */
  indoor?: boolean;
};

const HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  hour: "2-digit",
  hourCycle: "h23",
});

/** 05–10 morning, 10–12 forenoon, 12–17 afternoon, 17–22 evening, otherwise night; Copenhagen time. */
export function partOfDay(startedAt: Date | string): PartOfDay {
  const hour = Number(HOUR.format(new Date(startedAt)));
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 12) return "forenoon";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/** The ride keeps a name of its own, or takes its session's. */
function given(input: Pick<RideNameInput, "title" | "sessionTitle">): string | null {
  const own = input.title.trim();
  if (!looksLikeFileName(own)) return own;
  const session = input.sessionTitle?.trim();
  return session || null;
}

/** Whether the ride's name turns on whether it was ridden indoors: ask the streams only then. */
export function needsIndoor(input: Omit<RideNameInput, "indoor" | "startedAt">): boolean {
  return input.sport === "bike" && input.source !== "manual" && given(input) === null;
}

export function rideName(input: RideNameInput): RideName {
  const title = given(input);
  if (title !== null) return { title };
  if (input.sport === "strength") return { word: "strength" };
  const bike = input.sport === "bike";
  if (input.source === "manual") return { word: bike ? "bikeRide" : "workout" };
  if (bike && input.indoor) return { word: "indoorRide" };
  return { word: `${partOfDay(input.startedAt)}${bike ? "Ride" : "Workout"}` };
}

/** The name in the reader's words; `words` is `useTranslations("activities.names")` or its server twin. */
export function rideNameText(name: RideName, words: (word: RideWord) => string): string {
  return "title" in name ? name.title : words(name.word);
}

/**
 * Whether thinned samples (src/modules/fit/summarize.ts) were ridden
 * without a position. A ride entered by hand has no samples and is not
 * indoors; neither is an old row whose samples never carried positions.
 */
export function indoorFromStreams(streams: unknown): boolean {
  if (typeof streams !== "object" || streams === null) return false;
  const lat = (streams as { lat?: unknown }).lat;
  return Array.isArray(lat) && !lat.some((v) => typeof v === "number");
}
