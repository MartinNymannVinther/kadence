"use client";

import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { CLASS_BASES } from "@/modules/dcu/classes";
import { basisText } from "./basis-text";

/** DCU's eight columns, U17 1. år to U23 4. år, as a real select. */
export function BasisSelect({
  id,
  value,
  onChange,
  withEmpty = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  withEmpty?: boolean;
}) {
  const t = useTranslations("season");
  return (
    <NativeSelect
      id={id}
      value={value}
      className="w-auto min-w-44 max-sm:h-11"
      onChange={(e) => onChange(e.target.value)}
    >
      {withEmpty && <option value="">{t("pickBasis")}</option>}
      {CLASS_BASES.map((basis) => (
        <option key={basis} value={basis}>
          {basisText(basis, (k, v) => t(k, v))}
        </option>
      ))}
    </NativeSelect>
  );
}
