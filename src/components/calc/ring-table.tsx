"use client";

import { useTranslations } from "next-intl";
import { ringTable } from "@/modules/calc/gearing";

/** The sprockets a junior cassette or a modern cassette can start on. */
const COGS = [10, 11, 12, 13, 14, 15, 16] as const;

/** The biggest legal chainring for each smallest sprocket, for the class and tyre chosen. */
export function RingTable({
  limit,
  circumference,
  className,
}: {
  limit: number;
  circumference: number;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.table");
  const rows = ringTable(COGS, limit, circumference);

  return (
    <section className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <table className="w-full border-collapse text-2sm">
        <caption className="text-meta pb-2 text-left text-xs">
          {t("caption", { class: className, circumference })}
        </caption>
        <thead>
          <tr className="text-label text-left text-xs">
            <th className="py-1.5 pr-2 font-medium">{t("cog")}</th>
            <th className="py-1.5 pr-2 font-medium">{t("ring")}</th>
            <th className="py-1.5 font-medium">{t("rollout")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cog} className="border-border border-t tabular-nums">
              <td className="py-1.5 pr-2">{t("teeth", { n: row.cog })}</td>
              <td className="py-1.5 pr-2 font-medium">{t("teeth", { n: row.ring })}</td>
              <td className="text-meta py-1.5">{t("metres", { rollout: row.rolloutM })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
