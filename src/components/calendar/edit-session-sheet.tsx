"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { newDraft, checkDraft } from "@/components/workouts/session-draft";
import { problemText } from "@/components/workouts/problem-text";
import { SessionFields } from "@/components/workouts/session-fields";
import { updateSessionAction } from "@/modules/training/actions";
import type { Scope } from "@/modules/training/vocabulary";
import { TimePlaceFields, timePlaceDraft, timePlaceValue } from "./time-place-fields";
import type { CalendarCard } from "./types";

/** The widest first: the group, then the series from here, then this copy alone. */
const ORDER: Record<Scope, number> = { group: 0, series: 1, one: 2 };

/**
 * Changing a planned session: the same builder as when it was written.
 * A coach changing a group's session chooses this rider's copy or every
 * copy nobody has done yet — write once, and it applies to them all; a
 * session in a series can take the coming copies with it (ADR 0041). The
 * time and the place go as far as the rest of the change (ADR 0058). A
 * done session's plan can be put right too, and the sheet says what was
 * done is then compared with the new plan.
 */
export function EditSessionSheet({
  open,
  onOpenChange,
  session,
  scopes,
  isCoach,
  done = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarCard;
  /** What the change may reach; one choice means no question. */
  scopes: Scope[];
  /** "Byg med AI" is a coach's (ADR 0038). */
  isCoach: boolean;
  /** The session is done: an activity is on it. */
  done?: boolean;
}) {
  const t = useTranslations("calendar.edit");
  const problems = useTranslations("workouts.problem");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const [draft, setDraft] = useState(() => newDraft(session));
  const [at, setAt] = useState(() => timePlaceDraft(session));
  // A group's change reaches the group unless the coach says otherwise; a
  // series' only this copy unless asked.
  const [scope, setScope] = useState<Scope>(scopes.includes("group") ? "group" : "one");
  const [problem, setProblem] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const checked = checkDraft(draft);
    if (!checked.ok) {
      setProblem(problemText(checked.problem, draft.structures[draft.sport], problems));
      return;
    }
    setProblem(null);
    const done = await run(
      () =>
        updateSessionAction({
          sessionId: session.id,
          scope,
          templateId: session.templateId,
          ...checked.value,
          ...timePlaceValue(at),
        }),
      { success: common("saved") },
    );
    if (done !== null) onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-2xl">
        <form onSubmit={save} className="flex flex-col gap-5 p-5 pt-12 sm:p-6">
          <SheetTitle className="text-lg font-semibold">{t("title")}</SheetTitle>
          {done && <p className="text-muted-foreground -mt-3 text-sm">{t("done")}</p>}
          <TimePlaceFields value={at} onChange={setAt} />
          <SessionFields draft={draft} onChange={setDraft} showKm assist={isCoach} />
          {scopes.length > 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">{t("scope")}</legend>
              {[...scopes]
                .sort((a, b) => ORDER[a] - ORDER[b])
                .map((value) => (
                  <label
                    key={value}
                    className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="edit-scope"
                      className="accent-primary"
                      checked={scope === value}
                      onChange={() => setScope(value)}
                    />
                    {t(`scopes.${value}`)}
                  </label>
                ))}
            </fieldset>
          )}
          {problem && (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}
          <div className="bg-background sticky bottom-0 -mx-5 flex gap-2 border-t px-5 py-3 sm:-mx-6 sm:px-6">
            <Button type="submit" disabled={pending} className="max-sm:h-11 max-sm:flex-1">
              {common("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="max-sm:h-11"
              onClick={() => onOpenChange(false)}
            >
              {common("cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
