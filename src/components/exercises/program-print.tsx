import { useTranslations } from "next-intl";
import type { ProgramView } from "@/modules/exercises/types";
import { ExerciseCard } from "./exercise-card";

/**
 * The programme on paper — the open page, the app and the composer's
 * preview print the same thing: every part one after the other under its
 * name, where the screen shows one part at a time in tabs, one card to a
 * row. Only in print; the viewer is the screen's.
 *
 * The pages break where the content lets them: a card is never split
 * (`[data-print-keep]`, src/app/globals.css), a part's name stays with its
 * first card, and one part follows the last without a page of its own.
 * Everything here is plain block layout on purpose: Safari honours
 * "keep this whole" only for blocks in normal flow, and splits a card
 * that sits in a grid or a flex column down the middle. One column costs
 * a sheet or two; the card draws its figure smaller on paper to win
 * some of that back (exercise-card.tsx).
 */
export function ProgramPrint({ program }: { program: ProgramView }) {
  const t = useTranslations("exercises");
  return (
    <div className="hidden print:block">
      {program.parts.map((part) => (
        <section key={part.key} className="mb-5">
          {program.parts.length > 1 && (
            <h2 className="mb-2.5 text-lg font-semibold">{t(`parts.${part.key}`)}</h2>
          )}
          {part.items.map((item, n) => (
            <ExerciseCard
              key={`${item.exercise.ref}-${n}`}
              exercise={item.exercise}
              dose={item.dose}
              number={n + 1}
              className="mb-3"
            />
          ))}
        </section>
      ))}
    </div>
  );
}
