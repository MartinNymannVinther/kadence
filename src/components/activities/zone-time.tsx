import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import { ZONES } from "@/modules/workouts/structure";

/**
 * Time in Kadence's seven zones, by watt and by pulse — each zone with its
 * number and name beside its bar, so the colour is never read alone. A
 * channel without the rider's threshold, or without samples, is left out
 * and says why.
 */
export function ZoneTime({
  zoneSeconds,
  hasPower,
  hasHr,
}: {
  zoneSeconds: { power?: number[]; hr?: number[] } | null;
  hasPower: boolean;
  hasHr: boolean;
}) {
  const t = useTranslations("activities.zones");
  const names = useTranslations("training.zone");
  const groups = [
    { key: "power", seconds: zoneSeconds?.power ?? [], has: hasPower },
    { key: "hr", seconds: zoneSeconds?.hr ?? [], has: hasHr },
  ] as const;
  const shown = groups.filter((g) => g.has);
  if (shown.length === 0) return <p className="text-meta text-2sm">{t("none")}</p>;

  return (
    <div className="grid gap-5 @2xl:grid-cols-2">
      {shown.map((group) => {
        const total = group.seconds.reduce((sum, s) => sum + s, 0);
        return (
          <section
            key={group.key}
            className="flex flex-col gap-2"
            aria-labelledby={`zones-${group.key}`}
          >
            <h4 id={`zones-${group.key}`} className="text-sm font-semibold">
              {t(group.key)}
            </h4>
            {total === 0 ? (
              <p className="text-meta text-2sm">
                {t(group.key === "power" ? "noFtp" : "noThresholdHr")}
              </p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {ZONES.map((zone, i) => {
                  const seconds = group.seconds[i] ?? 0;
                  const share = seconds / total;
                  return (
                    <li
                      key={zone}
                      className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-2 text-2sm"
                    >
                      <span className="truncate">
                        <span className="font-semibold tabular-nums">Z{zone}</span>{" "}
                        <span className="text-meta">{names(String(zone) as "1")}</span>
                      </span>
                      <span className="bg-secondary h-3 overflow-hidden rounded-full" aria-hidden>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${share * 100}%`,
                            backgroundColor: `var(--zone-${zone})`,
                          }}
                        />
                      </span>
                      <span className="text-right whitespace-nowrap tabular-nums">
                        {clockText(seconds)}
                        <span className="text-meta"> · {Math.round(share * 100)} %</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
