"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export type RiderDraft = {
  name: string;
  birthYear: number;
  sex: "female" | "male" | null;
};

/**
 * Who a rider is, as far as Kadence asks: a name, a birth year (DCU's
 * classes go by the year, so the date is not needed) and, only if it is
 * wanted, sex — used only where a recommendation differs.
 */
export function RiderFields({
  value,
  onChange,
}: {
  value: RiderDraft;
  onChange: (value: RiderDraft) => void;
}) {
  const t = useTranslations("riders.fields");
  const base = useId();
  const year = new Date().getFullYear();
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${base}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <Input
          id={`${base}-name`}
          value={value.name}
          maxLength={120}
          required
          autoComplete="off"
          className="max-sm:h-11"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${base}-year`} className="text-sm font-medium">
          {t("birthYear")}
        </label>
        <Input
          id={`${base}-year`}
          type="number"
          inputMode="numeric"
          min={1940}
          max={year - 8}
          required
          value={value.birthYear || ""}
          className="max-sm:h-11"
          onChange={(e) => onChange({ ...value, birthYear: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${base}-sex`} className="text-sm font-medium">
          {t("sex")}
        </label>
        <NativeSelect
          id={`${base}-sex`}
          value={value.sex ?? ""}
          className="max-sm:h-11"
          onChange={(e) =>
            onChange({ ...value, sex: (e.target.value || null) as RiderDraft["sex"] })
          }
        >
          <option value="">{t("sexNone")}</option>
          <option value="female">{t("female")}</option>
          <option value="male">{t("male")}</option>
        </NativeSelect>
      </div>
    </div>
  );
}
