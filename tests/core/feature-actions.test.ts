import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The actions behind a parked part are refused as not found while the
 * installation has it off, and do their work the moment it is on
 * (docs/adr/0057). The session and team are resolved first, as for every
 * action: nobody signed in is told so, flag or no flag.
 */

const on = vi.hoisted(() => new Set<string>());
vi.mock("@/core/features", async (importOriginal) =>
  (await import("../helpers/features")).featuresWith(await importOriginal(), on),
);
const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { createThreadAction } = await import("@/modules/community/actions");
const { createChampionshipAction } = await import("@/modules/club/actions");

const COACH = { orgId: "org_gate_actions", userId: "user_gate_actions_coach" };
const refused = { ok: false, error: "notFound", detail: "featureOff" };
const thread = { category: "training", title: "Vinterens første uge", body: "Hvad kører I?" };
const season = { season: 2027, title: "KM 2027" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, COACH.orgId, COACH.userId, "owner", "Gate CK");
  const settings = insertSql("team_settings", { org_id: COACH.orgId, club_championship: true });
  await admin.query(settings.text, settings.values);
});

afterAll(async () => {
  await admin?.end();
});

beforeEach(() => {
  on.clear();
  auth.session = COACH;
});

describe("Trænerrummet's actions", () => {
  it("are refused while the room is off, and nothing is written", async () => {
    expect(await createThreadAction(thread)).toEqual(refused);
    const rows = await admin.query(
      "select count(*)::int as n from community_threads where author_org_id = $1",
      [COACH.orgId],
    );
    expect(rows.rows[0].n).toBe(0);
  });

  it("work while it is on", async () => {
    on.add("coachesRoom");
    expect(await createThreadAction(thread)).toMatchObject({ ok: true });
  });

  it("tell someone not signed in so, before anything else", async () => {
    auth.session = null;
    expect(await createThreadAction(thread)).toEqual({ ok: false, error: "unauthorized" });
  });
});

describe("the club championship's actions", () => {
  it("are refused while the installation has it off, whatever the team chose", async () => {
    expect(await createChampionshipAction(season)).toEqual(refused);
  });

  it("work while it is on and the team has it on", async () => {
    on.add("clubChampionship");
    expect(await createChampionshipAction(season)).toMatchObject({ ok: true });
  });
});
