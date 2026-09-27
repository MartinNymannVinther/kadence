"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { useRouter } from "@/i18n/navigation";

/**
 * Whose page to look at — a coach's riders, a parent's children — as a
 * real select, so a phone shows its own picker. Each option carries the
 * address it leads to, built on the server with the page's other choices.
 */
export function RiderSwitch({
  options,
  value,
}: {
  options: Array<{ id: string; name: string; href: string }>;
  value: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-meta text-2sm">
        {t("rider")}
      </label>
      <NativeSelect
        id={id}
        value={value}
        className="w-auto min-w-44 max-sm:h-11"
        onChange={(e) => {
          const next = options.find((o) => o.id === e.target.value);
          if (next) router.push(next.href);
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
