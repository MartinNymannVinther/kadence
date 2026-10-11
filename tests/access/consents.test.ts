import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { Refused } from "@/core/action";
import { todayInCopenhagen } from "@/core/dates";
import {
  CONSENT_VERSION,
  giveHealthConsentAgain,
  isHealthConsentWithdrawn,
  myHealthConsent,
  recordSignupConsents,
  withdrawHealthConsent,
} from "@/modules/consent/service";
import { getCheckin, saveCheckin } from "@/modules/wellbeing/checkins";
import { addMeasurement, listMeasurements } from "@/modules/wellbeing/measurements";
import { riderDay } from "@/app/[locale]/(app)/(narrow)/today/rider-data";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";
import da from "../../messages/da.json";

/**
 * Consent in a person's own workspace (docs/adr/0088): the rows are the
 * person's own and nobody else's, a given consent changes only by being
 * withdrawn, and once the consent to health data is withdrawn the
 * wellbeing services refuse a check-in and a measurement — for the person
 * and for a child riding in their workspace — until it is given again.
 * What was stored before stays.
 */

const TODAY = todayInCopenhagen();
const YEAR = Number(TODAY.slice(0, 4));
let admin: Pool;
let app: Client;
let owner: { orgId: string; userId: string };
let child: { orgId: string; userId: string };
let other: { orgId: string; userId: string };
const OWN_RIDER = "rider_consent_own";
const CHILD_RIDER = "rider_consent_child";
const OTHER_RIDER = "rider_consent_other";

const checkin = (riderId: string, onDate = TODAY) => ({
  riderId,
  onDate,
  sleepHours: 8,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  soreness: 2,
  stress: 2,
  pain: 0,
  painWhere: "",
  ill: 0,
  note: "",
});

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "allowed";
  } catch (error) {
    return error instanceof Refused ? `${error.code}:${error.detail ?? ""}` : String(error);
  }
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  owner = await seedWorkspace(admin, "consent_owner");
  await admin.query("update organizations set kind = 'personal' where id = $1", [owner.orgId]);
  child = await seedMember(admin, owner.orgId, "consent_child");
  other = await seedWorkspace(admin, "consent_other");
  await admin.query(
    `insert into riders (id, org_id, user_id, name, birth_year) values
       ($1, $4, $5, 'Selv Rytter', $8),
       ($2, $4, $6, 'Barn Rytter', $9),
       ($3, $7, null, 'Klub Rytter', $9)`,
    [
      OWN_RIDER,
      CHILD_RIDER,
      OTHER_RIDER,
      owner.orgId,
      owner.userId,
      child.userId,
      other.orgId,
      YEAR - 20,
      YEAR - 13,
    ],
  );
  await recordSignupConsents(owner, { riderId: OWN_RIDER, locale: "da" });
});

afterAll(async () => {
  await app?.end();
  await admin.query("delete from organizations where id in ($1, $2)", [owner.orgId, other.orgId]);
  await admin.query("delete from users where id like 'user_consent_%'");
  await admin.end();
});

describe("the rows (RLS)", () => {
  it("are the person's own: the owner reads both, a member and another team read none", async () => {
    const mine = await asApp(app, owner, (c) => c.query("select kind, version from consents"));
    expect(mine.rows.sort((a, b) => a.kind.localeCompare(b.kind))).toEqual([
      { kind: "health", version: CONSENT_VERSION },
      { kind: "terms", version: CONSENT_VERSION },
    ]);
    expect((await asApp(app, child, (c) => c.query("select * from consents"))).rowCount).toBe(0);
    expect((await asApp(app, other, (c) => c.query("select * from consents"))).rowCount).toBe(0);
    expect((await asApp(app, null, (c) => c.query("select * from consents"))).rowCount).toBe(0);
  });

  it("cannot be written for another person or another team", async () => {
    const row = (orgId: string, userId: string) =>
      expectSqlError(
        asApp(app, owner, (c) =>
          c.query(
            `insert into consents (org_id, user_id, kind, version) values ($1, $2, 'health', 'x')`,
            [orgId, userId],
          ),
        ),
      );
    expect(await row(owner.orgId, child.userId)).toBe("42501");
    expect(await row(other.orgId, owner.userId)).toBe("42501");
  });

  it("change only by being withdrawn, once, and are never deleted from a request", async () => {
    const write = (sql: string) => expectSqlError(asApp(app, owner, (c) => c.query(sql)));
    expect(await write("update consents set version = '2099-01'")).toBe("42501");
    expect(await write("update consents set given_at = now() - interval '1 year'")).toBe("42501");
    expect(await write("delete from consents")).toBe("42501");
    const twice = await expectSqlError(
      asApp(app, owner, async (c) => {
        await c.query("update consents set withdrawn_at = now() where kind = 'terms'");
        await c.query("update consents set withdrawn_at = null where kind = 'terms'");
      }),
    );
    expect(twice).toBe("42501");
  });

  it("are in the workspace's audit trail", async () => {
    const { rows } = await admin.query(
      "select action from audit_log where org_id = $1 and entity_type = 'consents'",
      [owner.orgId],
    );
    expect(rows.map((r) => r.action)).toEqual(["consents.insert", "consents.insert"]);
  });
});

