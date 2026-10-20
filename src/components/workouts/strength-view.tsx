"use client";

import { useTranslations } from "next-intl";
import type { ExerciseView } from "@/modules/exercises/types";
import { resolveStrengthSession, type StrengthStructure } from "@/modules/workouts/structure";
import { StrengthExercise } from "./strength-exercise";

/**
 * A strength session to do: the warm-up, and the exercises as they are
 * done at this point in the programme — the progression resolved for the
 * session's number, "Session 7 af programmet: 3 × 12". A template, which
 * has no number, shows the progression itself. An exercise laid in from a
 * programme shows its figure and how-to when `exercises` has it.
 */
export function StrengthView({
  structure,
  programmeSession,
  exercises: views = {},
}: {
  structure: StrengthStructure;
  programmeSession: number | null;
  /** The library's exercises the session names, by reference. */
  exercises?: Readonly<Record<string, ExerciseView>>;
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
          <StrengthExercise
            key={i}
            exercise={exercise}
            view={exercise.ref ? views[exercise.ref] : undefined}
          />
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
