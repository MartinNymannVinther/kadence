"use client";

import { useId, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bulkInviteAction } from "@/modules/team/actions";
import type { CreatedLine } from "@/modules/team/bulk-invite";
import {
  parseTeamList,
  TEXT_MAX,
  type LineProblem,
  type ListProblemCode,
} from "@/modules/team/bulk-parse";
import { BulkFormat } from "./bulk-format";
import { BulkPreview } from "./bulk-preview";
import { BulkResult } from "./bulk-result";

type Refusal = { problems: LineProblem[]; listProblem: ListProblemCode | null; for: string };

/**
 * "Inviter hele holdet" (ADR 0064): the coach pastes the team, sees what
 * will be created and what must be fixed, and creates it all at once —
 * or nothing, if anything is off. Afterwards each person's link, with
 * "Del". The browser reads the list for the preview; the server reads it
 * again, checks it against the team and decides.
 */
export function BulkInviteDialog({ team, today }: { team: string; today: string }) {
  const t = useTranslations("riders.bulk");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const listId = useId();
  const yearId = useId();
  const formatId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [year, setYear] = useState("");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [created, setCreated] = useState<CreatedLine[] | null>(null);

  const thisYear = new Date().getFullYear();
  const sharedYear = year.trim() === "" ? null : Number(year);
  const parsed = useMemo(
    () => parseTeamList(text, { sharedYear, thisYear }),
    [text, sharedYear, thisYear],
  );
  // The server's answer holds for the list it was given, until it changes.
  const asked = `${sharedYear ?? ""}\n${text}`;
  const server = refusal?.for === asked ? refusal : null;
  const problems = [...parsed.problems, ...(server?.problems ?? [])];
  const listProblem = parsed.listProblem ?? server?.listProblem ?? null;
  const ready = !pending && !listProblem && problems.length === 0 && parsed.lines.length > 0;

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setText("");
      setYear("");
      setRefusal(null);
      setCreated(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const outcome = await run(() => bulkInviteAction({ text, sharedYear }));
    if (!outcome) return;
    if (outcome.done) setCreated(outcome.lines);
    else setRefusal({ problems: outcome.problems, listProblem: outcome.listProblem, for: asked });
  }

  return (
    <>
      <Button variant="outline" className="max-sm:h-11" onClick={() => setOpen(true)}>
        <Users data-icon="inline-start" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-2xl">
          {created ? (
            <BulkResult lines={created} team={team} onDone={() => reset(false)} />
          ) : (
            <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("body")}</DialogDescription>
              </DialogHeader>
              <BulkFormat id={formatId} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor={listId} className="text-sm font-medium">
                  {t("listLabel")}
                </label>
                <Textarea
                  id={listId}
                  value={text}
                  rows={8}
                  maxLength={TEXT_MAX}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={t("placeholder")}
                  aria-describedby={formatId}
                  className="min-h-40 font-mono text-xs md:text-xs"
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={yearId} className="text-sm font-medium">
                  {t("sharedYear")}{" "}
                  <span className="text-meta font-normal">({common("optional")})</span>
                </label>
                <Input
                  id={yearId}
                  type="number"
                  inputMode="numeric"
                  value={year}
                  className="w-32 max-sm:h-11"
                  onChange={(e) => setYear(e.target.value)}
                />
                <p className="text-meta text-xs">{t("sharedYearHint")}</p>
              </div>
              {text.trim() !== "" && (
                <BulkPreview
                  parsed={parsed}
                  problems={problems}
                  listProblem={listProblem}
                  text={text}
                  today={today}
                  thisYear={thisYear}
                />
              )}
              <DialogFooter>
                <Button type="submit" disabled={!ready} className="max-sm:h-11">
                  {t("submit", { count: parsed.lines.length })}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="max-sm:h-11"
                  onClick={() => reset(false)}
                >
                  {common("cancel")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
