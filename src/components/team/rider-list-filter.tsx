"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { SegmentedChoice } from "@/components/ui/segmented";
import { RiderList, type RiderRowView } from "./rider-list";

/**
 * The team's riders found by typing part of a name and narrowed to one
 * class with a tap (docs/adr/0077): a coach with a full team should not
 * read twenty rows to find one. The classes offered are the ones the team
 * holds; a team of one class gets no filter at all. The list itself is the
 * same list, so a row reads the same whether it was found or scrolled to.
 */
export function RiderListFilter({ riders }: { riders: RiderRowView[] }) {
  const t = useTranslations("riders.filter");
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState("all");
  const classes = [...new Set(riders.map((r) => r.classKey))].filter(Boolean).sort();
  const q = query.trim().toLocaleLowerCase("da");
  const shown = riders.filter(
    (r) =>
      (klass === "all" || r.classKey === klass) &&
      (!q || r.name.toLocaleLowerCase("da").includes(q)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <label htmlFor={searchId} className="sr-only">
            {t("search")}
          </label>
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
        {classes.length > 1 && (
          <SegmentedChoice
            label={t("label")}
            value={klass}
            onChange={setKlass}
            options={[
              { value: "all", label: t("all") },
              ...classes.map((value) => ({ value, label: value })),
            ]}
          />
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-meta text-2sm">{t("none")}</p>
      ) : (
        <RiderList riders={shown} />
      )}
    </div>
  );
}
