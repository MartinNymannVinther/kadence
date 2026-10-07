"use client";

import { useReducer, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import {
  archiveTeamExerciseAction,
  createTeamExerciseAction,
  updateTeamExerciseAction,
} from "@/modules/exercises/actions";
import { poseHistory } from "@/modules/exercises/pose-history";
import { EQUIPMENT, type Dose, type ExerciseView, type Pose } from "@/modules/exercises/types";
import { ExerciseCard } from "../exercise-card";
import { DoseFields } from "./dose-fields";
import { ExerciseFields, type ExerciseWords } from "./exercise-fields";
import { PoseEditor } from "./pose-editor";

/** An exercise as the form starts from: a new one, a copy, or the team's own to change. */
export type ExerciseDraft = ExerciseWords & {
  /** The team's row, when changing one; null for a new exercise. */
  id: string | null;
  archived: boolean;
  dose: Dose;
  pose: Pose;
};

/**
 * A coach's own exercise, whole: the drawing, the words and the dose,
 * with the card it becomes beside them as it changes. Saved through the
 * team's own actions, which apply the contract again on the server
 * (src/modules/exercises/actions.ts); a new one opens on its own page.
 */
export function ExerciseForm({ initial }: { initial: ExerciseDraft }) {
  const t = useTranslations("exercises.editor");
  const router = useRouter();
  const { run, pending } = useRun();
  const [words, setWords] = useState<ExerciseWords>(() => ({
    name: initial.name,
    group: initial.group,
    equipment: initial.equipment,
    how: initial.how,
    why: initial.why,
  }));
  const [dose, setDose] = useState<Dose>(initial.dose);
  const [history, dispatch] = useReducer(poseHistory, { pose: initial.pose, past: [] });
  const id = initial.id;

  const preview: ExerciseView = {
    ref: id ? `team:${id}` : "builtin:preview",
    name: words.name.trim() || t("untitled"),
    how: words.how,
    why: words.why,
    group: words.group,
    equipment: words.equipment,
    dose,
    pose: history.pose,
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const draft = { ...words, dose, pose: history.pose };
    if (id) {
      await run(() => updateTeamExerciseAction({ ...draft, exerciseId: id }), {
        success: t("saved"),
      });
      return;
    }
    const made = await run(() => createTeamExerciseAction(draft), {
      success: t("created"),
      refresh: false,
    });
    if (made) router.push(`/library/exercises/${made.id}`);
  }

  return (
    <form
      onSubmit={save}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="exercise-drawing" className="flex min-w-0 flex-col gap-2">
          <h2 id="exercise-drawing" className="text-lg font-semibold">
            {t("drawing")}
          </h2>
          <PoseEditor
            history={history}
            dispatch={dispatch}
            onPropAdded={(kind) => {
              const item = EQUIPMENT.find((e) => e === kind);
              if (item && !words.equipment.includes(item))
                setWords({
                  ...words,
                  equipment: EQUIPMENT.filter((e) => e === item || words.equipment.includes(e)),
                });
            }}
          />
        </section>
        <section aria-labelledby="exercise-details" className="flex min-w-0 flex-col gap-3">
          <h2 id="exercise-details" className="text-lg font-semibold">
            {t("details")}
          </h2>
          <ExerciseFields value={words} onChange={setWords} />
          <DoseFields value={dose} onChange={setDose} legend={t("dose")} />
        </section>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} className="max-sm:h-11">
            {t("save")}
          </Button>
          {id && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="max-sm:h-11"
              onClick={() =>
                run(
                  () => archiveTeamExerciseAction({ exerciseId: id, archived: !initial.archived }),
                  { success: initial.archived ? t("restored") : t("archived") },
                )
              }
            >
              {initial.archived ? (
                <ArchiveRestore data-icon="inline-start" />
              ) : (
                <Archive data-icon="inline-start" />
              )}
              {initial.archived ? t("restore") : t("archive")}
            </Button>
          )}
        </div>
      </div>
      <aside
        aria-labelledby="exercise-preview"
        className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-6"
      >
        <h2 id="exercise-preview" className="text-lg font-semibold">
          {t("preview")}
        </h2>
        <ExerciseCard exercise={preview} />
      </aside>
    </form>
  );
}
