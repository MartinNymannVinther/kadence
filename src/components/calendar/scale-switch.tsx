import { getTranslations } from "next-intl/server";
import { SegmentedFilter } from "@/components/ui/segmented";
import type { CalendarScale } from "@/modules/calendar/grid";
import { scaleHref, type CalendarQuery } from "./href";

/**
 * Uge · Måned · År: the calendar at three scales (docs/adr/0093). Links,
 * so the back button knows them; each keeps whose calendar it is and
 * opens on what holds today when the range shown does.
 */
export async function ScaleSwitch({
  scale,
  query,
  shown,
  today,
}: {
  scale: CalendarScale;
  query: CalendarQuery;
  /** The first and last day of the week, month or season shown. */
  shown: { from: string; to: string };
  today: string;
}) {
  const t = await getTranslations("calendar.views");
  const scales: CalendarScale[] = ["week", "month", "year"];
  return (
    <nav aria-label={t("label")}>
      <SegmentedFilter
        items={scales.map((key) => ({
          key,
          label: t(key),
          href: scaleHref(query, key, shown, today),
          active: key === scale,
        }))}
      />
    </nav>
  );
}
