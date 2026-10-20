import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { todayInCopenhagen, addDaysIso } from "@/core/dates";
import { settingsGroups } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { adminPool } from "../helpers/db";
import { seedPerson } from "../helpers/rows";
import { withBilling } from "./fixture";

/**
 * The open price page and Installation → Priser (docs/adr/0090, backlog
 * S-12b): the open page is there only with BILLING=on — the proxy answers
 * 404 before it renders (tests/core/proxy.test.ts) and the page asks
 * again — and the price table is the installation's owner's alone, with
 * BILLING=on. Saving a price checks the caller, the input and the day,
 * and adds a row the open page then reads.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "da",
}));
vi.mock("@/core/auth/session", () => ({
  getOrgContext: async () => null,
  getSession: async () => (session.userId ? { user: { id: session.userId }, session: {} } : null),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  redirect: () => undefined,
  usePathname: () => "/",
  useRouter: () => ({}),
  getPathname: () => "/",
}));
const { default: PricesPage } = await import("@/app/[locale]/(open)/prices/page");
const { default: PriserPage } = await import("@/app/[locale]/(open)/priser/page");
const { default: InstallationPricesPage } =
  await import("@/app/[locale]/(app)/(narrow)/settings/installation/prices/page");
const { savePricePlanAction } = await import("@/core/admin/price-actions");

const OWNER = "user_pricepage_owner";
const COACH = { orgId: "org_pricepage", userId: "user_pricepage_coach" };
const KEY = "page-test";
const NOT_FOUND = /NEXT_HTTP_ERROR_FALLBACK;404/;
let admin: Pool;

const save = (over: Record<string, unknown> = {}) =>
  savePricePlanAction({
    key: KEY,
    nameDa: "Prøve",
    nameEn: "Trial",
    priceYearDkk: 480,
    perRiderDkk: null,
    includedRiders: null,
    aiBudgetEuros: 2.5,
    fileQuotaGb: 1.5,
    vatIncluded: true,
    validFrom: todayInCopenhagen(),
    ...over,
  });

beforeAll(async () => {
  admin = adminPool();
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'pricepage-owner@example.com', 'owner') on conflict do nothing`,
    [OWNER],
  );
  await seedPerson(admin, COACH.orgId, COACH.userId, "owner", "Pris CK");
});

afterAll(async () => {
  await admin.query("delete from organizations where id = $1", [COACH.orgId]);
  await admin.query("delete from price_plans where key = $1", [KEY]);
  await admin.end();
});

describe("the open price page", () => {
  it("is not there with BILLING=off, at either address", async () => {
    session.userId = null;
    await expect(PricesPage()).rejects.toThrow(NOT_FOUND);
    await expect(PriserPage()).rejects.toThrow(NOT_FOUND);
  });

  it("is there for anyone with BILLING=on", async () => {
    const restore = withBilling("on");
    try {
      session.userId = null;
      expect(await PricesPage()).toBeTruthy();
      expect(await PriserPage()).toBeTruthy();
    } finally {
      restore();
    }
  });
});

describe("Installation → Priser", () => {
  it("is a tab for the installation's owner with BILLING=on, and nobody else's", () => {
    const owner = settingsGroups({ owner: true, isCoach: true, isRider: false, billing: true });
    const installation = owner.find((g) => g.key === "installation")!.items;
    expect(installation.find((i) => i.key === "prices")?.href).toBe(
      "/settings/installation/prices",
    );
    for (const who of [
      { owner: true, isCoach: true, isRider: false, billing: false },
      { owner: false, isCoach: true, isRider: false, billing: true },
    ])
      expect(settingsGroups(who).flatMap((g) => g.items.map((i) => i.key))).not.toContain("prices");
  });

  it("answers 404 with BILLING=off, and to anyone but the owner", async () => {
    session.userId = OWNER;
    await expect(InstallationPricesPage()).rejects.toThrow(NOT_FOUND);
    const restore = withBilling("on");
    try {
      session.userId = COACH.userId;
      await expect(InstallationPricesPage()).rejects.toThrow(NOT_FOUND);
      session.userId = null;
      await expect(InstallationPricesPage()).rejects.toThrow(NOT_FOUND);
      session.userId = OWNER;
      expect(await InstallationPricesPage()).toBeTruthy();
    } finally {
      restore();
    }
  });
});

describe("saving a price", () => {
  it("is refused to anyone but the owner", async () => {
    session.userId = null;
    expect(await save()).toEqual({ ok: false, error: "unauthorized" });
    session.userId = COACH.userId;
    expect(await save()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("refuses a day that has passed, half a price per rider and a bad key", async () => {
    session.userId = OWNER;
    expect(await save({ validFrom: addDaysIso(todayInCopenhagen(), -1) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await save({ perRiderDkk: 50 })).toEqual({ ok: false, error: "invalid" });
    expect(await save({ key: "Club; drop" })).toEqual({ ok: false, error: "invalid" });
    expect(await save({ priceYearDkk: -1 })).toEqual({ ok: false, error: "invalid" });
  });

  it("adds today's row for the owner, in micro-euro and decimal bytes", async () => {
    session.userId = OWNER;
    expect(await save()).toEqual({ ok: true });
    const { rows } = await admin.query(
      `select price_year_dkk, ai_budget_micro::bigint as ai, file_quota_bytes::bigint as files,
              valid_from::text as day, source from price_plan_now($1)`,
      [KEY],
    );
    expect(rows).toEqual([
      {
        price_year_dkk: 480,
        ai: "2500000",
        files: "1500000000",
        day: todayInCopenhagen(),
        source: "Installation",
      },
    ]);
  });
});
