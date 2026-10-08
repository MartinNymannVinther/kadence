import { useTranslations } from "next-intl";
import {
  CLUB_CLASSES,
  type ClubClass,
  type Improvement,
  type Standing,
} from "@/modules/club/standings";
import { cn } from "@/lib/utils";

/**
 * The season's standings per class (ADR 0051): the three at the top on a
 * small podium, everyone who rode below them, and the year's biggest
 * improvement. Said warmly; nobody is called last.
 */
export function StandingsBoard({
  standings,
  improvement,
}: {
  standings: Record<ClubClass, Standing[]>;
  improvement: Improvement | null;
}) {
  const t = useTranslations("club.standings");
  const classes = CLUB_CLASSES.filter((c) => standings[c].length > 0);
  if (classes.length === 0) return <p className="text-meta text-2sm">{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-reading leading-relaxed">{t("cheer")}</p>
      {improvement && (
        <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm leading-relaxed">
          {t("improvement", {
            name: improvement.name,
            course: improvement.course,
            percent: Math.round(improvement.percent * 10) / 10,
          })}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((cls) => {
          const table = standings[cls];
          return (
            <section
              key={cls}
              aria-labelledby={`standings-${cls}`}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface"
            >
              <h3 id={`standings-${cls}`} className="text-base font-semibold">
                {t(`class.${cls}` as "empty")}
              </h3>
              <ol className="flex flex-col gap-1.5">
                {table.map((s, i) => (
                  <li
                    key={s.key}
                    className={cn(
                      "flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-2sm",
                      i < 3 && s.points > 0 && "bg-secondary font-medium",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-meta w-5 shrink-0 text-right tabular-nums">
                        {s.points > 0 ? i + 1 : ""}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="text-meta shrink-0 tabular-nums">
                      {t("points", { points: s.points, rounds: s.finished })}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
