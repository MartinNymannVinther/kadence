"use client";

import { useTranslations } from "next-intl";
import type { Thresholds } from "@/modules/load";
import type { Structure } from "@/modules/workouts/structure";
import { durationText } from "@/components/training/duration";
import { BikeView } from "./bike-view";
import { StrengthView } from "./strength-view";

/** A session's structure to read — the bike's steps, the gym's exercises, or the words. */
export function StructureView({
  structure,
  rider,
  programmeSession = null,
}: {
  structure: Structure;
  rider: Thresholds | null;
  programmeSession?: number | null;
}) {
  const duration = useTranslations("training.duration");
  if (structure.kind === "bike") return <BikeView structure={structure} rider={rider} />;
  if (structure.kind === "strength")
    return <StrengthView structure={structure} programmeSession={programmeSession} />;
  return (
    <div className="flex flex-col gap-1">
      {structure.text && (
        <p className="text-reading leading-relaxed whitespace-pre-line">{structure.text}</p>
      )}
      {structure.minutes > 0 && (
        <p className="text-meta text-xs">{durationText(structure.minutes, duration)}</p>
      )}
    </div>
  );
}
