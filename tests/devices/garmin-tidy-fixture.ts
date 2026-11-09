import type { Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { setAutoSend } from "@/modules/devices/auto-send";
import { saveLink } from "@/modules/devices/links";
import { insertSql, seedPerson } from "../helpers/rows";
import type { GarminCalendar } from "./garmin-calendar-fixture";

/**
 * A team for the tests of Kadence's tidy on Garmin (docs/adr/0115): ane
 * and dy send by themselves, bo turned it off and has a session tomorrow,
 * cy did not let Garmin take workouts. Garmin links other test files left
 * behind send nothing while these run, and what they sent is not these
 * files' to tidy.
 */

export const TODAY = todayInCopenhagen();
export const day = (n: number) => addDaysIso(TODAY, n);
const PEOPLE = ["ane", "bo", "cy", "dy"] as const;
const bike = {
  kind: "bike",
  steps: [{ kind: "step", intent: "steady", seconds: 1800, target: { kind: "zone", zone: 2 } }],
};

export type Row = {
  id: string;
  day: string;
  last_error: string;
  session: string | null;
  updated_at: Date;
};

export function tidyTeam(admin: Pool, tag: string) {
  const org = `org_${tag}`;
  const ctx = (who: string) => ({ orgId: org, userId: `user_${tag}_${who}` });

  async function session(id: string, who: string, offset: number) {
    const q = insertSql("planned_sessions", {
      org_id: org,
      id,
      rider_id: `${tag}_${who}`,
      on_date: day(offset),
      sport: "bike",
      title: id,
      structure: bike,
    });
    await admin.query(q.text, q.values);
  }

  async function seed() {
    await seedPerson(admin, org, `user_${tag}_coach`, "owner");
    for (const who of PEOPLE) {
      await seedPerson(admin, org, ctx(who).userId, "member");
      const q = insertSql("riders", {
        org_id: org,
        id: `${tag}_${who}`,
        user_id: ctx(who).userId,
        name: who,
        birth_year: 2009,
        ftp_watts: 240,
      });
      await admin.query(q.text, q.values);
      await saveLink(
        ctx(who),
        "garmin",
        `${tag}-${who}`,
        {
          accessToken: `acc-${who}`,
          refreshToken: null,
          expiresAt: new Date(Date.now() + 3600_000),
        },
        who === "cy" ? ["ACTIVITY_EXPORT"] : ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"],
      );
    }
    await setAutoSend(ctx("bo"), "garmin", false);
    await session(`${tag}_bo_ride`, "bo", 1);
    await admin.query(
      "update device_links set auto_send = false where provider = 'garmin' and org_id <> $1",
      [org],
    );
    await admin.query("delete from device_workouts where provider = 'garmin' and org_id <> $1", [
      org,
    ]);
  }

  /** A workout Kadence sent for `offset` days from today: on Garmin's calendar, unless `gone`. */
  async function sent(
    garmin: GarminCalendar,
    who: string,
    id: number,
    offset: number,
    options: { gone?: boolean; session?: string } = {},
  ) {
    const q = insertSql("device_workouts", {
      org_id: org,
      rider_id: `${tag}_${who}`,
      planned_session_id: options.session ?? null,
      provider: "garmin",
      external_workout_id: String(id),
      external_schedule_id: String(id + 1000),
      scheduled_on: day(offset),
    });
    await admin.query(q.text, q.values);
    if (options.gone) return;
    garmin.workouts.set(String(id), { workoutName: "Pas" });
    garmin.schedules.set(String(id + 1000), { workoutId: String(id), date: day(offset) });
  }

  /** The rider's rows, latest day first, every column a test may compare. */
  async function rows(who: string): Promise<Row[]> {
    const { rows: found } = await admin.query(
      `select external_workout_id as id, scheduled_on::text as day, last_error,
              planned_session_id as session, updated_at
       from device_workouts where rider_id = $1 order by scheduled_on desc`,
      [`${tag}_${who}`],
    );
    return found as Row[];
  }

  const clear = () => admin.query("delete from device_workouts where org_id = $1", [org]);

  return { org, seed, session, sent, rows, clear };
}
