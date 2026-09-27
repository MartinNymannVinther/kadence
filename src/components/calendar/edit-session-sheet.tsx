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
import type { CalendarCard } from "./types";

/**
 * Changing a planned session: the same builder as when it was written.
 * A coach changing a group's session chooses this rider's copy or every
 * copy nobody has done yet — write once, and it applies to them all.
 */
export function EditSessionSheet({
  open,
  onOpenChange,
  session,
  groupChoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarCard;
  groupChoice: boolean;
}) {
  const t = useTranslations("calendar.edit");
  const problems = useTranslations("workouts.problem");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const [draft, setDraft] = useState(() => newDraft(session));
  const [scope, setScope] = useState<"one" | "group">("group");
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
          scope: groupChoice ? scope : "one",
          templateId: session.templateId,
          ...checked.value,
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
          <SessionFields draft={draft} onChange={setDraft} showKm />
          {groupChoice && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">{t("scope")}</legend>
              {(["group", "one"] as const).map((value) => (
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
