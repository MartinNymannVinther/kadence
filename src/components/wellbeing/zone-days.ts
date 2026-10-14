import { addDaysIso } from "@/core/dates";
import { checkinZone, type WellbeingZone } from "@/modules/load/wellbeing";

/**
 * The last `days` days, oldest first, each with the zone of its check-in
 * or null for a day without one (src/modules/load/wellbeing.ts). Pure.
 */

export type ZoneDay = { date: string; zone: WellbeingZone | null };

type CheckinLike = {
  onDate: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  energy: number | null;
  mood: number | null;
  soreness: number | null;
  stress: number | null;
  pain: number;
  painWhere?: string | null;
  /** Known pains ticked "som det plejer" (docs/adr/0097): they do not colour the day. */
  usualPains?: readonly { place: string; level: number }[] | null;
  ill: number;
};

export function zoneDays(checkins: readonly CheckinLike[], today: string, days = 14): ZoneDay[] {
  const byDate = new Map(checkins.map((c) => [c.onDate, c]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysIso(today, i - days + 1);
    const checkin = byDate.get(date);
    return { date, zone: checkin ? checkinZone(checkin).zone : null };
  });
}
