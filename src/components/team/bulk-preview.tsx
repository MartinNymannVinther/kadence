"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { BIRTH_YEAR_MIN, birthYearMax } from "@/modules/team/birth-year";
import {
  MAX_RIDERS,
  addressesIn,
  type LineProblem,
  type ListProblemCode,
  type ParsedList,
} from "@/modules/team/bulk-parse";
import { classText } from "./class-text";

/**
 * What "Inviter hele holdet" is about to create, read as the coach
 * types: the lines that must be fixed first, each with its number and
 * the reason, and then every rider with year, class, address and
 * parents. Nothing is created from here; this is the look before.
 */
export function BulkPreview({
  parsed,
  problems,
  listProblem,
  text,
  today,
  thisYear,
}: {
  parsed: ParsedList;
  /** The list's own problems and the team's, from the server, merged. */
  problems: LineProblem[];
  listProblem: ListProblemCode | null;
  text: string;
  today: string;
  thisYear: number;
}) {
  const t = useTranslations("riders.bulk");
  const classes = useTranslations("riders.class");
  const rawLines = text.split(/\r?\n/);
  const byLine = new Map<number, LineProblem[]>();
  for (const p of problems) byLine.set(p.line, [...(byLine.get(p.line) ?? []), p]);
  const parents = parsed.lines.reduce((n, l) => n + l.parents.length, 0);

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      {listProblem && listProblem !== "empty" && (
        <p className="bg-warning-tint text-destructive flex gap-2 rounded-lg px-3 py-2 text-sm">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t(`whole.${listProblem}`, {
            max: listProblem === "tooMany" ? MAX_RIDERS : birthYearMax(thisYear),
            min: BIRTH_YEAR_MIN,
          })}
        </p>
      )}

      {byLine.size > 0 && (
        <div className="bg-warning-tint flex flex-col gap-2 rounded-lg px-3 py-2">
          <p className="text-destructive text-sm font-semibold">
            {t("problemsTitle", { count: byLine.size })}
          </p>
          <ul className="flex flex-col gap-2">
            {[...byLine.entries()]
              .sort(([a], [b]) => a - b)
              .map(([line, found]) => (
                <li key={line} className="flex flex-col gap-0.5 text-sm">
                  <span className="text-meta truncate text-xs">
                    {t("line", { line })}: {rawLines[line - 1]?.trim()}
                  </span>
                  {found.map((p, i) => (
                    <span key={i} className="text-destructive">
                      {t(`problem.${p.code}`, { value: p.value ?? "", other: p.other ?? 0 })}
                    </span>
                  ))}
                </li>
              ))}
          </ul>
        </div>
      )}

      {parsed.lines.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t("previewTitle")}</p>
          <p className="text-meta text-xs">
            {t("summary", {
              riders: parsed.lines.length,
              parents,
              links: addressesIn(parsed.lines).length,
            })}
            {parsed.blank > 0 && ` ${t("blank", { count: parsed.blank })}`}
          </p>
          <ul className="border-border divide-hairline flex flex-col divide-y rounded-lg border">
            {parsed.lines.map(({ line, rider, parents: theirs }) => (
              <li key={line} className="flex flex-col gap-0.5 px-3 py-2">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold">{rider.name}</span>
                  <span className="text-meta text-xs">
                    {t("riderMeta", {
                      year: rider.birthYear,
                      class: classText(
                        { birthYear: rider.birthYear, categoryOverride: null },
                        today,
                        classes,
                      ),
                    })}
                  </span>
                </span>
                <span className="text-meta text-xs break-all">{rider.email ?? t("noLink")}</span>
                {theirs.length > 0 && (
                  <span className="text-meta text-xs break-all">
                    {t("parents", {
                      names: theirs.map((p) => `${p.name} (${p.email ?? t("noLink")})`).join(", "),
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
