import type { TemplateOption } from "@/components/calendar/template-picker";
import type { DraftValue } from "@/components/workouts/session-draft";
import type { PlanBasis } from "@/modules/paradigms";
import type { BlockItemInputT } from "@/modules/training/blocks";
import type { PlanItemInputT } from "@/modules/training/week-plan";
import type { WeekPlanDraftPayloadT } from "@/modules/training/week-plan-draft";

/**
 * The week planner's own words (ADR 0043): a session of the plan on a
 * day of the week (0 is Monday) — one of the library's, or one built in
 * the planner — with when and where it starts (ADR 0058), and a rider as
 * the planner chooses them, by class.
 */

export type PlanItem = {
  key: string;
  day: number;
  /** "17:30"; missing in a plan kept on the device before time and place were. */
  startTime?: string | null;
  meetingPlace?: string;
} & (
  | { kind: "template"; templateId: string; name: string; sport: string; minutes: number }
  | { kind: "built"; session: DraftValue }
);

export type PlanRider = { id: string; name: string; basis: PlanBasis | null };

/** A block of the library as the planner starts from it: its items on the block's days. */
export type PlanBlock = { id: string; name: string; weeks: number; items: PlanItemInputT[] };

export const newKey = () => Math.random().toString(36).slice(2, 10);

/** What the server is sent for an item: its day, when and where, and the template or the session. */
export function toInput(item: PlanItem): PlanItemInputT {
  const at = { startTime: item.startTime ?? null, meetingPlace: item.meetingPlace ?? "" };
  return item.kind === "template"
    ? { kind: "template", day: item.day, templateId: item.templateId, ...at }
    : { kind: "built", day: item.day, session: item.session, ...at };
}

/** What the server sent back, as the planner holds it; a template no longer there drops out. */
export function fromInput(input: PlanItemInputT, templates: TemplateOption[]): PlanItem | null {
  const at = { startTime: input.startTime ?? null, meetingPlace: input.meetingPlace ?? "" };
  if (input.kind === "built")
    return {
      key: newKey(),
      day: input.day,
      kind: "built",
      session: { ...input.session, plannedKm: input.session.plannedKm ?? null },
      ...at,
    };
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
        ...at,
      }
    : null;
}

/** The planner's week as the server keeps the shared draft (ADR 0043, amended 2026-10-07). */
export function toDraftPayload(draft: {
  riderIds: string[];
  items: PlanItem[];
}): WeekPlanDraftPayloadT {
  return { riderIds: draft.riderIds, items: draft.items.map(toInput) };
}

/** The shared draft as the planner holds it; a template no longer there drops out. */
export function fromDraftPayload(
  payload: WeekPlanDraftPayloadT,
  templates: TemplateOption[],
): { riderIds: string[]; items: PlanItem[] } {
  return {
    riderIds: payload.riderIds,
    items: payload.items.flatMap((input) => fromInput(input, templates) ?? []),
  };
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

/**
 * An item as a block keeps it ("Gem som forløb", ADR 0059): the library's
 * session by its id, a session built here as the block's own.
 */
export function toBlockItem(item: PlanItem): BlockItemInputT {
  const at = { startTime: item.startTime ?? null, meetingPlace: item.meetingPlace ?? "" };
  if (item.kind === "template") return { day: item.day, templateId: item.templateId, ...at };
  const { sport, title, description, structure, plannedMinutes } = item.session;
  return {
    day: item.day,
    session: { sport, title, description, structure, plannedMinutes },
    ...at,
  };
}
