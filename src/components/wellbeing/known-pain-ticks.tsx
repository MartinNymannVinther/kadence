"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TickedPain } from "@/modules/load/usual-pain";
import type { KnownPainView } from "@/modules/wellbeing/known-pains";

/**
 * The rider's known pains under the pain question (docs/adr/0097), each a
 * quick choice "Ryg som det plejer". Ticked, today's pain there is the
 * usual one, and it does not colour the day. A rider without any, who
 * says something hurts, is told where to write one down.
 */
export function KnownPainTicks({
  pains,
  value,
  pain,
  onChange,
}: {
  pains: KnownPainView[];
  value: TickedPain[];
  /** Today's answer on the ladder. */
  pain: number;
  onChange: (value: TickedPain[]) => void;
}) {
  const t = useTranslations("checkin.known");
  if (pains.length === 0) {
    if (pain === 0) return null;
    return (
      <p className="text-meta -mt-2 text-xs leading-relaxed">
        {t("none")}{" "}
        <Link href="/me#checkins" className="focus-ring text-primary hover:underline">
          {t("noneLink")}
        </Link>
      </p>
    );
  }
  const ticked = new Set(value.map((p) => p.id));
  const toggle = (known: KnownPainView, on: boolean) =>
    onChange(
      on
        ? [...value, { id: known.id, place: known.place, level: known.usualLevel }]
        : value.filter((p) => p.id !== known.id),
    );
  return (
    <fieldset className="-mt-1 flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium">{t("title")}</legend>
      <p className="text-meta -mt-0.5 mb-1 text-xs">{t("hint")}</p>
      <div className="flex flex-wrap gap-1.5">
        {pains.map((known) => (
          <label
            key={known.id}
            className="border-border bg-card has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 has-focus-visible:outline-2"
          >
            <input
              type="checkbox"
              checked={ticked.has(known.id)}
              onChange={(e) => toggle(known, e.target.checked)}
              className="accent-primary size-5"
            />
            <span className="text-2sm font-medium">{t("usual", { place: known.place })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
