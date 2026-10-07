import { useTranslations } from "next-intl";
import type { ProgramView } from "@/modules/exercises/types";
import { ExerciseCard } from "../exercise-card";

/**
 * The programme on paper: every part one after the other under its name,
 * where the screen shows one part at a time in tabs. Only in print; the
 * viewer is the screen's.
 */
export function ProgramPrint({ program }: { program: ProgramView }) {
  const t = useTranslations("exercises");
  return (
    <div className="hidden flex-col gap-6 print:flex">
      {program.parts.map((part) => (
        <section key={part.key} className="flex flex-col gap-3">
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
