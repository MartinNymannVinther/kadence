import { field, payload } from "@/core/jobs/payload";
import { jobKind } from "@/core/jobs/registry";

/**
 * The line the readings from Cykling Danmark wait in (ADR 0039), as jobs
 * (docs/adr/0085). It used to be a list in one process's memory, lost in
 * a restart and kept separately by every instance; now each reading is a
 * row in `jobs`, taken by the worker.
 *
 * A coach's visit, a calendar or a rider's page, and the hourly job put a
 * team's stale riders in it (refresh.ts); a rider's visit puts in their
 * own (own.ts). A rider already waiting is not put in twice: the key is
 * the rider for a coach's reading and the person for their own. Readings
 * put in together are spaced ten seconds apart, as the line spaced them;
 * what holds across the installation — one reading per rider at a time,
 * six pages a minute — is counted with the counters (read.ts), and a
 * reading that finds the minute's six taken is put back for ten seconds
 * rather than dropped (jobs.ts).
 *
 * The payload is whose reading it is and as whom: ids and a word. Imports
 * nothing but the job's own kernel, so it is tested on its own.
 */

/** Readings put in together are this far apart. */
export const GAP_MS = 10_000;

export const dcuReadRider = jobKind(
  "dcu.read_rider",
  payload({
    /** A coach's reading of a rider, or a rider's of their own. */
    as: field.word(["coach", "rider"]),
    /** The person the reading runs as. */
    userId: field.id(),
    /** The rider, for a coach's reading. */
    riderId: field.id().optional(),
  }),
  // The page is fetched with its own deadline; a minute is plenty.
  { team: true, timeoutMs: 60_000 },
);

/** The dedupe key: one waiting reading per rider for coaches, per person for their own. */
export function readKey(reading: { as: "coach" | "rider"; userId: string; riderId?: string }) {
  return reading.as === "coach" ? `coach:${reading.riderId}` : `rider:${reading.userId}`;
}

/** How long after now the `index`th of readings put in together is due. */
export function spacedBy(index: number): number {
  return Math.max(0, index) * GAP_MS;
}
