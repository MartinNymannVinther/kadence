import { createTranslator } from "next-intl";
import type { Pool } from "pg";
import type { Translate } from "@/modules/exercises/resolve";
import { JOINTS, type Pose } from "@/modules/exercises/types";
import type { TeamExerciseDraft } from "@/modules/exercises/team-exercises";
import da from "../../messages/da.json";
import { insertSql, seedPerson } from "../helpers/rows";

/** What the team exercise tests share: a team with a coach, a rider and a parent, and a valid exercise. */

export const POSE: Pose = {
  joints: Object.fromEntries(
    JOINTS.map((joint, i) => [joint, [100 + i, 20 + i * 9]]),
  ) as Pose["joints"],
  hidden: [],
  props: [{ kind: "floor", y: 122 }],
  arrows: [{ from: [150, 60], to: [130, 60], bend: 0 }],
};

export const PLANK: TeamExerciseDraft = {
  name: "Planke",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 45 },
  how: "Hold kroppen lige som en planke.",
  why: "En stærk midte bærer benene.",
  pose: POSE,
};

/** Danish words for `exercises`, as a page would hand them over. */
export function danish(): Translate {
  const t = createTranslator({ locale: "da", messages: da, namespace: "exercises" });
  return (key) => (t as unknown as (k: string) => string)(key);
}

export type Team = {
  coach: { orgId: string; userId: string };
  rider: { orgId: string; userId: string };
  parent: { orgId: string; userId: string };
};

/** A team with a coach, a rider with an account and that rider's confirmed parent. */
export async function seedTeam(admin: Pool, key: string): Promise<Team> {
  const orgId = `org_${key}`;
  const coach = await seedPerson(admin, orgId, `user_${key}_coach`, "owner");
  const rider = await seedPerson(admin, orgId, `user_${key}_rider`, "member");
  const parent = await seedPerson(admin, orgId, `user_${key}_parent`, "member");
  for (const [table, values] of [
    ["riders", { id: `${key}_rider`, user_id: rider.userId, name: "Ida", birth_year: 2010 }],
    [
      "guardians",
      { rider_id: `${key}_rider`, user_id: parent.userId, name: "Mor", confirmed_at: new Date() },
    ],
  ] as const) {
    const q = insertSql(table, { org_id: orgId, ...values });
    await admin.query(q.text, q.values);
  }
  return { coach, rider, parent };
}
