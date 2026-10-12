"use client";

import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { CLASS_BASES } from "@/modules/dcu/classes";
import { SENIOR_BASES, isSeniorBasis } from "@/modules/paradigms";
import { basisText } from "./basis-text";

/**
 * DCU's eight columns, U17 1. år to U23 4. år, as a real select — for a
 * senior, the two training profiles first (docs/adr/0091), then DCU's.
 */
export function BasisSelect({
  id,
  value,
  onChange,
  withEmpty = false,
  senior = isSeniorBasis(value),
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  withEmpty?: boolean;
  /** Offer the senior profiles; by default when the chosen basis is one. */
  senior?: boolean;
}) {
  const t = useTranslations("season");
  const bases: readonly string[] = senior ? [...SENIOR_BASES, ...CLASS_BASES] : CLASS_BASES;
  return (
    <NativeSelect
      id={id}
      value={value}
      className="w-auto min-w-44 max-sm:h-11"
      onChange={(e) => onChange(e.target.value)}
    >
      {withEmpty && <option value="">{t("pickBasis")}</option>}
      {bases.map((basis) => (
        <option key={basis} value={basis}>
          {basisText(basis, (k, v) => t(k, v))}
        </option>
      ))}
    </NativeSelect>
  );
}
