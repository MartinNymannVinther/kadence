"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { COMPOSE_MAX_ITEMS, encodeComposition } from "@/modules/exercises/compose";
import {
  PART_KEYS,
  type Dose,
  type PartKey,
  type ProgramPart,
  type ProgramView,
} from "@/modules/exercises/types";
import { builtinLookup, programParts } from "@/modules/exercises/view";
import { ComposerBuilder } from "./composer-builder";
import { ComposerLibrary } from "./composer-library";
import { DownloadActions } from "./download-actions";
import { ProgramViewer } from "./program-viewer";

/**
 * "Sammensæt dit eget" (docs/plan-ovelser-og-programmer.md): a programme
 * built from the library, held in this component's own state for a
 * responsive phone and written out to the `c` query parameter shortly
 * after each change, so the whole thing lives in the URL and nothing is
 * stored about anyone. `initial` is what the page decoded from the link
 * that opened it, or an empty start.
 */
export function ProgramComposer({ initial }: { initial: ProgramPart[] }) {
  const t = useTranslations("exercises");
  const tc = useTranslations("exercises.compose");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [parts, setParts] = useState<ProgramPart[]>(initial);
  const [currentPart, setCurrentPart] = useState<PartKey>("any");

  const totalItems = parts.reduce((sum, part) => sum + part.items.length, 0);
  const atCap = totalItems >= COMPOSE_MAX_ITEMS;

  useEffect(() => {
    const encoded = encodeComposition(parts);
    const timer = setTimeout(() => {
      const query = new URLSearchParams();
      if (encoded) query.set("c", encoded);
      else query.set("compose", "1");
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [parts, pathname, router]);

  function addExercise(id: string) {
    setParts((prev) => {
      const index = prev.findIndex((part) => part.key === currentPart);
      if (index === -1)
        return [...prev, { key: currentPart, items: [{ exercise: `builtin:${id}` }] }];
      const part = prev[index]!;
      if (part.items.length >= 20) return prev;
      const next = [...prev];
      next[index] = { ...part, items: [...part.items, { exercise: `builtin:${id}` }] };
      return next;
    });
  }

  function removeItem(partIndex: number, itemIndex: number) {
    setParts((prev) => {
      const part = prev[partIndex]!;
      const items = part.items.filter((_, i) => i !== itemIndex);
      const next = [...prev];
      if (items.length === 0) next.splice(partIndex, 1);
      else next[partIndex] = { ...part, items };
      return next;
    });
  }

  function moveItem(partIndex: number, itemIndex: number, direction: -1 | 1) {
    setParts((prev) => {
      const part = prev[partIndex]!;
      const target = itemIndex + direction;
      if (target < 0 || target >= part.items.length) return prev;
      const items = [...part.items];
      [items[itemIndex], items[target]] = [items[target]!, items[itemIndex]!];
      const next = [...prev];
      next[partIndex] = { ...part, items };
      return next;
    });
  }

  function changeDose(partIndex: number, itemIndex: number, dose: Dose) {
    setParts((prev) => {
      const part = prev[partIndex]!;
      const items = part.items.map((item, i) => (i === itemIndex ? { ...item, dose } : item));
      const next = [...prev];
      next[partIndex] = { ...part, items };
      return next;
    });
  }

  const lookup = useMemo(() => builtinLookup(t), [t]);
  const preview: ProgramView | null = useMemo(() => {
    if (totalItems === 0) return null;
    return { title: tc("previewTitle"), description: "", parts: programParts(parts, lookup) };
  }, [parts, totalItems, lookup, tc]);

  const encoded = useMemo(() => encodeComposition(parts), [parts]);
  const downloadHref = `/api/programs/download?c=${encodeURIComponent(encoded)}&locale=${locale}`;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-reading leading-relaxed">{tc("intro")}</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="compose-add-to">{tc("addTo")}</Label>
            <NativeSelect
              id="compose-add-to"
              variant="sm"
              value={currentPart}
              onChange={(e) => setCurrentPart(e.target.value as PartKey)}
              className="w-auto min-w-36"
            >
              {PART_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`parts.${key}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          {atCap && (
            <p className="text-meta text-2sm">{tc("limitReached", { max: COMPOSE_MAX_ITEMS })}</p>
          )}
        </div>
        <ComposerLibrary onAdd={addExercise} disabled={atCap} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{tc("builderHeading")}</h2>
        <ComposerBuilder
          parts={parts}
          resolve={lookup}
          onMove={moveItem}
          onRemove={removeItem}
          onDoseChange={changeDose}
        />
      </div>

      {preview && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{tc("preview")}</h2>
            <DownloadActions downloadHref={downloadHref} printTitle={preview.title} />
          </div>
          <ProgramViewer program={preview} />
        </div>
      )}
    </div>
  );
}
