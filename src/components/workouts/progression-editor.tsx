"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ProgressionRule } from "@/modules/workouts/structure";
import { newRule } from "./defaults";
import { GroupSelect } from "./group-select";
import { removeItem, replaceItem } from "./list-ops";
import { NumberField } from "./number-field";
import { TextField } from "./text-field";

/**
 * A programme's progression as a compact table: from session "fra" to
 * session "til" (empty is "and on"), a group is done as so many sets of so
 * many reps at that load. DCU's leg programme reads 1–8: 3 × 16, 9–16:
 * 3 × 12, 17 on: 4 × 6–8 RM. On a phone the table scrolls sideways.
 */
export function ProgressionEditor({
  rules,
  onChange,
}: {
  rules: ProgressionRule[];
  onChange: (rules: ProgressionRule[]) => void;
}) {
  const t = useTranslations("workouts.progression");
  const heads = [t("group"), t("from"), t("to"), t("sets"), t("reps"), t("load"), ""];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {rules.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-separate border-spacing-x-1.5 border-spacing-y-1 text-sm">
            <thead>
              <tr>
                {heads.map((head, i) => (
                  <th key={i} scope="col" className="text-label text-left text-xs font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => {
                const set = <K extends keyof ProgressionRule>(key: K, value: ProgressionRule[K]) =>
                  onChange(replaceItem(rules, i, { ...rule, [key]: value }));
                const row = t("rowName", { n: i + 1 });
                return (
                  <tr key={i}>
                    <td className="w-32">
                      <GroupSelect
                        label={`${row}: ${t("group")}`}
                        hideLabel
                        value={rule.group}
                        onChange={(v) => set("group", v)}
                      />
                    </td>
                    <td className="w-20">
                      <NumberField
                        label={`${row}: ${t("from")}`}
                        hideLabel
                        value={rule.from}
                        min={1}
                        max={200}
                        onChange={(v) => set("from", Math.max(1, v))}
                      />
                    </td>
                    <td className="w-20">
                      <NumberField
                        label={`${row}: ${t("to")}`}
                        hideLabel
                        value={rule.to}
                        min={1}
                        max={200}
                        onChange={(v) => set("to", Math.max(1, v))}
                        onClear={() => set("to", null)}
                      />
                    </td>
                    <td className="w-16">
                      <NumberField
                        label={`${row}: ${t("sets")}`}
                        hideLabel
                        value={rule.sets}
                        min={1}
                        max={10}
                        onChange={(v) => set("sets", Math.max(1, v))}
                      />
                    </td>
                    <td className="w-24">
                      <TextField
                        label={`${row}: ${t("reps")}`}
                        hideLabel
                        value={rule.reps}
                        maxLength={20}
                        onChange={(v) => set("reps", v)}
                      />
                    </td>
                    <td>
                      <TextField
                        label={`${row}: ${t("load")}`}
                        hideLabel
                        value={rule.load}
                        maxLength={40}
                        onChange={(v) => set("load", v)}
                      />
                    </td>
                    <td className="w-11">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive size-11 sm:size-9"
                        aria-label={t("remove", { n: i + 1 })}
                        title={t("remove", { n: i + 1 })}
                        onClick={() => onChange(removeItem(rules, i))}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start max-sm:h-11"
        disabled={rules.length >= 30}
        onClick={() => onChange([...rules, newRule((rules.at(-1)?.to ?? 0) + 1)])}
      >
        <Plus data-icon="inline-start" />
        {t("add")}
      </Button>
    </div>
  );
}
