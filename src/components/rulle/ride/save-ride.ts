import { endRecording, rideToFit, type Recording } from "@/modules/rulle";
import type { RideMeta } from "./ride-store";

/**
 * Sends a finished ride to Kadence (POST /api/rulle/ride, ADR 0033) as
 * the FIT file written from its recording, and says how it went: saved
 * (or saved already), refused with Kadence's word for why, or not sent at
 * all because the connection is not there — the one case worth trying
 * again by itself.
 */

export type SaveResult =
  | {
      ok: true;
      activityId: string;
      sessionId: string | null;
      sessionTitle: string | null;
      duplicate: boolean;
    }
  | { ok: false; error: string; offline: boolean };

export function rideFile(recording: Recording, meta: RideMeta): Uint8Array {
  return rideToFit(recording, { localOffsetSeconds: meta.localOffsetSeconds });
}

/** A ride that never got its end (a closed tab) ends at its last recorded second. */
export function ended(recording: Recording): Recording {
  if (recording.endedAt !== null) return recording;
  const copy: Recording = structuredClone(recording);
  const last = copy.t.at(-1) ?? 0;
  endRecording(copy, copy.startedAt + (last + 1) * 1000, copy.laps.at(-1)?.intent ?? "steady");
  return copy;
}

export async function saveRide(recording: Recording, meta: RideMeta): Promise<SaveResult> {
  const params = new URLSearchParams();
  if (meta.sessionId) params.set("session", meta.sessionId);
  else params.set("name", meta.title);
  if (meta.intensity) {
    params.set("low", String(Math.round(meta.intensity.low * 100)));
    params.set("high", String(Math.round(meta.intensity.high * 100)));
  }
  const body = rideFile(ended(recording), meta);
  let response: Response;
  try {
    response = await fetch(`/api/rulle/ride?${params.toString()}`, {
      method: "POST",
      headers: { "content-type": "application/vnd.ant.fit" },
      body: body.slice().buffer,
    });
  } catch {
    return { ok: false, error: "offline", offline: true };
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok && typeof data.activityId === "string")
    return {
      ok: true,
      activityId: data.activityId,
      sessionId: typeof data.sessionId === "string" ? data.sessionId : null,
      sessionTitle: typeof data.sessionTitle === "string" ? data.sessionTitle : null,
      duplicate: data.duplicate === true,
    };
  // A server that cannot be reached behind a proxy answers 502–504: that is the network too.
  const offline = response.status >= 502 && response.status <= 504;
  return { ok: false, error: typeof data.error === "string" ? data.error : "generic", offline };
}
