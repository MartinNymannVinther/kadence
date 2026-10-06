import { notFound } from "next/navigation";
import type { z } from "zod";
import { Refused, runAction } from "@/core/action";
import type { OrgContext } from "@/core/db/tenant";
import { featureOn, type Feature } from "@/core/features";
import type { Result } from "@/core/result";

/**
 * Where a parked part of Kadence meets a request (docs/adr/0056). A page
 * behind a feature the installation has off answers 404, as if it had
 * never been built; an action behind one is refused as not found. Both
 * read the installation's flag on every request, so turning one on needs
 * a restart and nothing else.
 */

/** A page behind `feature`: 404 while the installation has it off. */
export function notFoundWithout(feature: Feature): void {
  if (!featureOn(feature)) notFound();
}

/**
 * `runAction` for a part the installation may have off: the session and
 * team are resolved and the input validated first, as for every action,
 * and then the action is refused as not found while `feature` is off.
 */
export function runFeatureAction<S extends z.ZodType, T>(
  feature: Feature,
  raw: unknown,
  schema: S,
  fn: (ctx: OrgContext, input: z.infer<S>) => Promise<T>,
  revalidate: string[] = [],
): Promise<Result<T>> {
  return runAction(
    raw,
    schema,
    (ctx, input) => {
      if (!featureOn(feature)) throw new Refused("notFound", "featureOff");
      return fn(ctx, input);
    },
    revalidate,
  );
}
