"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useRun } from "@/components/common/use-run";
import { GarminLine } from "@/components/devices/garmin-attribution";
import { ComplianceMark } from "@/components/training/compliance-mark";
import { dayMonth, dayMonthYear, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { rideNameText } from "@/modules/activities/ride-name";
import { moreOwnRidesAction } from "@/modules/training/own-ride-actions";
import type { OwnRide, OwnRidesPage } from "@/modules/training/own-rides";

/**
 * "Dine ture": the rider's own rides, the newest first — the day, the
 * ride's telling name (docs/adr/0098), how long and how far, and how close it came to the plan in the
 * calendar's colours with an icon and a word beside each. Every ride
 * links to its own page. "Vis flere" fetches the next twenty after the
 * last one shown (src/modules/training/own-rides.ts).
 */
export function OwnRidesList({ first, today }: { first: OwnRidesPage; today: string }) {
  const t = useTranslations("me.rides");
  const names = useTranslations("activities.names");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const { run, pending } = useRun();
  const [rides, setRides] = useState<OwnRide[]>(first.rides);
  const [next, setNext] = useState(first.next);

  async function more() {
    if (!next) return;
    const page = await run(() => moreOwnRidesAction({ before: next }), { refresh: false });
    if (!page) return;
    // A ride already shown is never listed twice, even after an upload in between.
    setRides((shown) => [...shown, ...page.rides.filter((r) => !shown.some((s) => s.id === r.id))]);
    setNext(page.next);
  }

  if (rides.length === 0) return <p className="text-meta text-2sm">{t("empty")}</p>;
  const thisYear = today.slice(0, 4);

  return (
    <div className="flex flex-col gap-3">
      <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
        {rides.map((ride) => {
          const title = rideNameText(ride.name, names);
          const day =
            ride.onDate.slice(0, 4) === thisYear
              ? dayMonth(ride.onDate, locale)
              : dayMonthYear(ride.onDate, locale);
          return (
            <li key={ride.id}>
              <Link
                href={`/activities/${ride.id}`}
                className="focus-ring hover:bg-accent/40 grid min-h-14 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 first:rounded-t-xl last:rounded-b-xl"
              >
                <span className="flex flex-col text-2sm leading-tight">
                  <span className="font-semibold first-letter:uppercase">
                    {weekdayShort(ride.onDate, locale)}
                  </span>
                  <span className="text-meta text-xs">{day}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-2sm font-medium">
                    <SportIcon sport={ride.sport} className="size-3.5 shrink-0" />
                    <span className="truncate">{title}</span>
                  </span>
                  <GarminLine line={ride.attribution} className="break-words" />
                  <span className="text-meta text-xs tabular-nums">
                    {[
                      durationText(ride.movingSeconds / 60, duration),
                      ride.distanceM ? t("km", { km: num(ride.distanceM / 1000, locale, 1) }) : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <ComplianceMark colour={ride.colour} done compact />
                  <ChevronRight aria-hidden className="text-meta size-4" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {next && (
        <Button
          type="button"
          variant="outline"
          className="w-fit max-sm:h-11"
          disabled={pending}
          onClick={() => void more()}
        >
          {t("more")}
        </Button>
      )}
    </div>
  );
}
