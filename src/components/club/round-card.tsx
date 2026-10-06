import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDay } from "@/core/dates";
import {
  CLUB_CLASSES,
  formatTime,
  roundPlaces,
  type EntryIn,
  type RoundIn,
} from "@/modules/club/standings";
import { RoundEditor, type RiderChoice } from "./round-editor";
import { RemoveRound } from "./remove-round";

/**
 * One round and its results, class by class in finishing order, with a
 * record marked where a rider beat their own time on the club's course.
 * A coach writes the results here too.
 */
export function RoundCard({
  round,
  riders,
  isCoach,
}: {
  round: RoundIn & { kind: string; entries: Array<EntryIn & { record: boolean }> };
  riders: RiderChoice[];
  isCoach: boolean;
}) {
  const t = useTranslations("club.round");
  const locale = useLocale();
  const places = roundPlaces(round, round.entries);
  const value = (e: EntryIn) =>
    e.status === "dnf"
      ? t("dnf")
      : e.status === "dns"
        ? t("dns")
        : round.measure === "time" && e.timeMs !== null
          ? formatTime(e.timeMs)
          : "";

  return (
    <article className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{round.title}</h3>
        <span className="text-meta text-xs">
          {t(`kind.${round.kind}` as "dnf")} ·{" "}
          {formatDay(new Date(`${round.heldOn}T12:00:00`), locale)}
        </span>
      </div>
      {round.entries.length === 0 ? (
        <p className="text-meta text-2sm">{t("noResults")}</p>
      ) : (
        CLUB_CLASSES.map((cls) => {
          const rows = round.entries
            .filter((e) => e.class === cls)
            .sort((a, b) => (places.get(a.id) ?? 999) - (places.get(b.id) ?? 999));
          if (rows.length === 0) return null;
          return (
            <div key={cls} className="flex flex-col gap-1">
              <p className="text-label text-xs font-medium">{t(`class.${cls}` as "dnf")}</p>
              <ol className="flex flex-col gap-0.5">
                {rows.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 text-2sm">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-meta w-5 shrink-0 text-right tabular-nums">
                        {places.get(e.id) ?? ""}
                      </span>
                      <span className="truncate">{e.name}</span>
                      {e.record && <Badge variant="secondary">{t("record")}</Badge>}
                    </span>
                    <span className="text-meta shrink-0 tabular-nums">{value(e)}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })
      )}
      {isCoach && (
        <div className="flex flex-wrap items-start gap-2">
          <RoundEditor round={round} riders={riders} />
          <RemoveRound roundId={round.id} />
        </div>
      )}
    </article>
  );
}
