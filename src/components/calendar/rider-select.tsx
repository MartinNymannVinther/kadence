"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { useRouter } from "@/i18n/navigation";
import { riderHref, teamHref, type CalendarQuery } from "./href";
import type { RiderOption } from "./types";

/**
 * Whose calendar to look at — every rider for a coach, each child for a
 * parent — with "the whole team" first for a coach, at the week, month
 * or season already shown. A real select, so a phone shows its own
 * picker.
 */
export function RiderSelect({
  riders,
  value,
  query,
  withTeam,
}: {
  riders: RiderOption[];
  /** The rider shown, or "team". */
  value: string;
  /** Where the calendar is: the choice keeps the scale and the place. */
  query: CalendarQuery;
  withTeam: boolean;
}) {
  const t = useTranslations("calendar.view");
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-meta text-2sm">
        {t("show")}
      </label>
      <NativeSelect
        id={id}
        value={value}
        className="w-auto min-w-44 max-sm:h-11"
        onChange={(e) =>
          router.push(
            e.target.value === "team" ? teamHref(query) : riderHref(query, e.target.value),
          )
        }
      >
        {withTeam && <option value="team">{t("team")}</option>}
        {riders.map((rider) => (
          <option key={rider.id} value={rider.id}>
            {rider.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
