import type { RiderRow } from "@/core/db/schema";
import { classFor, isClassBasis, type RiderClass } from "@/modules/dcu";

/**
 * A rider's DCU class in a season: from the birth year, unless a coach
 * has moved the rider (`category_override`, a class-and-year like
 * "U19-1", or "senior"). Pure.
 */
export function riderClass(
  rider: Pick<RiderRow, "birthYear" | "categoryOverride">,
  seasonStartYear: number,
): RiderClass {
  const override = rider.categoryOverride;
  if (override === "senior") return { category: "senior", yearInClass: null, basis: null };
  return classFor(
    rider.birthYear,
    seasonStartYear,
    override && isClassBasis(override) ? override : null,
  );
}
