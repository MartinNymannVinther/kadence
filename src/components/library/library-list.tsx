"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SegmentedChoice } from "@/components/ui/segmented";
import type { RiderOption } from "@/components/calendar/types";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { TemplateActions } from "./template-actions";
import type { LibraryTemplate } from "./types";

const SPORTS = ["bike", "strength", "other"] as const;
type Filter = (typeof SPORTS)[number] | "all";

/**
 * The team's library: every template, grouped by sport, narrowed to one
 * sport with a tap and found by typing part of its name. DCU's programmes
 * carry a "DCU" mark and are read-only; each row plans itself into the
 * calendar.
 */
export function LibraryList({
  templates,
  riders,
  isCoach,
  today,
}: {
  templates: LibraryTemplate[];
  riders: RiderOption[];
  isCoach: boolean;
  today: string;
}) {
  const t = useTranslations("library");
  const sports = useTranslations("training.sport");
  const duration = useTranslations("training.duration");
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = query.trim().toLowerCase();
  const shown = templates.filter(
    (tpl) =>
      (filter === "all" || tpl.sport === filter) &&
      (!q || tpl.name.toLowerCase().includes(q) || tpl.description.toLowerCase().includes(q)),
  );
  // Only the sports the library holds are worth a segment.
  const present = SPORTS.filter((sport) => templates.some((tpl) => tpl.sport === sport));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <label htmlFor={searchId} className="sr-only">
            {t("search")}
          </label>
          <Search
            aria-hidden
            className="text-meta pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            placeholder={t("search")}
            className="pl-9 max-sm:h-11"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {present.length > 1 && (
          <SegmentedChoice<Filter>
            label={t("sportFilter")}
            value={filter}
            onChange={setFilter}
            className="[&>button]:max-sm:min-h-11"
            options={[
              { value: "all", label: t("allSports") },
              ...present.map((sport) => ({
                value: sport,
                label: (
                  <span className="flex items-center gap-1.5">
                    <SportIcon sport={sport} className="size-3.5" />
                    {sports(sport)}
                  </span>
                ),
              })),
            ]}
          />
        )}
      </div>

      {shown.length === 0 && (
        <EmptyState
          title={q || filter !== "all" ? t("noMatch") : t("emptyTitle")}
          hint={q || filter !== "all" ? undefined : t("emptyBody")}
        />
      )}

      {SPORTS.map((sport) => {
        const group = shown.filter((tpl) => tpl.sport === sport);
        if (group.length === 0) return null;
        return (
          <section key={sport} aria-labelledby={`lib-${sport}`} className="flex flex-col gap-2">
            <h2 id={`lib-${sport}`} className="flex items-center gap-2 text-base font-semibold">
              <SportIcon sport={sport} />
              {sports(sport)}
              <span className="text-meta text-2sm font-normal tabular-nums">{group.length}</span>
            </h2>
            <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-[var(--surface-shadow)]">
              {group.map((tpl) => (
                <li key={tpl.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link
                      href={`/library/${tpl.id}`}
                      className="focus-ring hover:text-primary flex min-w-0 items-center gap-2 text-sm font-semibold"
                    >
                      <span className="min-w-0 break-words">{tpl.name}</span>
                      {tpl.source === "dcu" && <Badge variant="secondary">DCU</Badge>}
                      {tpl.archived && <Badge variant="outline">{t("archivedMark")}</Badge>}
                    </Link>
                    {tpl.plannedMinutes > 0 && (
                      <span className="text-meta text-xs tabular-nums">
                        {durationText(tpl.plannedMinutes, duration)}
                      </span>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-meta line-clamp-2 text-2sm leading-relaxed">
                      {tpl.description}
                    </p>
                  )}
                  <TemplateActions template={tpl} riders={riders} isCoach={isCoach} today={today} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
