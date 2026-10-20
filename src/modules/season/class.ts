import type { RiderRow } from "@/core/db/schema";
import { classFor, isClassBasis, type RiderClass } from "@/modules/dcu";
import { seniorBasisOf, type PlanBasis } from "@/modules/paradigms";

/** A rider's class with the basis a plan is read for: DCU's class-year, or a senior's profile. */
export type PlanClass = Omit<RiderClass, "basis"> & { basis: PlanBasis | null };

/**
 * A rider's class in a season: from the birth year, unless a coach
 * has moved the rider (`category_override`, a class-and-year like
 * "U19-1", or "senior"). A senior plans from their training profile,
 * Motionist when none is chosen (docs/adr/0091); a youth rider has no
 * basis. Pure.
 */
export function riderClass(
  rider: Pick<RiderRow, "birthYear" | "categoryOverride"> & { trainingProfile?: string | null },
  seasonStartYear: number,
): PlanClass {
  const override = rider.categoryOverride;
  const klass: RiderClass =
    override === "senior"
      ? { category: "senior", yearInClass: null, basis: null }
      : classFor(
          rider.birthYear,
          seasonStartYear,
          override && isClassBasis(override) ? override : null,
        );
  return klass.category === "senior"
    ? { ...klass, basis: seniorBasisOf(rider.trainingProfile) }
    : klass;
}

/** Whether the rider is past U23 in the season, so a training profile applies. */
export function isSeniorIn(
  rider: Pick<RiderRow, "birthYear" | "categoryOverride">,
  seasonStartYear: number,
): boolean {
  return riderClass(rider, seasonStartYear).category === "senior";
}
