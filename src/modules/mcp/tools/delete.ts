import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { activityFiles, checkins, plannedSessions } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { deleteActivity } from "@/modules/devices/files";
import { loadFile } from "@/modules/storage/keep";
import { deleteSession } from "@/modules/training/sessions";
import { requireWriteFor } from "@/modules/team/access";
import { defineTool, ToolRefusal, type Caller } from "../tool";
import { logged, ownPicture, UNDO_WORDS } from "./own";

/**
 * Deleting, each kind behind a switch of its own (docs/adr/0120): the
 * rider's own sessions, activities entered by hand, rides from a file or a
 * device, and check-ins. Each is kept whole for 30 days — a ride with its
 * file and the session it was laid on — so "Fortryd" brings it back.
 */

const Id = z.object({ id: z.string().min(1).max(100) });

export const deleteMySession = defineTool({
  name: "delete_my_session",
  title: "Delete a session",
  description:
    "Deletes one of the rider's own planned sessions (pas). To leave it out but keep it visible, use skip_my_session instead.",
  input: Id,
  scope: "kadence:read",
  permission: "delete_sessions",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "planned_session", input.id);
    await deleteSession(caller.ctx, input.id, "one");
    await logged(caller, "delete_my_session", "planned_session", input.id, "deleted", before);
    return { deleted: input.id, note: UNDO_WORDS };
  },
});

/** A ride's file and the session it was laid on, kept with the picture. */
async function keptFile(caller: Caller, activityId: string) {
  return withOrgContext(caller.ctx, async (tx) => {
    const [file] = await tx
      .select()
      .from(activityFiles)
      .where(eq(activityFiles.activityId, activityId));
    const [session] = await tx
      .select({ id: plannedSessions.id })
      .from(plannedSessions)
      .where(eq(plannedSessions.activityId, activityId));
    const bytes = file ? await loadFile({ bytes: file.bytes, storageKey: file.storageKey }) : null;
    return {
      meta: { fileName: file?.fileName, sha256: file?.sha256, sessionId: session?.id ?? null },
      bytes: bytes ?? new Uint8Array(),
    };
  });
}

async function deleteOwnActivity(caller: Caller, id: string, manual: boolean, tool: string) {
  const before = await ownPicture(caller, "activity", id);
  if ((before.source === "manual") !== manual)
    throw new ToolRefusal(
      manual
        ? "That is a ride from a file or a device; delete_my_ride deletes those."
        : "That was entered by hand; delete_my_manual_activity deletes those.",
    );
  const file = await keptFile(caller, id);
  await deleteActivity(caller.ctx, id);
  await logged(caller, tool, "activity", id, "deleted", before, file);
  return { deleted: id, note: UNDO_WORDS };
}

export const deleteMyManualActivity = defineTool({
  name: "delete_my_manual_activity",
  title: "Delete an activity entered by hand",
  description:
    "Deletes one of the rider's own activities that was entered by hand, not from a file.",
  input: Id,
  scope: "kadence:read",
  permission: "delete_manual",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: (caller, input) => deleteOwnActivity(caller, input.id, true, "delete_my_manual_activity"),
});

export const deleteMyRide = defineTool({
  name: "delete_my_ride",
  title: "Delete a ride",
  description:
    "Deletes one of the rider's own rides that came from a file or a device, with its file. Kadence keeps it for 30 days so the rider can undo it.",
  input: Id,
  scope: "kadence:read",
  permission: "delete_rides",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: (caller, input) => deleteOwnActivity(caller, input.id, false, "delete_my_ride"),
});

export const deleteMyCheckin = defineTool({
  name: "delete_my_checkin",
  title: "Delete a check-in",
  description: "Deletes the rider's own check-in for one day.",
  input: z.object({ date: z.iso.date() }),
  scope: "kadence:read",
  permission: "delete_checkins",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const id = await withOrgContext(caller.ctx, async (tx) => {
      const [row] = await tx
        .select({ id: checkins.id })
        .from(checkins)
        .where(and(eq(checkins.riderId, caller.riderId), eq(checkins.onDate, input.date)));
      return row?.id ?? null;
    });
    if (!id) throw new ToolRefusal("No check-in of yours that day.");
    const before = await ownPicture(caller, "checkin", id);
    await withOrgContext(caller.ctx, async (tx) => {
      await requireWriteFor(tx, caller.ctx, caller.riderId);
      const gone = await tx
        .delete(checkins)
        .where(eq(checkins.id, id))
        .returning({ id: checkins.id });
      if (gone.length === 0) throw new Refused("notFound");
    });
    await logged(caller, "delete_my_checkin", "checkin", id, "deleted", before);
    return { deleted: input.date, note: UNDO_WORDS };
  },
});
