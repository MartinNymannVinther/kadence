import { useTranslations } from "next-intl";

/**
 * How a line of "Inviter hele holdet" is written, said beside the field:
 * the rider first, parents after semicolons, an address for a link
 * (src/modules/team/bulk-parse.ts reads it the same way).
 */
export function BulkFormat({ id }: { id: string }) {
  const t = useTranslations("riders.bulk");
  return (
    <div id={id} className="bg-accent/60 border-border flex flex-col gap-1.5 rounded-lg border p-3">
      <p className="text-sm font-medium">{t("formatTitle")}</p>
      <ul className="text-meta flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
        <li>{t("formatRider")}</li>
        <li>{t("formatParents")}</li>
        <li>{t("formatEmail")}</li>
        <li>{t("formatSiblings")}</li>
      </ul>
    </div>
  );
}
