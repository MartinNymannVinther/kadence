import { z } from "zod";
import { readStructure } from "@/modules/workouts/structure";
import { createSession, getSession, updateSession } from "@/modules/training/sessions";
import { SessionInput } from "@/modules/training/vocabulary";
import { defineTool, ToolRefusal } from "../tool";
import { logged, ownPicture, UNDO_WORDS } from "./own";

const Sport = z.enum(["bike", "strength", "other"]);
const Workout = z
  .string()
  .max(500)
  .default("")
  .describe(
    "The session in a coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause' or '2 t Z2'.",
  );

export const addMySession = defineTool({
  name: "add_my_session",
  title: "Add a session to my calendar",
  description:
    "Lays a new planned session (pas) in the rider's own calendar. A coach's plan is the coach's; this adds the rider's own.",
  input: z.object({
    date: z.iso.date(),
    sport: Sport,
    title: z.string().min(1).max(120),
    minutes: z.number().int().min(0).max(1440).default(0),
    description: z.string().max(2000).default(""),
    workout: Workout,
  }),
  scope: "kadence:read",
  permission: "write_sessions",
  role: "rider",
  readOnly: false,
  run: async (caller, input) => {
    const made = await createSession(
      caller.ctx,
      SessionInput.parse({
        riderId: caller.riderId,
        onDate: input.date,
        sport: input.sport,
        title: input.title,
        description: input.description,
        structure: readStructure({ text: input.workout, minutes: input.minutes }, input.sport),
        plannedMinutes: input.minutes,
      }),
    );
    await logged(caller, "add_my_session", "planned_session", made.id, "created", null);
    return { added: made.id, note: UNDO_WORDS };
  },
});

export const updateMySession = defineTool({
  name: "update_my_session",
  title: "Change a session",
  description:
    "Changes the title, description, minutes or workout of one of the rider's own planned sessions. Fields left out stay as they are. To move it to another day, use move_my_session.",
  input: z.object({
    sessionId: z.string().min(1).max(100),
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    minutes: z.number().int().min(0).max(1440).optional(),
    workout: z.string().max(500).optional(),
  }),
  scope: "kadence:read",
  permission: "write_sessions",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "planned_session", input.sessionId);
    const now = await getSession(caller.ctx, input.sessionId);
    if (!now) throw new ToolRefusal("No such session of yours.");
    const sport = now.sport as z.infer<typeof Sport>;
    const minutes = input.minutes ?? now.plannedMinutes;
    await updateSession(
      caller.ctx,
      input.sessionId,
      {
        sport,
        title: input.title ?? now.title,
        description: input.description ?? now.description,
        structure:
          input.workout !== undefined
            ? readStructure({ text: input.workout, minutes }, sport)
            : readStructure(now.structure, sport),
        plannedMinutes: minutes,
        plannedKm: now.plannedKm,
        templateId: now.templateId,
      },
      "one",
    );
    await logged(
      caller,
      "update_my_session",
      "planned_session",
      input.sessionId,
      "updated",
      before,
    );
    return { changed: input.sessionId, note: UNDO_WORDS };
  },
});
