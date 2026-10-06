"use client";

import { Sparkle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { createTeamSeasonPlansAction } from "@/modules/season/actions";
import type { TeamPlanGaps } from "@/modules/season/team-plans";

/**
 * "Opret sæsonplaner for alle uden en plan" on the season's "Hele holdet":
 * one press gives every rider without a plan one for their own class and
 * year, from DCU or empty as the team plans. Says how many it made; a
 * rider outside DCU's classes is planned on their own page.
 */
export function TeamPlans({
  gaps,
  seasonStartYear,
  guided,
}: {
  gaps: TeamPlanGaps;
  seasonStartYear: number;
  /** Whether the team plans by DCU (ADR 0049); without, the plans start empty. */
  guided: boolean;
}) {
  const t = useTranslations("season.teamPlans");
  const season = `${seasonStartYear}/${String(seasonStartYear + 1).slice(2)}`;
  const { run, pending } = useRun();
  if (gaps.missing === 0 && gaps.noClass === 0) return null;

  async function create() {
    const done = await run(() => createTeamSeasonPlansAction({ seasonStartYear }));
    if (done) toast.success(t("created", { count: done.created }));
  }

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      {gaps.missing > 0 && (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{t("missing", { count: gaps.missing, season })}</p>
            <p className="text-meta text-2sm leading-relaxed">
              {guided ? t("body") : t("bodyOwn")}
            </p>
          </div>
          <Button
            type="button"
            className="self-start max-sm:h-11"
            disabled={pending}
            onClick={() => void create()}
          >
            <Sparkle data-icon="inline-start" />
            {t("button")}
          </Button>
        </>
      )}
      {gaps.noClass > 0 && (
        <p className="text-meta text-xs leading-relaxed">{t("noClass", { count: gaps.noClass })}</p>
      )}
    </div>
  );
}
