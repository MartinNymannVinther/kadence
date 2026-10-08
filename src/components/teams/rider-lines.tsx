import { useTranslations } from "next-intl";
import type { RiderLine } from "@/modules/teams/view";

const SHOWN = 8;

/**
 * Riders the lists put on a team, with their places and points — the
 * UCI's U23 ranking, DCU's points list — folded past the first eight.
 * Public sports data, shown as the lists show it (ADR 0072).
 */
export function RiderLines({ riders, lastSeason }: { riders: RiderLine[]; lastSeason: number }) {
  const t = useTranslations("guides.teams");
  if (riders.length === 0)
    return (
      <p className="text-meta text-2sm">
        {lastSeason > 0 ? t("lastSeasonOnly", { count: lastSeason }) : t("noRidersListed")}
      </p>
    );
  const rest = riders.length - SHOWN;
  return (
    <div className="flex flex-col gap-1">
      <Lines riders={riders.slice(0, SHOWN)} />
      {rest > 0 && (
        <details className="text-2sm">
          <summary className="focus-ring text-primary cursor-pointer">
            {t("more", { count: rest })}
          </summary>
          <div className="mt-1">
            <Lines riders={riders.slice(SHOWN)} />
          </div>
        </details>
      )}
      {lastSeason > 0 && (
        <p className="text-meta text-xs">{t("lastSeasonAlso", { count: lastSeason })}</p>
      )}
    </div>
  );
}

function Lines({ riders }: { riders: RiderLine[] }) {
  const t = useTranslations("guides.teams");
  return (
    <ul className="flex flex-col gap-0.5 text-2sm">
      {riders.map((r) => (
        <li key={r.name} className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-reading">{r.name}</span>
          {r.born && <span className="text-meta text-xs tabular-nums">{r.born}</span>}
          <span className="text-meta text-xs tabular-nums">
            {[
              r.uci ? t("uciStanding", { rank: r.uci.rank, points: r.uci.points }) : null,
              r.dcu
                ? t("dcuStanding", {
                    rank: r.dcu.rank,
                    points: r.dcu.points,
                    list: t(`list.${r.dcu.list}`),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
