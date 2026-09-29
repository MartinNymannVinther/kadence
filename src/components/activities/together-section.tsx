import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Companion } from "@/modules/training/companions";

/**
 * "Kørt sammen": the teammates whose ride was this one — a race, a group
 * ride — each linked to their own ride, and the way to see all the curves
 * over each other. Only where there is a match; a rider, who sees no
 * teammate's ride, never sees this (ADR 0011).
 */
export async function TogetherSection({
  activityId,
  companions,
}: {
  activityId: string;
  companions: Companion[];
}) {
  const t = await getTranslations("activities.together");
  const sports = await getTranslations("training.sport");
  if (companions.length === 0) return null;
  const ids = [activityId, ...companions.map((c) => c.activity.id)].join(",");
  return (
    <section aria-labelledby="activity-together" className="flex flex-col gap-3">
      <h2 id="activity-together" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="text-meta text-2sm leading-relaxed">
        {t("body", { count: companions.length })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {companions.map((c) => (
          <li key={c.activity.id}>
            <Link
              href={`/activities/${c.activity.id}`}
              className="focus-ring border-border bg-card hover:border-primary flex min-h-11 items-center gap-2 rounded-md border px-3 text-2sm sm:min-h-9"
            >
              {c.riderName}
              <span className="text-meta text-xs">
                {c.activity.title || sports(c.activity.sport as "bike")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/activities/${activityId}/compare?with=${ids}`}
        className={cn(buttonVariants({ variant: "outline" }), "w-fit max-sm:h-11")}
      >
        <Users data-icon="inline-start" />
        {t("compare")}
      </Link>
    </section>
  );
}
