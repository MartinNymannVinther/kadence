import { z } from "zod";
import { CHANGE_REASONS } from "@/modules/training/change-reasons";
import { moveSession, skipSession, unskipSession } from "@/modules/training/session-move";
import { defineTool } from "../tool";
import { logged, ownPicture, UNDO_WORDS } from "./own";

const Why = {
  reason: z
    .enum(CHANGE_REASONS)
    .nullable()
    .default(null)
    .describe(
      "Why, if the rider says: ill, pain, tired, school (school or work), weather, time, travel, other.",
    ),
  note: z.string().max(500).default("").describe("The rider's own words; the coach reads them."),
};

export const moveMySession = defineTool({
  name: "move_my_session",
  title: "Move a session",
  description:
    "Moves one of the rider's own planned sessions (pas) to another day, with the reason if the rider gives one. The coach sees the change.",
  input: z.object({ sessionId: z.string().min(1).max(100), toDate: z.iso.date(), ...Why }),
  scope: "kadence:read",
  permission: "write_move_skip",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "planned_session", input.sessionId);
    await moveSession(caller.ctx, input.sessionId, input.toDate, false, undefined, input);
    await logged(caller, "move_my_session", "planned_session", input.sessionId, "updated", before);
    return { moved: input.sessionId, to: input.toDate, note: UNDO_WORDS };
  },
});

export const skipMySession = defineTool({
  name: "skip_my_session",
  title: "Skip a session",
  description:
    "Skips one of the rider's own planned sessions: it stays in the calendar, grey, with the reason, and counts in no planned hours. The coach sees it.",
  input: z.object({ sessionId: z.string().min(1).max(100), ...Why }),
  scope: "kadence:read",
  permission: "write_move_skip",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "planned_session", input.sessionId);
    await skipSession(caller.ctx, input.sessionId, input);
    await logged(caller, "skip_my_session", "planned_session", input.sessionId, "updated", before);
    return { skipped: input.sessionId, note: UNDO_WORDS };
  },
});

export const unskipMySession = defineTool({
  name: "unskip_my_session",
  title: "Plan a skipped session again",
  description: "Plans one of the rider's own skipped sessions again.",
  input: z.object({ sessionId: z.string().min(1).max(100) }),
  scope: "kadence:read",
  permission: "write_move_skip",
  role: "rider",
  readOnly: false,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "planned_session", input.sessionId);
    await unskipSession(caller.ctx, input.sessionId);
    await logged(
      caller,
      "unskip_my_session",
      "planned_session",
      input.sessionId,
      "updated",
      before,
    );
    return { planned: input.sessionId, note: UNDO_WORDS };
  },
});
