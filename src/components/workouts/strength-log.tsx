"use client";

import { useTranslations } from "next-intl";
import type { Exercise } from "@/modules/workouts/structure";

/**
 * On paper only: a box for every set, to write in the strength room what
 * was lifted and how many times — or, for mobility, to tick it off. The
 * screen has "Udført" for that; a printed session is the logbook the
 * rider takes along.
 */
export function StrengthLog({ exercise }: { exercise: Exercise }) {
  const t = useTranslations("workouts.view.log");
  const sets = Array.from({ length: exercise.sets }, (_, i) => i + 1);
  const rows = exercise.group === "mobility" ? (["done"] as const) : (["kg", "reps"] as const);
  const box = "border-foreground/40 h-7 w-16 border";

  return (
    <table className="hidden self-start text-xs print:table print:w-auto print:border-collapse">
      <thead>
        <tr>
          <td />
          {sets.map((n) => (
            <th key={n} scope="col" className="text-meta px-1 pb-0.5 text-left font-normal">
              {t("set", { n })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row}>
            <th scope="row" className="text-meta pr-2 text-left font-normal">
              {t(row)}
            </th>
            {sets.map((n) => (
              <td key={n} className={box} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
