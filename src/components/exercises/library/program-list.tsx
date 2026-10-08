import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { programHref } from "@/modules/exercises/library-paths";
import type { LibraryProgram } from "@/modules/exercises/library";

/**
 * The programmes, the team's first and then Kadence's own, each a card
 * that opens the programme: its name, what it is for, how many exercises
 * in which parts of the day, and about how long it takes.
 */
export function ProgramList({ programs }: { programs: LibraryProgram[] }) {
  const t = useTranslations("exercises");

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {programs.map((program) => (
        <li key={program.ref} className="min-w-0">
          <Link
            href={programHref(program.ref)}
            className="focus-ring border-border bg-card hover:border-primary/60 group flex h-full min-h-11 flex-col gap-1.5 rounded-xl border p-4 shadow-surface transition-colors duration-[120ms] ease-out"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-heading min-w-0 font-semibold break-words">
                  {program.name}
                </span>
                {program.team && <Badge variant="secondary">{t("library.team")}</Badge>}
                {program.archived && <Badge variant="outline">{t("library.archived")}</Badge>}
              </span>
              <ChevronRight
                aria-hidden
                className="text-meta group-hover:text-primary mt-1 size-4 shrink-0"
              />
            </span>
            {program.description && (
              <span className="text-meta line-clamp-2 text-2sm leading-relaxed">
                {program.description}
              </span>
            )}
            <span className="text-label mt-auto pt-1 text-xs tabular-nums">
              {t("library.meta", { count: program.exercises, minutes: program.minutes })}
              {program.parts.length > 1 &&
                ` · ${program.parts.map((key) => t(`parts.${key}`)).join(", ")}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
