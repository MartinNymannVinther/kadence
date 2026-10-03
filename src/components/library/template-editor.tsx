"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { problemText } from "@/components/workouts/problem-text";
import { checkDraft, newDraft } from "@/components/workouts/session-draft";
import { SessionFields } from "@/components/workouts/session-fields";
import { WorkoutSummary } from "@/components/workouts/workout-summary";
import { useRouter } from "@/i18n/navigation";
import { createTemplateAction, updateTemplateAction } from "@/modules/training/actions";

/**
 * A template written or changed in the library, with the same builder the
 * calendar uses, and on a wide screen the session at a glance beside it
 * (ADR 0044). Checked against the shared schema before it is sent; a new
 * one opens on its own page once saved, on the sport it was asked for.
 */
export function TemplateEditor({
  template,
  sport,
  assistOpen = false,
  riderId,
  assist = true,
}: {
  /** A rider's own session (ADR 0050); absent for the team's library. */
  riderId?: string;
  /** "Byg med AI" is a coach's (ADR 0038). */
  assist?: boolean;
  /** The sport a new template starts on. */
  sport?: "bike" | "strength";
  /** "Byg med AI" open on arrival (`?ai=1`). */
  assistOpen?: boolean;
  template?: {
    id: string;
    name: string;
    sport: string;
    description: string;
    structure: unknown;
  };
}) {
  const t = useTranslations("library.editor");
  const problems = useTranslations("workouts.problem");
  const common = useTranslations("common");
  const router = useRouter();
  const { run, pending } = useRun();
  const [draft, setDraft] = useState(() => {
    if (template) return newDraft({ ...template, title: template.name });
    const draft = newDraft();
    return sport ? { ...draft, sport } : draft;
  });
  const [problem, setProblem] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const checked = checkDraft(draft);
    if (!checked.ok) {
      setProblem(problemText(checked.problem, draft.structures[draft.sport], problems));
      return;
    }
    setProblem(null);
    const { title, plannedKm: _km, ...rest } = checked.value;
    const input = { name: title, ...rest, ...(riderId ? { riderId } : {}) };
    if (template) {
      await run(() => updateTemplateAction({ templateId: template.id, ...input }), {
        success: common("saved"),
      });
      return;
    }
    const created = await run(() => createTemplateAction(input), {
      success: t("created"),
      refresh: false,
    });
    if (created) router.push(`/library/${created.id}`);
  }

  return (
    <form
      onSubmit={save}
      className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-6"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <SessionFields
          draft={draft}
          onChange={setDraft}
          assist={assist}
          assistOpen={assist && assistOpen}
        />
      </div>
      <div className="max-lg:hidden lg:row-span-3">
        <div className="sticky top-6">
          <WorkoutSummary structure={draft.structures[draft.sport]} />
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      )}
      <div className="bg-background/95 sticky bottom-0 -mx-5 flex gap-2 border-t px-5 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button type="submit" disabled={pending} className="max-sm:h-11 max-sm:flex-1">
          {template ? common("save") : t("create")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="max-sm:h-11"
          onClick={() => router.push("/library")}
        >
          {common("cancel")}
        </Button>
      </div>
    </form>
  );
}
