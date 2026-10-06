import type { BlockItem, BlockItemInputT } from "./blocks";
import type { PlanItemInputT } from "./week-plan";

/**
 * A block's item in the shapes the rest of the planning speaks (ADR 0059):
 * as the block's own input, for the editor to save it back unchanged, and
 * as the week planner's item, for "Start fra: Et forløb". A session from
 * the library stays the library's; one kept in the block stays its own.
 *
 * Pure: imports nothing from the database.
 */

export function blockItemInput(item: BlockItem): BlockItemInputT {
  const at = { startTime: item.startTime, meetingPlace: item.meetingPlace };
  if (item.templateId || !item.session)
    return { day: item.day, templateId: item.templateId ?? "", ...at };
  return {
    day: item.day,
    ...at,
    session: {
      sport: item.sport,
      title: item.title,
      description: item.session.description,
      structure: item.session.structure,
      plannedMinutes: item.plannedMinutes,
    },
  };
}

/** The item as the planner's, on its day of the block (0 is the first Monday). */
export function blockPlanItem(item: BlockItem): PlanItemInputT {
  const at = { startTime: item.startTime, meetingPlace: item.meetingPlace };
  if (item.templateId || !item.session)
    return { kind: "template", day: item.day, templateId: item.templateId ?? "", ...at };
  return {
    kind: "built",
    day: item.day,
    ...at,
    session: {
      sport: item.sport,
      title: item.title,
      description: item.session.description,
      structure: item.session.structure,
      plannedMinutes: item.plannedMinutes,
      plannedKm: null,
    },
  };
}
