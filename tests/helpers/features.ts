import type * as Real from "@/core/features";

/**
 * The installation's features as a test sets them (docs/adr/0056). The
 * suite runs with all of them off, as a new installation has them; a test
 * file that exercises a parked part turns it on with this, hoisted so the
 * mock sees it:
 *
 *   const on = vi.hoisted(() => new Set<string>(["coachesRoom"]));
 *   vi.mock("@/core/features", async (importOriginal) =>
 *     (await import("../helpers/features")).featuresWith(await importOriginal(), on),
 *   );
 *
 * and may add to or delete from `on` between tests.
 */
export function featuresWith(real: typeof Real, on: Set<string>): typeof Real {
  const features = (): Real.Features =>
    Object.fromEntries(real.FEATURES.map((f) => [f, on.has(f)])) as Real.Features;
  return { ...real, features, featureOn: (feature: Real.Feature) => on.has(feature) };
}
