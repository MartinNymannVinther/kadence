import { useTranslations } from "next-intl";
import type { ProgramView } from "@/modules/exercises/types";
import { ExerciseCard } from "./exercise-card";

/**
 * The programme on paper — the open page, the app and the composer's
 * preview print the same thing: every part one after the other under its
 * name, where the screen shows one part at a time in tabs, two cards to
 * a row. Only in print; the viewer is the screen's.
 *
 * The pages break where the content lets them: a card is never split
 * (`[data-print-keep]`, src/app/globals.css), a part's name stays with its
 * first cards, and one part follows the last without a page of its own,
 * so a part of one card does not leave a sheet half empty. The card draws
 * its figure smaller on paper for the same reason (exercise-card.tsx).
 */
export function ProgramPrint({ program }: { program: ProgramView }) {
  const t = useTranslations("exercises");
  return (
    <div className="hidden flex-col gap-5 print:flex">
      {program.parts.map((part) => (
        <section key={part.key} className="flex flex-col gap-2.5">
          {program.parts.length > 1 && (
            <h2 className="text-lg font-semibold">{t(`parts.${part.key}`)}</h2>
          )}
          <div className="grid grid-cols-2 gap-3">
            {part.items.map((item, n) => (
              <ExerciseCard
                key={`${item.exercise.ref}-${n}`}
                exercise={item.exercise}
                dose={item.dose}
                number={n + 1}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
