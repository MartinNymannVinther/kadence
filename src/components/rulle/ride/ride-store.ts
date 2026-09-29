import { z } from "zod";
import { readRecording, type Recording } from "@/modules/rulle";

/**
 * A ride kept in the browser until Kadence has it (dogma 2): every few
 * seconds while it is ridden, so a closed tab, a crash or a flat battery
 * does not take it, and after it ends until the save has gone through, so
 * a lost connection only delays it. One ride per rider on this device,
 * under the rider's own key: a family laptop shared by two riders never
 * offers one rider's ride to the other. Written as the recording, not the
 * file — the file is written from it again, byte for byte the same, so a
 * save sent twice is recognised as one.
 */

const PREFIX = "kadence.rulle.ride.";

const metaSchema = z.object({
  sessionId: z.string().max(100).nullable(),
  /** The session's title or the route's name: what the ride is called. */
  title: z.string().max(200),
  /** Seconds local time was ahead of UTC, for the file's local timestamp. */
  localOffsetSeconds: z
    .number()
    .int()
    .min(-15 * 3600)
    .max(15 * 3600),
});

export type RideMeta = z.infer<typeof metaSchema>;

export type KeptRide = {
  meta: RideMeta;
  recording: Recording;
  /** "riding" while it goes on; "finished" once it ended and waits to be saved. */
  state: "riding" | "finished";
  keptAt: number;
};

const keptSchema = z.object({
  meta: metaSchema,
  recording: z.unknown(),
  state: z.enum(["riding", "finished"]),
  keptAt: z.number(),
});

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Said in this page when the kept ride changes; other pages hear `storage`. */
const CHANGED = "kadence:rulle-kept";

function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

export function keepRide(riderId: string, ride: Omit<KeptRide, "keptAt">, now = Date.now()): void {
  try {
    storage()?.setItem(PREFIX + riderId, JSON.stringify({ ...ride, keptAt: now }));
    changed();
  } catch {
    // Full or refused: the ride goes on, only unprotected.
  }
}

/** The kept ride as stored, unread: what a page subscribes to (a string compares by value). */
export function keptRaw(riderId: string): string | null {
  try {
    return storage()?.getItem(PREFIX + riderId) ?? null;
  } catch {
    return null;
  }
}

export function onKeptChange(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

/** A kept ride, if what was stored still reads as one. */
export function parseKeptRide(raw: string | null): KeptRide | null {
  if (!raw) return null;
  try {
    const parsed = keptSchema.safeParse(JSON.parse(raw));
    const recording = parsed.success ? readRecording(parsed.data.recording) : null;
    if (!parsed.success || !recording || recording.t.length === 0) return null;
    return { ...parsed.data, recording };
  } catch {
    return null;
  }
}

export function readKeptRide(riderId: string): KeptRide | null {
  return parseKeptRide(keptRaw(riderId));
}

export function forgetRide(riderId: string): void {
  try {
    storage()?.removeItem(PREFIX + riderId);
    changed();
  } catch {
    // Nothing to do.
  }
}

/** Seconds local time is ahead of UTC now, where the browser is. */
export function localOffsetSeconds(now = new Date()): number {
  return -now.getTimezoneOffset() * 60;
}
