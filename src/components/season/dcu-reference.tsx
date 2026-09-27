import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { DCU_HRR_BANDS, DCU_SOURCES, PHASES, type DcuSourceId } from "@/modules/dcu";
import { ZONE_FTP_PCT, ZONE_HR_PCT, ZONES } from "@/modules/workouts/structure";

const SOURCES: DcuSourceId[] = [
  "hours2025",
  "yearWheel",
  "u17Compendium",
  "u19Compendium",
  "intervals",
  "rules2025",
];

/**
 * Where the season plan's numbers come from (ADR 0014, 0015): DCU's
 * phases in Kadence's short words, DCU's heart-rate-reserve bands beside
 * Kadence's own seven zones — shown for reference and labelled as DCU's —
 * and the documents themselves, linked.
 */
export function DcuReference() {
  const t = useTranslations("season.reference");
  const phases = useTranslations("season");
  const zones = useTranslations("training.zone");
  const range = (low: number | null, high: number | null) =>
    low === null && high === null
      ? t("noBand")
      : low === null
        ? t("upTo", { high: high! })
        : t("range", { low, high: high! });
  const zoneRange = (band: { low: number; high: number }, last: boolean) =>
    last ? t("over", { low: band.low - 1 }) : range(band.low || null, band.high);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="dcu-phases" className="flex flex-col gap-2">
        <h3 id="dcu-phases" className="text-sm font-semibold">
          {t("phasesTitle")}
        </h3>
        <dl className="grid gap-2 text-2sm leading-relaxed">
          {PHASES.map((phase) => (
            <div key={phase}>
              <dt className="inline font-semibold">{phases(`phase.${phase}`)}: </dt>
              <dd className="text-muted-foreground inline">{phases(`phaseInfo.${phase}`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="dcu-zones" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="dcu-zones" className="text-sm font-semibold">
            {t("zonesTitle")}
          </h3>
          <p className="text-meta text-2sm leading-relaxed">{t("zonesBody")}</p>
        </div>
        <div className="grid gap-4 @2xl:grid-cols-2">
          <table className="text-2sm w-full text-left">
            <caption className="text-label mb-1 text-left text-xs font-medium">
              {t("kadenceZones")}
            </caption>
            <thead className="text-label text-xs">
              <tr>
                <th className="py-1 font-medium">{t("zone")}</th>
                <th className="py-1 font-medium">{t("ftp")}</th>
                <th className="py-1 font-medium">{t("thresholdHr")}</th>
              </tr>
            </thead>
            <tbody className="divide-hairline divide-y">
              {ZONES.map((zone) => (
                <tr key={zone}>
                  <td className="py-1">
                    <span className="font-semibold">Z{zone}</span>{" "}
                    <span className="text-meta">{zones(String(zone) as "1")}</span>
                  </td>
                  <td className="py-1">{zoneRange(ZONE_FTP_PCT[zone], zone === 7)}</td>
                  <td className="py-1">{zoneRange(ZONE_HR_PCT[zone], zone === 7)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="text-2sm w-full text-left">
            <caption className="text-label mb-1 text-left text-xs font-medium">
              {t("dcuBands")}
            </caption>
            <thead className="text-label text-xs">
              <tr>
                <th className="py-1 font-medium">{t("band")}</th>
                <th className="py-1 font-medium">{t("hrr")}</th>
              </tr>
            </thead>
            <tbody className="divide-hairline divide-y">
              {DCU_HRR_BANDS.map((band) => (
                <tr key={band.name}>
                  <td className="py-1">{band.name}</td>
                  <td className="py-1">{range(band.low, band.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="dcu-sources" className="flex flex-col gap-2">
        <h3 id="dcu-sources" className="text-sm font-semibold">
          {t("sourcesTitle")}
        </h3>
        <ul className="flex flex-col gap-1 text-2sm">
          {SOURCES.map((id) => (
            <li key={id}>
              <a
                href={DCU_SOURCES[id].url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-primary inline-flex min-h-9 items-center gap-1.5 hover:underline"
              >
                {DCU_SOURCES[id].title}
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">{t("opensElsewhere")}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-meta text-xs leading-relaxed">{t("snapshot")}</p>
      </section>
    </div>
  );
}
