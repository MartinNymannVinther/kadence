"use client";

import { useId, useState } from "react";
import { Minus, Plus, Target, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useRun } from "@/components/common/use-run";
import { dayMonth } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { GOAL_KINDS, goalShare, type GoalKind } from "@/modules/load/goals";
import {
  addDcuWinterGoalAction,
  addGoalAction,
  bumpGoalAction,
  deleteGoalAction,
} from "@/modules/training/goal-actions";

export type GoalView = {
  id: string;
  title: string;
  kind: GoalKind;
  target: number;
  done: number;
  startsOn: string;
  endsOn: string;
  source: string;
};

/**
 * A rider's process goals: each with how far it has come, as a bar and
 * a count, and its period; a goal kept by hand has +1 and −1. DCU's
 * winter strength goal is offered as one press when the rider's class has
 * one and it is not there yet; any other goal is typed in below. Process
 * before results (ADR 0013): the kinds are things done, never numbers won.
 */
export function GoalsCard({
  riderId,
  goals,
  today,
  dcuProposal,
  canWrite,
}: {
  riderId: string;
  goals: GoalView[];
  today: string;
  /** DCU's winter goal for the rider's class, when there is one and it is not added yet. */
  dcuProposal: { target: number; startsOn: string; endsOn: string } | null;
  canWrite: boolean;
}) {
  const t = useTranslations("goals");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const ids = { title: useId(), kind: useId(), target: useId(), from: useId(), to: useId() };
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<GoalKind>("bike_sessions");
  const [target, setTarget] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const unit = (g: { kind: GoalKind }, n: number) =>
    g.kind === "bike_hours"
      ? t("hours", { n: num(n, locale, 1) })
      : t("count", { n: num(n, locale) });

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        addGoalAction({
          riderId,
          title,
          kind,
          target: Number(target.replace(",", ".")),
          startsOn: from,
          endsOn: to,
          minHours: kind === "long_rides" ? 3 : null,
          note: "",
        }),
      { success: common("saved") },
    );
    if (done !== null) {
      setTitle("");
      setTarget("");
      setOpen(false);
    }
  }

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      {goals.length === 0 && <p className="text-meta text-2sm">{t("empty")}</p>}
      <ul className="flex flex-col gap-3">
        {goals.map((g) => {
          const share = goalShare(g.done, g.target);
          const reached = g.done >= g.target;
          const over = g.endsOn < today && !reached;
          return (
            <li key={g.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <Target aria-hidden className="text-primary size-4 shrink-0" />
                  <span className="truncate">{g.title}</span>
                  {g.source === "dcu" && <span className="text-meta text-xs font-normal">DCU</span>}
                </p>
                <p className="shrink-0 text-2sm tabular-nums">
                  <span className="font-semibold">{unit(g, g.done)}</span>
                  <span className="text-meta"> / {unit(g, g.target)}</span>
                </p>
              </div>
              <div className="bg-secondary h-2 overflow-hidden rounded-full" aria-hidden>
                <div
                  className={
                    reached ? "bg-primary h-full rounded-full" : "bg-chart-4 h-full rounded-full"
                  }
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              <div className="text-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>
                  {dayMonth(g.startsOn, locale)} – {dayMonth(g.endsOn, locale)}
                  {reached ? ` · ${t("reached")}` : over ? ` · ${t("over")}` : ""}
                </span>
                {canWrite && g.kind === "manual" && (
                  <span className="flex items-center gap-1">
                    {([-1, 1] as const).map((by) => (
                      <Button
                        key={by}
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={pending}
                        onClick={() =>
                          run(() => bumpGoalAction({ goalId: g.id, by }), { refresh: true })
                        }
                        aria-label={by > 0 ? t("oneMore") : t("oneLess")}
                      >
                        {by > 0 ? <Plus aria-hidden /> : <Minus aria-hidden />}
                      </Button>
                    ))}
                  </span>
                )}
                {canWrite && (
                  <ConfirmButton
                    title={t("deleteTitle")}
                    body={t("deleteBody")}
                    confirmLabel={common("delete")}
                    variant="ghost"
                    size="icon"
                    onConfirm={() => run(() => deleteGoalAction({ goalId: g.id }))}
                  >
                    <Trash2 aria-hidden />
                    <span className="sr-only">{common("delete")}</span>
                  </ConfirmButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {dcuProposal && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => addDcuWinterGoalAction({ riderId, title: t("dcuTitle") }), {
                  success: common("saved"),
                })
              }
            >
              {t("addDcu", { target: dcuProposal.target })}
            </Button>
          )}
          <Button
            type="button"
            variant={open ? "secondary" : "outline"}
            onClick={() => setOpen((o) => !o)}
          >
            {t("addOwn")}
          </Button>
        </div>
      )}
      {canWrite && dcuProposal && (
        <p className="text-meta text-xs leading-relaxed">{t("dcuBody")}</p>
      )}
      {canWrite && open && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor={ids.title} className="text-label text-xs">
              {t("field.title")}
            </label>
            <Input
              id={ids.title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.kind} className="text-label text-xs">
              {t("field.kind")}
            </label>
            <NativeSelect
              id={ids.kind}
              value={kind}
              onChange={(e) => setKind(e.target.value as GoalKind)}
            >
              {GOAL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind.${k}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.target} className="text-label text-xs">
              {t("field.target")}
            </label>
            <Input
              id={ids.target}
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.from} className="text-label text-xs">
              {t("field.from")}
            </label>
            <Input
              id={ids.from}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.to} className="text-label text-xs">
              {t("field.to")}
            </label>
            <Input
              id={ids.to}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {common("save")}
            </Button>
          </div>
        </form>
      )}
      <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
    </div>
  );
}
