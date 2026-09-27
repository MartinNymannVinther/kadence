"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";

export type TemplateOption = {
  id: string;
  name: string;
  sport: string;
  plannedMinutes: number;
  source: string;
};

/** A template from the library, found by typing part of its name. */
export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: TemplateOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("calendar.add");
  const duration = useTranslations("training.duration");
  const searchId = useId();
  const name = useId();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? templates.filter((tpl) => tpl.name.toLowerCase().includes(q)) : templates;

  if (templates.length === 0) return <p className="text-meta text-2sm">{t("noTemplates")}</p>;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={searchId} className="sr-only">
        {t("search")}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="text-meta pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          id={searchId}
          type="search"
          value={query}
          placeholder={t("search")}
          className="pl-9 max-sm:h-11"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <fieldset className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        <legend className="sr-only">{t("template")}</legend>
        {shown.map((tpl) => (
          <label
            key={tpl.id}
            className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              className="accent-primary"
              checked={value === tpl.id}
              onChange={() => onChange(tpl.id)}
            />
            <SportIcon sport={tpl.sport} />
            <span className="min-w-0 flex-1 truncate">{tpl.name}</span>
            {tpl.source === "dcu" && <Badge variant="secondary">DCU</Badge>}
            {tpl.plannedMinutes > 0 && (
              <span className="text-meta shrink-0 text-xs tabular-nums">
                {durationText(tpl.plannedMinutes, duration)}
              </span>
            )}
          </label>
        ))}
        {shown.length === 0 && <p className="text-meta text-2sm">{t("noMatch")}</p>}
      </fieldset>
    </div>
  );
}
