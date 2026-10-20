"use client";

import { useTranslations } from "next-intl";
import { referenceOf } from "@/modules/paradigms";
import type { Volume } from "@/modules/season/volume";

/**
 * What each number in the week's totals means (docs/adr/0104), folded
 * away under one line so it is there for whoever wonders and out of the
 * way for whoever knows. The bike's terms are told only where the week
 * has a rider's bike numbers, and the frame only where a paradigm gives
 * one.
 */
export function WeekTotalsExplained({ volume }: { volume: Volume | null }) {
  const t = useTranslations("calendar.totals.explain");
  const v = useTranslations("volume");
  const ref = referenceOf(volume?.basis);
  const terms = [
    { key: "planned", term: t("plannedTerm"), says: t("planned") },
    { key: "done", term: t("doneTerm"), says: t("done") },
    ...(volume
      ? [
          { key: "goal", term: t("goalTerm"), says: t("goal") },
          ...(volume.dcu
            ? [{ key: "frame", term: v("frame", { ref }), says: t("frame", { ref }) }]
            : []),
          { key: "expected", term: t("expectedTerm"), says: t("expected") },
        ]
      : []),
  ];

  return (
    <details className="text-xs">
      <summary className="focus-ring text-primary flex min-h-11 w-fit cursor-pointer items-center font-medium sm:min-h-0">
        {t("title")}
      </summary>
      <dl className="mt-1.5 flex flex-col gap-1.5 leading-relaxed">
        {terms.map((item) => (
          <div key={item.key}>
            <dt className="inline font-medium">{item.term}: </dt>
            <dd className="text-meta inline">{item.says}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
