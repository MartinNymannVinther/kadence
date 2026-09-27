import type { Structure } from "@/modules/workouts/structure";
import type { DraftProblem } from "./session-draft";

/**
 * Where a draft does not hold, in words: "Trin 3: varighed", "Gentagelse
 * 1 → trin 2: kadence", "Øvelse 2: navn". Read from the first zod issue's
 * path; a field the builder has no word for is left out rather than named
 * in code.
 */

type Translate = (key: string, values?: Record<string, string | number>) => string;

const FIELDS = new Set([
  "seconds",
  "target",
  "low",
  "high",
  "cadenceLow",
  "cadenceHigh",
  "label",
  "times",
  "name",
  "sets",
  "reps",
  "load",
  "restSeconds",
  "note",
  "from",
  "to",
  "minutes",
  "warmup",
  "text",
]);

export function problemText(problem: DraftProblem, structure: Structure, t: Translate): string {
  if (problem.kind === "title") return t("title");
  const parts: string[] = [];
  let field: string | null = null;
  let node: unknown = structure;
  const path = problem.path;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const next = path[i + 1];
    if (
      (key === "steps" || key === "exercises" || key === "progression") &&
      typeof next === "number"
    ) {
      const list = (node as Record<string, unknown[]>)[key] ?? [];
      const item = list[next] as { kind?: string } | undefined;
      const same = list
        .slice(0, next + 1)
        .filter((x) => (x as { kind?: string }).kind === item?.kind);
      const where =
        key === "exercises"
          ? t("where.exercise", { n: next + 1 })
          : key === "progression"
            ? t("where.rule", { n: next + 1 })
            : item?.kind === "repeat"
              ? t("where.repeat", { n: same.length })
              : t("where.step", {
                  n: key === "steps" && node !== structure ? next + 1 : same.length,
                });
      parts.push(where);
      node = item;
      i++;
    } else if (typeof key === "string" && FIELDS.has(key)) {
      field = key;
    }
  }
  const where = parts.join(" → ");
  const what = field ? t(`field.${field}`) : "";
  return t("structure", { where: [where, what].filter(Boolean).join(": ") || t("where.session") });
}
