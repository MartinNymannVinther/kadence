"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { segmentedSegment, segmentedTrack } from "@/components/ui/segmented";
import type { ProgramView } from "@/modules/exercises/types";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "./exercise-card";

/**
 * A programme's parts as tabs — Morgen, Middag, Aften — and each part's
 * exercises as numbered cards. One part shows its cards without tabs.
 * Every part stays mounted, so a card marked done stays done when the
 * reader looks at another part and comes back. The programme's title and
 * description are the page's to show.
 *
 * Printed (or saved as a PDF), every part shows at once, not only the one
 * on screen, two cards to a row where an A4 page has room, with a page
 * break between parts; a card keeps its figure with its text
 * (`[data-print-keep]`, src/app/globals.css).
 */
export function ProgramViewer({ program }: { program: ProgramView }) {
  const t = useTranslations("exercises");
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const parts = program.parts;
  const tabbed = parts.length > 1;

  const choose = (index: number) => {
    const next = (index + parts.length) % parts.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => choose(active + 1),
      ArrowLeft: () => choose(active - 1),
      Home: () => choose(0),
      End: () => choose(parts.length - 1),
    };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  return (
    <div className="flex flex-col gap-4">
      {tabbed && (
        <div
          role="tablist"
          aria-label={t("viewer.parts")}
          onKeyDown={onKeyDown}
          className={cn(segmentedTrack, "grid w-full auto-cols-fr grid-flow-col sm:w-auto")}
        >
          {parts.map((part, i) => (
            <button
              key={part.key}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                segmentedSegment(i === active),
                "focus-visible:outline-ring min-h-10 outline-none focus-visible:outline-2 focus-visible:outline-solid sm:min-h-9",
              )}
            >
              {t(`parts.${part.key}`)}
            </button>
          ))}
        </div>
      )}
      {parts.map((part, i) => (
        <div
          key={part.key}
          id={`${id}-panel-${i}`}
          role={tabbed ? "tabpanel" : undefined}
          aria-labelledby={tabbed ? `${id}-tab-${i}` : undefined}
          // Tailwind's `hidden`/`grid` utilities, not the `hidden` attribute:
          // preflight resets `[hidden]` with `display: none !important`,
          // which no layered utility — `!` included — can out-rank, and
          // printing needs every part shown, not only the one on screen.
          className={cn(
            "gap-4 lg:grid-cols-2 print:grid print:grid-cols-2 print:break-before-page",
            i === active ? "grid" : "hidden",
            i === 0 && "print:break-before-avoid",
          )}
        >
          {part.items.map((item, n) => (
            <ExerciseCard
              key={`${item.exercise.ref}-${n}`}
              exercise={item.exercise}
              dose={item.dose}
              number={n + 1}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
