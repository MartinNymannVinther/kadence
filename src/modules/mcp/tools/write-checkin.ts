import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { addDaysIso } from "@/core/dates";
import { checkins } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { defineTool, ToolRefusal } from "../tool";
import { logged, pictureNow, UNDO_WORDS } from "./own";

const scale = z.number().int().min(1).max(5);

export const saveMyCheckin = defineTool({
  name: "save_my_checkin",
  title: "Save my check-in",
  description:
    "Saves the rider's own check-in for today or yesterday, replacing one already there. Scales run 1-5 with 5 the good end; pain follows the ATK ladder 0-3. Ask the rider; never guess their answers.",
  input: z.object({
    date: z.iso.date().describe("Today or yesterday, YYYY-MM-DD."),
    sleepHours: z.number().min(0).max(24).nullable().default(null),
    sleepQuality: scale,
    energy: scale,
    mood: scale,
    soreness: scale,
    stress: scale,
    pain: z.number().int().min(0).max(3).default(0),
    painWhere: z.string().max(200).default(""),
    ill: z.boolean().default(false),
    note: z.string().max(2000).default(""),
  }),
  scope: "kadence:read",
  permission: "write_checkin",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const { date, ill, ...answers } = input;
    if (date !== caller.today && date !== addDaysIso(caller.today, -1))
      throw new ToolRefusal("A check-in can be saved for today or yesterday only.");
    const idOf = async () =>
      withOrgContext(caller.ctx, async (tx) => {
        const [row] = await tx
          .select({ id: checkins.id })
          .from(checkins)
          .where(and(eq(checkins.riderId, caller.riderId), eq(checkins.onDate, date)));
        return row?.id ?? null;
      });
    const existing = await idOf();
    const before = existing ? await pictureNow(caller, "checkin", existing) : null;
    await saveCheckin(caller.ctx, {
      riderId: caller.riderId,
      onDate: date,
      ill: ill ? 1 : 0,
      ...answers,
    });
    const id = existing ?? (await idOf());
    if (id)
      await logged(
        caller,
        "save_my_checkin",
        "checkin",
        id,
        before ? "updated" : "created",
        before,
      );
    return { saved: date, note: UNDO_WORDS };
  },
});
