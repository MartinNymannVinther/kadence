"use client";

import { useId, useState } from "react";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import {
  archiveTeamProgramAction,
  createTeamProgramAction,
  updateTeamProgramAction,
} from "@/modules/exercises/actions";
import type { LibraryExercise } from "@/modules/exercises/library";
import * as draft from "@/modules/exercises/program-draft";
import type { DraftPart } from "@/modules/exercises/program-draft";
import { programParts } from "@/modules/exercises/view";
import { ProgramViewer } from "../program-viewer";
import { ExercisePicker } from "./exercise-picker";
import { PartEditor } from "./part-editor";

export type ProgramBuilderInitial = {
  /** The team's row when changing one; null for a new programme. */
  id: string | null;
  archived: boolean;
  name: string;
  description: string;
  parts: DraftPart[];
};

/**
 * A coach's own programme (docs/plan-ovelser-og-programmer.md): a name, a
 * line on what it is for, and parts of the day with exercises of either
 * kind — Kadence's own and the team's own — each with the exercise's dose
 * or the programme's own. Below the parts the programme shows as the
 * riders will see it, in the same viewer and at the same width. Saved
 * through the team's own actions, which check every exercise again on the
 * server.
 */
export function ProgramBuilder({
  initial,
  exercises,
}: {
  initial: ProgramBuilderInitial;
  /** Every exercise the team may use or already has in the programme, archived ones marked. */
  exercises: LibraryExercise[];
}) {
  const t = useTranslations("exercises.builder");
  const words = useTranslations("exercises");
  const router = useRouter();
  const { run, pending } = useRun();
  const ids = { name: useId(), description: useId() };
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [parts, setParts] = useState<DraftPart[]>(initial.parts);
  const [picking, setPicking] = useState<number | null>(null);
  const [problem, setProblem] = useState(false);
  const known = new Map(exercises.map((e) => [e.ref as string, e]));
  const preview = programParts(
    parts.filter((part) => part.items.length > 0),
    (ref) => known.get(ref) ?? null,
  );
  const id = initial.id;

  function change(next: (parts: DraftPart[]) => DraftPart[]) {
    setParts(next);
    setProblem(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = draft.programInput({ name, description, parts });
    if (!input) {
      setProblem(true);
      return;
    }
    if (id) {
      await run(() => updateTeamProgramAction({ ...input, programId: id }), {
        success: t("saved"),
      });
      return;
    }
    const made = await run(() => createTeamProgramAction(input), {
      success: t("created"),
      refresh: false,
    });
    if (made) router.push(`/library/programs/${made.id}`);
  }

  return (
    <form onSubmit={save} className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={ids.name} className="text-label text-xs font-medium">
          {t("name")}
        </label>
        <Input
          id={ids.name}
          required
          maxLength={60}
          value={name}
          placeholder={t("namePlaceholder")}
          className="max-sm:h-11"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={ids.description} className="text-label text-xs font-medium">
          {t("description")}
        </label>
        <Textarea
          id={ids.description}
          maxLength={300}
          rows={2}
          value={description}
          placeholder={t("descriptionPlaceholder")}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <section aria-labelledby="builder-parts" className="flex min-w-0 flex-col gap-3">
        <h2 id="builder-parts" className="text-lg font-semibold">
          {t("parts")}
        </h2>
        {parts.map((part, index) => (
          <PartEditor
            key={part.key}
            part={part}
            usedKeys={new Set(parts.filter((_, i) => i !== index).map((p) => p.key))}
            known={known}
            removable={parts.length > 1}
            onKey={(key) => change((p) => draft.setPartKey(p, index, key))}
            onRemove={() => change((p) => draft.removePart(p, index))}
            onAdd={() => setPicking(index)}
            onMove={(item, by) => change((p) => draft.moveItem(p, index, item, by))}
            onRemoveItem={(item) => change((p) => draft.removeItem(p, index, item))}
            onDose={(item, dose) => change((p) => draft.setItemDose(p, index, item, dose))}
          />
        ))}
        {draft.unusedKeys(parts).length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start max-sm:h-11"
            onClick={() => change(draft.addPart)}
          >
            <Plus data-icon="inline-start" />
            {t("addPart")}
          </Button>
        )}
      </section>
      <section aria-labelledby="builder-preview" className="flex min-w-0 flex-col gap-3">
        <h2 id="builder-preview" className="text-lg font-semibold">
          {t("preview")}
        </h2>
        {preview.length === 0 ? (
          <p className="text-meta text-2sm">{t("previewEmpty")}</p>
        ) : (
          <ProgramViewer
            // A part added or taken away starts the tabs over, so one is always shown.
            key={preview.map((part) => part.key).join()}
            program={{ title: name, description, parts: preview }}
          />
        )}
      </section>
      {problem && (
        <p role="alert" className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm">
          {t("missing")}
        </p>
      )}
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
              run(() => archiveTeamProgramAction({ programId: id, archived: !initial.archived }), {
                success: initial.archived
                  ? words("library.restoredDone")
                  : words("library.archivedDone"),
              })
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
      {picking !== null && parts[picking] && (
        <ExercisePicker
          open
          onOpenChange={(open) => !open && setPicking(null)}
          exercises={exercises}
          partName={words(`parts.${parts[picking]!.key}`)}
          onPick={(ref) => change((p) => draft.addItem(p, picking, ref))}
        />
      )}
    </form>
  );
}
