import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every parked part answers 404 while the installation has it off, and is
 * there again the moment it is on (docs/adr/0057). The pages are called as
 * the server would call them; translations, the session and the redirect
 * are stood in for, because what is proven here is the gate in front of
 * each page, not what the page draws.
 */

const on = vi.hoisted(() => new Set<string>());
vi.mock("@/core/features", async (importOriginal) =>
  (await import("../helpers/features")).featuresWith(await importOriginal(), on),
);

const stand = vi.hoisted(() => ({
  ctx: null as { orgId: string; userId: string } | null,
  redirect: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "da",
}));
vi.mock("@/core/auth/session", () => ({
  getOrgContext: async () => stand.ctx,
  getSession: async () => null,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  redirect: stand.redirect,
  usePathname: () => "/",
  useRouter: () => ({}),
  getPathname: () => "/",
}));
vi.mock("@/modules/team/access", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  whoAmI: async () => ({ isCoach: false, rider: { id: "r1", name: "Emma Holm" }, children: [] }),
}));
vi.mock("@/modules/rulle/service", () => ({
  rulleStart: async () => ({
    riderId: "r1",
    today: [],
    chosen: null,
    thresholds: {},
    missing: false,
    library: [],
  }),
}));

const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };
const search = { searchParams: Promise.resolve({}) };
const thread = { params: Promise.resolve({ id: "t1" }) };

const coachesPage = await import("@/app/[locale]/(app)/(narrow)/coaches/page");
const threadPage = await import("@/app/[locale]/(app)/(narrow)/coaches/[id]/page");
const clubPage = await import("@/app/[locale]/(app)/(narrow)/club/page");
const energyPage = await import("@/app/[locale]/(open)/calculators/energy/page");
const foodPage = await import("@/app/[locale]/(open)/guides/food/page");
const hubPage = await import("@/app/[locale]/(open)/guides/page");
const rullePage = await import("@/app/[locale]/(ride)/rulle/page");

/** Every link in a page as the server returned it, without rendering it. */
function hrefsIn(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(hrefsIn);
  if (!isValidElement(node)) return [];
  const props = node.props as { href?: unknown; children?: ReactNode };
  return [...(typeof props.href === "string" ? [props.href] : []), ...hrefsIn(props.children)];
}

beforeEach(() => {
  on.clear();
  stand.ctx = null;
  stand.redirect.mockClear();
});

describe("a parked page while its flag is off", () => {
  it.each([
    ["Trænerrummet", () => coachesPage.default(search)],
    ["a thread in Trænerrummet", () => threadPage.default(thread)],
    ["the club championship", () => clubPage.default(search)],
    ["the energy calculator", () => energyPage.default()],
    ["the food guide", () => foodPage.default()],
  ])("%s answers 404", async (_, page) => {
    await expect(page()).rejects.toMatchObject(NOT_FOUND);
  });

  it.each([
    ["Trænerrummet", () => coachesPage.generateMetadata()],
    ["a thread in Trænerrummet", () => threadPage.generateMetadata(thread)],
    ["the club championship", () => clubPage.generateMetadata()],
    ["the energy calculator", () => energyPage.generateMetadata()],
    ["the food guide", () => foodPage.generateMetadata()],
  ])("%s gives away not even its title", async (_, metadata) => {
    await expect(metadata()).rejects.toMatchObject(NOT_FOUND);
  });
});

describe("a parked page while its flag is on", () => {
  it.each([
    ["coachesRoom", () => coachesPage.default(search)],
    ["coachesRoom", () => threadPage.default(thread)],
    ["clubChampionship", () => clubPage.default(search)],
  ] as const)("%s lets the page ask who is there", async (feature, page) => {
    on.add(feature);
    expect(await page()).toBeNull();
    expect(stand.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/login" }));
  });

  it("shows the energy calculator and the food guide", async () => {
    on.add("energyCalculator").add("foodGuide");
    expect(isValidElement(await energyPage.default())).toBe(true);
    expect(isValidElement(await foodPage.default())).toBe(true);
    expect(await energyPage.generateMetadata()).toMatchObject({ title: "title" });
  });
});

describe("the open hub", () => {
  it("lists only what the installation has on", async () => {
    const parked = hrefsIn(await hubPage.default());
    expect(parked).toEqual(
      expect.arrayContaining(["/calculators/gearing", "/guides/classes", "/guides/equipment"]),
    );
    expect(parked).not.toContain("/calculators/energy");
    expect(parked).not.toContain("/guides/food");

    on.add("energyCalculator").add("foodGuide");
    expect(hrefsIn(await hubPage.default())).toEqual(
      expect.arrayContaining(["/calculators/energy", "/guides/food"]),
    );
  });
});

describe("Rulle", () => {
  const ride = async () =>
    (await rullePage.default(search)) as ReactElement<{
      world: boolean;
      name: string | null;
    }>;

  it("is the session alone while its world is off: no world, no name on a climb", async () => {
    stand.ctx = { orgId: "org_gate", userId: "user_gate" };
    const app = await ride();
    expect(app.props).toMatchObject({ world: false, name: null });
  });

  it("rides through its world when it is on", async () => {
    stand.ctx = { orgId: "org_gate", userId: "user_gate" };
    on.add("rulleWorld");
    const app = await ride();
    expect(app.props).toMatchObject({ world: true, name: "Emma" });
  });
});
