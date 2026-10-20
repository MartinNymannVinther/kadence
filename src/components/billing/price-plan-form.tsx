"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePricePlanAction } from "@/core/admin/price-actions";
import { todayInCopenhagen } from "@/core/dates";
import { useRouter } from "@/i18n/navigation";
import { formatKroner } from "@/modules/billing/dates";
import { gigabytes, priceExamples } from "@/modules/billing/price-page";
import type { PricePlanRow } from "@/modules/billing/price-list";
import { monthlyPrice } from "@/modules/billing/which-plan";

/**
 * One plan under Installation → Priser (docs/adr/0090), for the
 * installation's owner: its names, its price a year, the riders it
 * includes and the price per rider beyond, its AI budget and file quota,
 * whether VAT is in it, and the day the change takes effect. What it comes
 * to for 12, 20, 21 and 40 riders is worked out as the numbers are typed,
 * with the same sum the pages and the database use (which-plan.ts).
 */

type Draft = Record<
  "nameDa" | "nameEn" | "price" | "included" | "perRider" | "ai" | "files" | "validFrom",
  string
>;

const whole = (v: string) => (v.trim() === "" ? null : Number(v));

function draftOf(plan: PricePlanRow, today: string): Draft {
  return {
    nameDa: plan.nameDa,
    nameEn: plan.nameEn,
    price: String(plan.priceYearDkk),
    included: plan.includedRiders === null ? "" : String(plan.includedRiders),
    perRider: plan.perRiderDkk === null ? "" : String(plan.perRiderDkk),
    ai: String(plan.aiBudgetMicro / 1_000_000),
    files: String(gigabytes(plan.fileQuotaBytes)),
    validFrom: today,
  };
}

export function PricePlanForm({ plan }: { plan: PricePlanRow }) {
  const t = useTranslations("billing.prices");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const today = todayInCopenhagen();
  const [draft, setDraft] = useState<Draft>(() => draftOf(plan, today));
  const [vat, setVat] = useState(plan.vatIncluded);
  const [pending, start] = useTransition();
  const kr = (n: number) => formatKroner(n, locale);

  const price = whole(draft.price) ?? 0;
  const included = whole(draft.included);
  const perRider = whole(draft.perRider);
  const grows = included !== null && perRider !== null;
  const examples = grows
    ? priceExamples({
        key: plan.key,
        priceYearDkk: price,
        includedRiders: included,
        perRiderDkk: perRider,
      })
    : [];

  const field = (key: keyof Draft, type: "text" | "number" | "date", extra = {}) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${key}`} className="text-sm font-medium">
        {t(`fields.${key}`)}
      </label>
      <Input
        id={`${id}-${key}`}
        type={type}
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        {...extra}
      />
    </div>
  );

  function save() {
    start(async () => {
      const result = await savePricePlanAction({
        key: plan.key,
        nameDa: draft.nameDa,
        nameEn: draft.nameEn,
        priceYearDkk: price,
        includedRiders: included,
        perRiderDkk: perRider,
        aiBudgetEuros: Number(draft.ai),
        fileQuotaGb: Number(draft.files),
        vatIncluded: vat,
        validFrom: draft.validFrom,
      });
      if (!result.ok) {
        toast.error(t(result.error === "invalid" ? "invalid" : "failed"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  const num = { min: 0, step: 1, inputMode: "numeric" as const };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field("nameDa", "text", { maxLength: 60 })}
        {field("nameEn", "text", { maxLength: 60 })}
        {field("price", "number", num)}
        {field("validFrom", "date", { min: today })}
        {field("included", "number", num)}
        {field("perRider", "number", num)}
        {field("ai", "number", { min: 0, step: 0.5, inputMode: "decimal" })}
        {field("files", "number", { min: 0, step: 0.5, inputMode: "decimal" })}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
        {t("fields.vat")}
      </label>
      <div className="bg-muted/40 rounded-lg p-3 text-2sm tabular-nums" aria-live="polite">
        {grows ? (
          <ul className="flex flex-col gap-0.5">
            {examples.map((e) => (
              <li key={e.riders}>
                {t("example", {
                  riders: e.riders,
                  year: kr(e.yearlyDkk),
                  month: kr(e.monthlyDkk),
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("flat", { year: kr(price), month: kr(monthlyPrice(price)) })}</p>
        )}
      </div>
      <p className="text-meta text-xs leading-relaxed">{t("history")}</p>
      <div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
