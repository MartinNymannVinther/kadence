import { addDaysIso, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { phaseOf, strengthFrequency } from "@/modules/dcu";
import { createBlock } from "@/modules/training/blocks";
import type { BlockItemInputT } from "@/modules/training/blocks";
import { scheduleTemplate } from "@/modules/training/group";
import type { TimePlace } from "@/modules/training/time-place";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { ridersSince } from "./history";
import { BLOCK_OWN_SESSION, pick, TEMPLATES, type L } from "./seed-data";

/** The weeks whose rides are real files; earlier ones are ticked off by hand (seed.ts). */
export const WEEKS_BACK = 6;

type Slot = { day: number; template: string; at?: TimePlace };

/**
 * The library's block "Vinterblok, 4 uger" and the same week laid into
 * the calendar from `WEEKS_BACK` weeks ago to next week: two strength
 * sessions, a VO2 or AT day, a tempo day and two endurance rides, with
 * DCU's October break ("pause + frit") when the demo opens in it.
 *
 * Returns the Monday the calendar was filled from, so the rides built
 * afterwards (seed.ts) know how far back to look.
 */
export async function scheduleWeeks(
  ctx: OrgContext,
  l: L,
  args: {
    templates: Record<string, string>;
    strength: { id: string } | undefined;
    riderIds: string[];
    today: string;
  },
): Promise<{ firstMonday: string }> {
  const { templates, strength, riderIds, today } = args;
  const byText = (text: string) => templates[text]!;
  // The team rides Tuesday's intervals and Saturday's long ride together (ADR 0058).
  const clubhouse = pick({ da: "Klubhuset", en: "The clubhouse" }, l);
  const at = (startTime: string): TimePlace => ({ startTime, meetingPlace: clubhouse });
  const week: Slot[] = [
    { day: 1, template: byText(TEMPLATES[1]!.text), at: at("17:30") },
    { day: 2, template: byText(TEMPLATES[0]!.text) },
    { day: 3, template: byText(TEMPLATES[5]!.text) },
    { day: 5, template: byText(TEMPLATES[0]!.text), at: at("09:00") },
    { day: 6, template: byText(TEMPLATES[3]!.text) },
  ];
  // The coach once built this session in the planner itself for this
  // block's first week and kept it when the week was saved as a block
  // (ADR 0059, drizzle/0027): no template, its own time and place.
  const ownSession: BlockItemInputT = {
    day: 4,
    session: {
      sport: "bike",
      title: pick(BLOCK_OWN_SESSION.name, l),
      description: BLOCK_OWN_SESSION.text,
      structure: parseWorkoutText(BLOCK_OWN_SESSION.text)!,
      plannedMinutes: 0,
    },
    startTime: "16:00",
    meetingPlace: pick(BLOCK_OWN_SESSION.place, l),
  };
  // The same week as a block in the library: four weeks, ready to lay in.
  const blockItems: BlockItemInputT[] = Array.from({ length: 4 }, (_, w) => [
    ...week.map((slot, i): BlockItemInputT => ({
      day: w * 7 + slot.day,
      templateId: w % 2 === 1 && i === 0 ? byText(TEMPLATES[2]!.text) : slot.template,
      ...slot.at,
    })),
    ...(strength
      ? [
          { day: w * 7, templateId: strength.id },
          { day: w * 7 + 3, templateId: strength.id },
        ]
      : []),
    ...(w === 0 ? [ownSession] : []),
  ]).flat();
  await createBlock(ctx, {
    name: pick({ da: "Vinterblok, 4 uger", en: "Winter block, 4 weeks" }, l),
    description: pick(
      {
        da: "To styrkepas, en VO2- eller AT-dag, en tempodag og to grundture om ugen.",
        en: "Two strength sessions, a VO2 or AT day, a tempo day and two endurance rides a week.",
      },
      l,
    ),
    weeks: 4,
    items: blockItems,
  });

  // DCU's October is "pause + frit": short, easy rides every other day and
  // nothing hard, so a demo opened in October plans that, not a full week.
  const breakWeek: Slot[] = [
    { day: 1, template: byText(TEMPLATES[3]!.text) },
    { day: 3, template: byText(TEMPLATES[6]!.text) },
    { day: 5, template: byText(TEMPLATES[6]!.text), at: at("10:00") },
  ];
  const firstMonday = addDaysIso(mondayOf(today), -7 * WEEKS_BACK);
  await ridersSince(ctx, riderIds, firstMonday);
  for (let w = 0; w <= WEEKS_BACK + 1; w++) {
    const monday = addDaysIso(firstMonday, 7 * w);
    const inBreak = phaseOf(Number(addDaysIso(monday, 3).slice(5, 7))) === "break";
    for (const [i, slot] of (inBreak ? breakWeek : week).entries()) {
      const template =
        !inBreak && w % 2 === 1 && i === 0 ? byText(TEMPLATES[2]!.text) : slot.template;
      const day = addDaysIso(monday, slot.day);
      await scheduleTemplate(ctx, template, riderIds, day, undefined, slot.at);
    }
    if (strength) {
      const perWeek = strengthFrequency(monday).perWeekMin;
      for (let s = 0; s < perWeek; s++)
        await scheduleTemplate(ctx, strength.id, riderIds, addDaysIso(monday, s === 0 ? 0 : 3));
    }
  }

  return { firstMonday };
}