describe("withdrawing the consent to health data", () => {
  it("is the owner's: a member of the workspace cannot", async () => {
    expect(await refusal(withdrawHealthConsent(child))).toBe("forbidden:");
    expect(await refusal(withdrawHealthConsent(other))).toBe("forbidden:");
  });

  it("switches check-in and measurements off for everyone in the workspace, and keeps what is stored", async () => {
    await saveCheckin(owner, checkin(OWN_RIDER, "2026-01-05"));
    expect(await myHealthConsent(owner)).toMatchObject({ state: "given" });
    expect(await withdrawHealthConsent(owner)).toBe(true);
    expect(await myHealthConsent(owner)).toMatchObject({ state: "withdrawn" });
    expect(await isHealthConsentWithdrawn(owner)).toBe(true);
    // The child, who cannot read the parent's row, is answered too.
    expect(await isHealthConsentWithdrawn(child)).toBe(true);

    expect(await refusal(saveCheckin(owner, checkin(OWN_RIDER)))).toBe(
      "forbidden:consentWithdrawn",
    );
    expect(await refusal(saveCheckin(child, checkin(CHILD_RIDER)))).toBe(
      "forbidden:consentWithdrawn",
    );
    const height = {
      riderId: OWN_RIDER,
      measuredOn: TODAY,
      kind: "height_cm",
      value: 180,
      note: "",
    };
    expect(await refusal(addMeasurement(owner, height as never))).toBe(
      "forbidden:consentWithdrawn",
    );
    expect(await listMeasurements(owner, OWN_RIDER)).toEqual([]);
    expect(await getCheckin(owner, OWN_RIDER, "2026-01-05")).not.toBeNull();
  });

  it("leaves a club, which has no consent rows, alone", async () => {
    expect(await isHealthConsentWithdrawn(other)).toBe(false);
    await saveCheckin(other, checkin(OTHER_RIDER));
    expect(await getCheckin(other, OTHER_RIDER, TODAY)).not.toBeNull();
  });

  it("says so on Today, with the way back for the one who holds the consent", async () => {
    const words = { today: "i dag", yesterday: "i går", locale: "da" };
    expect((await riderDay(owner, OWN_RIDER, TODAY, words)).consent).toEqual({
      off: true,
      canGive: true,
    });
    expect((await riderDay(child, CHILD_RIDER, TODAY, words)).consent).toEqual({
      off: true,
      canGive: false,
    });
    expect(da.consent.offTitle).toBe("Check-in er slået fra");
    expect(da.consent.offBody).toContain("trukket tilbage");
  });

  it("can be given again, as a new row, and check-in is back", async () => {
    expect(await refusal(giveHealthConsentAgain(child, "da"))).toBe("forbidden:");
    expect(await giveHealthConsentAgain(owner, "en")).toBe(true);
    expect(await isHealthConsentWithdrawn(owner)).toBe(false);
    await saveCheckin(owner, checkin(OWN_RIDER));
    expect(await getCheckin(owner, OWN_RIDER, TODAY)).not.toBeNull();
    const { rows } = await admin.query(
      `select locale, withdrawn_at is null as standing from consents
        where org_id = $1 and kind = 'health' order by given_at`,
      [owner.orgId],
    );
    expect(rows).toEqual([
      { locale: "da", standing: false },
      { locale: "en", standing: true },
    ]);
    // Nothing to give again while it stands.
    expect(await giveHealthConsentAgain(owner, "da")).toBe(false);
  });
});

describe("app_health_consent_withdrawn()", () => {
  it("answers members only", async () => {
    await asAppCommit(app, owner, (c) =>
      c.query(
        "update consents set withdrawn_at = now() where kind = 'health' and withdrawn_at is null",
      ),
    );
    const ask = (ctx: { orgId: string; userId: string }) =>
      asApp(app, ctx, (c) => c.query("select app_health_consent_withdrawn() as off"));
    expect((await ask(child)).rows[0].off).toBe(true);
    // A context naming a workspace the person is not in learns nothing.
    expect((await ask({ orgId: owner.orgId, userId: other.userId })).rows[0].off).toBe(false);
  });
});
