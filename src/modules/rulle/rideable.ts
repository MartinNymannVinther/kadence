import { readStructure, type BikeStructure } from "@/modules/workouts/structure";

/**
 * The steps Rulle rides for a planned session: a bike session with at
 * least one step. A strength session, a ride written only as words, or a
 * bike session without steps has nothing to put on the trainer, and is
 * ticked off the ordinary way. Pure.
 */
export function rideableStructure(sport: string, structure: unknown): BikeStructure | null {
  if (sport !== "bike") return null;
  const read = readStructure(structure, "bike");
  return read.kind === "bike" && read.steps.length > 0 ? read : null;
}
