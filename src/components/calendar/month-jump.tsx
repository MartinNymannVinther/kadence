"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { mondayOf } from "@/core/dates";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * "Go to": a year with arrows and its twelve months, each a link to the
 * week the month starts in — so August is two clicks away, not six weeks
 * of arrows. Links, like the week arrows: the back button knows them.
 * `weekHref` is the calendar's address with `__WEEK__` where the week
 * goes, keeping the rider and view already chosen.
 */
export function MonthJump({
  monday,
  today,
  weekHref,
}: {
  monday: string;
  today: string;
  weekHref: string;
}) {
  const t = useTranslations("calendar.nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(monday.slice(0, 4)));
  const shown = monday.slice(0, 7);
  const now = today.slice(0, 7);
  const monthName = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    month: "short",
    timeZone: "UTC",
  });

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setYear(Number(monday.slice(0, 4)));
      }}
    >
      <Popover.Trigger
        className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
        aria-label={t("jump")}
      >
        <CalendarDays aria-hidden />
        <span className="max-sm:sr-only">{t("jump")}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="border-border bg-popover text-popover-foreground w-72 rounded-xl border p-3 shadow-lg outline-none">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setYear((y) => y - 1)}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9")}
                aria-label={t("previousYear")}
              >
                <ChevronLeft />
              </button>
              <Popover.Title className="text-base font-semibold tabular-nums">{year}</Popover.Title>
              <button
                type="button"
                onClick={() => setYear((y) => y + 1)}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9")}
                aria-label={t("nextYear")}
              >
                <ChevronRight />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, m) => {
                const month = `${year}-${String(m + 1).padStart(2, "0")}`;
                const week = mondayOf(`${month}-01`);
                const current = month === shown;
                return (
                  <li key={month}>
                    <Link
                      href={weekHref.replace("__WEEK__", week)}
                      onClick={() => setOpen(false)}
                      aria-current={current ? "date" : undefined}
                      className={cn(
                        "focus-ring flex min-h-11 items-center justify-center rounded-md text-sm capitalize",
                        current
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-accent",
                        month === now && !current && "ring-primary ring-1 ring-inset",
                      )}
                    >
                      {monthName.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
