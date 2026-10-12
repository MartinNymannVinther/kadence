import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { z } from "zod";
import { env } from "@/core/env";
import { billingOn, workspacePlan } from "@/modules/billing/plan";
import { startPlan } from "@/modules/billing/start";
import { importFit } from "@/modules/devices/import";
import { settingsGroups } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { adminPool } from "../helpers/db";
import { rideOn, seedStorageTeam, type StorageTeam } from "../storage/fixture";
import { setPlan, withBilling } from "./fixture";

/**
 * BILLING=off, as shipped (docs/adr/0090): the installation behaves as it
 * did before there were plans. Every workspace is free whatever its row
 * says, nothing is refused for it, a new workspace gets no plan, there is
 * no Abonnement and no Betaling, and the pages answer 404.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "da",
}));
vi.mock("@/core/auth/session", () => ({
  getOrgContext: async () => session.ctx,
  getSession: async () => (session.ctx ? { user: { id: session.ctx.userId }, session: {} } : null),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  redirect: () => undefined,
  usePathname: () => "/",
  useRouter: () => ({}),
  getPathname: () => "/",
}));
const { runAction } = await import("@/core/action");
const { default: SubscriptionPage } =
  await import("@/app/[locale]/(app)/(narrow)/settings/subscription/page");
const { default: BillingPage } =
  await import("@/app/[locale]/(app)/(narrow)/settings/installation/billing/page");

let admin: Pool;
let team: StorageTeam;

beforeAll(async () => {
  admin = adminPool();
  team = await seedStorageTeam(admin, "billoff");
  // A row left behind by an installation that had billing on once.
  await setPlan(admin, team.orgId, "expired", { trial: "-10 days" });
  session.ctx = team.coach;
});

afterAll(async () => {
  await admin.end();
});

describe("with BILLING=off", () => {
  it("is the default", () => {
    expect(env.BILLING).toBe("off");
    expect(billingOn()).toBe(false);
  });

  it("calls every workspace free and refuses nothing for it", async () => {
    expect((await workspacePlan(team.coach)).plan).toBe("free");
    expect(await runAction({}, z.object({}), async () => "written")).toEqual({
      ok: true,
      data: "written",
    });
    const imported = await importFit(team.rider, team.riderId, "a.fit", rideOn(0));
    expect(imported.activityId).toBeTruthy();
  });

  it("gives a new workspace no plan", async () => {
    await admin.query(
      `insert into organizations (id, name, slug) values ('org_billoff_new', 'Ny', 'billoff-new')`,
    );
    expect((await startPlan("org_billoff_new", { kind: "personal", birthYear: 1990 })).plan).toBe(
      "free",
    );
    const row = await admin.query(
      "select plan, trial_ends_at, free_until from organizations where id = 'org_billoff_new'",
    );
    expect(row.rows[0]).toEqual({ plan: "free", trial_ends_at: null, free_until: null });
  });

  it("has no Abonnement and no Betaling, and their pages answer 404", async () => {
    const tabs = settingsGroups({ owner: true, isCoach: true, isRider: true, personal: false })
      .flatMap((g) => g.items)
      .map((i) => i.key);
    expect(tabs).not.toContain("subscription");
    expect(tabs).not.toContain("billing");
    await expect(SubscriptionPage()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    await expect(BillingPage()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});

describe("with BILLING=on", () => {
  it("shows Abonnement to the workspace's coaches and nobody else", async () => {
    const on = withBilling("on");
    try {
      session.ctx = team.coach;
      expect(await SubscriptionPage()).toBeTruthy();
      session.ctx = team.rider;
      await expect(SubscriptionPage()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      // Betaling is the installation's owner's, and a coach is not that.
      session.ctx = team.coach;
      await expect(BillingPage()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    } finally {
      on();
      session.ctx = team.coach;
    }
  });

  it("has Abonnement for a coach and Betaling for the installation's owner", () => {
    const groups = settingsGroups({
      owner: true,
      isCoach: true,
      isRider: false,
      personal: false,
      billing: true,
    });
    const team = groups.find((g) => g.key === "team")!.items.map((i) => i.key);
    const installation = groups.find((g) => g.key === "installation")!.items;
    expect(team).toContain("subscription");
    expect(installation.find((i) => i.key === "billing")?.href).toBe(
      "/settings/installation/billing",
    );
    const personal = settingsGroups({
      owner: false,
      isCoach: true,
      isRider: true,
      personal: true,
      billing: true,
    });
    expect(personal.find((g) => g.key === "you")!.items.map((i) => i.key)).toContain(
      "subscription",
    );
    const rider = settingsGroups({ owner: false, isCoach: false, isRider: true, billing: true })
      .flatMap((g) => g.items)
      .map((i) => i.key);
    expect(rider).not.toContain("subscription");
  });
});
