import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { listDeviceLinks } from "@/modules/devices/links";
import { adminPool } from "../helpers/db";
import { clearJobs } from "../helpers/jobs";
import { insertSql } from "../helpers/rows";
import { fakeFetch, json, withProviderKeys } from "./fake-fetch";
import {
  deliverGarmin as deliver,
  ID_URL,
  PERMISSIONS_URL,
  seedGarminTeam,
  TOKEN_URL,
} from "./garmin-fixture";

/**
 * What else Garmin pushes (docs/adr/0113). A deregistration is believed
 * only when Garmin refuses the rider's token, and then ends the link, its
 * tokens and both of the rider's yeses to Garmin; a change of permissions
 * is read again with the rider's token, never taken from the push.
 */

const ORG = "org_ge";
let admin: Pool;
let restore: () => void;
let link: (who: string) => Promise<Record<string, unknown>>;
let ctx: (who: string) => { orgId: string; userId: string };

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  ({ link, ctx } = await seedGarminTeam(admin, "ge", ["kim", "liv", "mia"], ["liv"]));
  await clearJobs();
});

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await admin.end();
});

describe("a deregistration", () => {
  beforeAll(async () => {
    for (const who of ["kim", "liv"])
      for (const kind of ["garmin", "garmin_ai"]) {
        const q = insertSql("consents", {
          org_id: ORG,
          user_id: `user_ge_${who}`,
          rider_id: `ge_${who}`,
          kind,
          version: "2026-10",
        });
        await admin.query(q.text, q.values);
      }
  });

  const standing = async (who: string) =>
    (
      await admin.query(
        "select count(*)::int as n from consents where user_id = $1 and withdrawn_at is null",
        [`user_ge_${who}`],
      )
    ).rows[0].n as number;

  it("that Garmin confirms ends the link, its tokens and both yeses to Garmin", async () => {
    fakeFetch({ [ID_URL]: () => json({ errorMessage: "no" }, 401) });
    const { outcomes } = await deliver({ deregistrations: [{ userId: "ge-kim" }] });
    expect(outcomes).toEqual(["revoked"]);
    expect(await link("kim")).toMatchObject({
      status: "revoked",
      last_error: "deregistered",
      access_token_sealed: "",
      refresh_token_sealed: null,
      permissions: null,
    });
    expect(await standing("kim")).toBe(0);
  });

  it("is confirmed as well when Garmin will not renew the rider's token", async () => {
    fakeFetch({
      [TOKEN_URL]: () => json({ error: "invalid_grant" }, 400),
    });
    const { outcomes } = await deliver({ deregistrations: [{ userId: "ge-liv" }] });
    expect(outcomes).toEqual(["revoked"]);
    expect(await link("liv")).toMatchObject({ status: "revoked", access_token_sealed: "" });
    expect(await standing("liv")).toBe(0);
  });
});

describe("a change of permissions", () => {
  it("is read again with the rider's token, never taken from the push", async () => {
    const calls = fakeFetch({ [PERMISSIONS_URL]: () => json({ permissions: ["WORKOUT_IMPORT"] }) });
    const { outcomes } = await deliver({
      userPermissionsChange: [
        {
          userId: "ge-mia",
          summaryId: "x1",
          permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT", "HISTORICAL_DATA_EXPORT"],
          changeTimeInSeconds: 1_790_000_000,
        },
      ],
    });
    expect(outcomes).toEqual(["permissions"]);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer acc-mia");
    expect((await link("mia")).permissions).toEqual(["WORKOUT_IMPORT"]);
    const garmin = (await listDeviceLinks(ctx("mia"))).find((l) => l.provider === "garmin");
    expect(garmin).toMatchObject({ sharesActivities: false, canPush: true });
  });

  it("for nobody Kadence knows changes nothing", async () => {
    const calls = fakeFetch({});
    const { outcomes } = await deliver({ userPermissionsChange: [{ userId: "ge-nobody" }] });
    expect(outcomes).toEqual(["unknown_user"]);
    expect(calls).toHaveLength(0);
  });
});
