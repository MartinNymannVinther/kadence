"use client";

import { useTranslations } from "next-intl";
import { resolveStrengthSession, type StrengthStructure } from "@/modules/workouts/structure";

/**
 * A strength session to do: the warm-up, and the exercises as they are
 * done at this point in the programme — the progression resolved for the
 * session's number, "Session 7 af programmet: 3 × 12". A template, which
 * has no number, shows the progression itself.
 */
export function StrengthView({
  structure,
  programmeSession,
}: {
  structure: StrengthStructure;
  programmeSession: number | null;
}) {
  const t = useTranslations("workouts.view");
  const groups = useTranslations("workouts.group");
  const exercises = programmeSession
    ? resolveStrengthSession(structure, programmeSession)
    : structure.exercises;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {programmeSession && (
        <p className="bg-accent/60 text-accent-foreground rounded-md px-3 py-2 text-2sm font-medium">
          {t("programmeSession", { n: programmeSession })}
        </p>
      )}
      {structure.warmup && (
        <p className="text-2sm leading-relaxed">
          <span className="font-medium">{t("warmup")}</span> {structure.warmup}
        </p>
      )}
      <ol className="border-border divide-hairline bg-card flex flex-col divide-y rounded-lg border">
        {exercises.map((exercise, i) => (
          <li
            key={i}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-2sm font-medium">{exercise.name}</span>
              <span className="text-meta text-xs">
                {groups(exercise.group)}
                {exercise.restSeconds ? ` · ${t("rest", { seconds: exercise.restSeconds })}` : ""}
                {exercise.note ? ` · ${exercise.note}` : ""}
              </span>
            </span>
            <span className="text-2sm font-semibold tabular-nums">
              {t("setsReps", { sets: exercise.sets, reps: exercise.reps })}
              {exercise.load ? (
                <span className="text-meta font-normal"> · {exercise.load}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {!programmeSession && structure.progression.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-2sm font-medium">{t("progression")}</p>
          <ul className="text-meta flex flex-col gap-0.5 text-xs">
            {structure.progression.map((rule, i) => (
              <li key={i}>
                {t("rule", {
                  group: groups(rule.group),
                  from: rule.from,
                  to: rule.to ?? "",
                  open: rule.to === null ? "yes" : "no",
                  sets: rule.sets,
                  reps: rule.reps,
                })}
                {rule.load ? ` · ${rule.load}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
