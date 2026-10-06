"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStored } from "@/components/common/use-stored";
import { cn } from "@/lib/utils";

/**
 * "Mere data" on a ride's page (docs/adr/0063): the numbers, curves,
 * laps, climbs, zones and power curve behind the four that come first.
 * Opened or closed, it stays that way for this person on this device; a
 * coach starts with it open, a rider with it closed. What is inside is
 * mounted only when open, so a map or a chart never draws into a box of
 * no size.
 */
export function MoreData({
  userId,
  defaultOpen,
  children,
}: {
  userId: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("activities.more");
  const panel = useId();
  const [stored, setStored] = useStored(`kadence.activity.more.${userId}`);
  const open = stored === "open" ? true : stored === "closed" ? false : defaultOpen;

  return (
    <section aria-label={t("title")} className="flex flex-col gap-7">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setStored(open ? "closed" : "open")}
        className="focus-ring border-border bg-card hover:bg-secondary/60 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left shadow-surface transition-colors duration-[120ms]"
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{t("title")}</span>
          <span className="text-meta text-2sm">{t("body")}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("text-meta size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      <div id={panel} className="flex flex-col gap-7" hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}
