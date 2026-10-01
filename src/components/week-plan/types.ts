import type { TemplateOption } from "@/components/calendar/template-picker";
import type { DraftValue } from "@/components/workouts/session-draft";
import type { ClassBasis } from "@/modules/dcu";
import type { PlanItemInputT } from "@/modules/training/week-plan";

/**
 * The week planner's own words (ADR 0043): a session of the plan on a
 * day of the week (0 is Monday) — one of the library's, or one built in
 * the planner — and a rider as the planner chooses them, by class.
 */

export type PlanItem = { key: string; day: number } & (
  | { kind: "template"; templateId: string; name: string; sport: string; minutes: number }
  | { kind: "built"; session: DraftValue }
);

export type PlanRider = { id: string; name: string; basis: ClassBasis | null };

export const newKey = () => Math.random().toString(36).slice(2, 10);

/** What the server is sent for an item: its day and either the template or the session. */
export function toInput(item: PlanItem): PlanItemInputT {
  return item.kind === "template"
    ? { kind: "template", day: item.day, templateId: item.templateId }
    : { kind: "built", day: item.day, session: item.session };
}

/** What the server sent back, as the planner holds it; a template no longer there drops out. */
export function fromInput(input: PlanItemInputT, templates: TemplateOption[]): PlanItem | null {
  if (input.kind === "built") return { key: newKey(), ...input };
  const template = templates.find((t) => t.id === input.templateId);
  return template
    ? {
        key: newKey(),
        day: input.day,
        kind: "template",
        templateId: template.id,
        name: template.name,
        sport: template.sport,
        minutes: template.plannedMinutes,
      }
    : null;
}

export function itemTitle(item: PlanItem): string {
  return item.kind === "template" ? item.name : item.session.title;
}

export function itemSport(item: PlanItem): string {
  return item.kind === "template" ? item.sport : item.session.sport;
}

export function itemMinutes(item: PlanItem): number {
  return item.kind === "template" ? item.minutes : item.session.plannedMinutes;
}
