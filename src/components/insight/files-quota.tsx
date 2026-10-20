import { useTranslations } from "next-intl";
import type { ClubOverview, PersonsSummary } from "@/core/admin/overview";
import { formatBytes } from "@/modules/storage/format";
import { QuotaField } from "./quota-field";

/**
 * The files for the installation's owner (docs/adr/0087): what each
 * club's files take against its quota, the quota to change, and where
 * the files are kept. Persons are one line, never one by one (ADR 0080).
 */
export function FilesQuota({
  clubs,
  persons,
  defaults,
  storage,
  locale,
}: {
  clubs: ClubOverview[];
  persons: PersonsSummary;
  /** The installation's defaults; null is no quota. */
  defaults: { club: number | null; personal: number | null };
  storage: "db" | "s3";
  locale: string;
}) {
  const t = useTranslations("settings.installation.fileQuota");
  const size = (bytes: number) => formatBytes(bytes, locale);
  const label = (bytes: number | null) => (bytes === null ? t("noQuota") : size(bytes));

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="files-quota">
      <div className="flex flex-col gap-1">
        <h3 id="files-quota" className="text-base font-semibold">
          {t("title")}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">
          {t("body", { club: label(defaults.club), personal: label(defaults.personal) })}{" "}
          {t(storage === "s3" ? "inStore" : "inDatabase")}
        </p>
        {persons.count > 0 && (
          <p className="text-2sm tabular-nums">{t("persons", { used: size(persons.fileBytes) })}</p>
        )}
      </div>
      {clubs.length > 0 && (
        <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
          <table className="w-full min-w-[30rem] border-collapse text-2sm tabular-nums">
            <thead>
              <tr className="text-label text-left text-xs">
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("club")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("used")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("quota")}
                </th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const quota = club.fileQuotaBytes ?? defaults.club;
                return (
                  <tr key={club.orgId} className="border-border border-t">
                    <th scope="row" className="px-3 py-2 text-left align-top font-medium">
                      {club.name}
                    </th>
                    <td className="px-3 py-2 text-right align-top">
                      {quota !== null && quota > 0
                        ? t("usedOf", { used: size(club.fileBytes), quota: size(quota) })
                        : size(club.fileBytes)}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <QuotaField
                        orgId={club.orgId}
                        club={club.name}
                        quotaBytes={club.fileQuotaBytes}
                        defaultLabel={label(defaults.club)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
