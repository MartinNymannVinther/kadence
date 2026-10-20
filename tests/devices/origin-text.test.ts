import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { providerOrigin } from "@/modules/devices/origin";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * The devices page's note on where a rider's data goes (P2-10): built
 * from `providerOrigin()` so it only names the providers this
 * installation has keys for, in both languages, for every combination a
 * real installation can have.
 */

const MESSAGES = { da, en } as const;

function translate(locale: "da" | "en") {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "devices" });
  return t as unknown as (key: string, values?: Record<string, string | number>) => string;
}

/** The card's title, the way the devices page builds it from the two groups. */
function titleOf(t: ReturnType<typeof translate>, configured: Array<"wahoo" | "garmin" | "polar">) {
  const origin = providerOrigin(configured);
  return [
    origin.us.length > 0
      ? t("usTitle.us", { names: origin.us.join(" og "), count: origin.us.length })
      : null,
    origin.eu.length > 0
      ? t("usTitle.eu", { names: origin.eu.join(" og "), count: origin.eu.length })
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

describe("the devices page names only the configured providers", () => {
  it("names one American company alone, singular, in Danish and English", () => {
    expect(titleOf(translate("da"), ["garmin"])).toBe("garmin er et amerikansk firma");
    expect(titleOf(translate("en"), ["garmin"])).toBe("garmin is a US company");
  });

  it("names two American companies together, plural", () => {
    expect(titleOf(translate("da"), ["wahoo", "garmin"])).toBe(
      "wahoo og garmin er amerikanske firmaer",
    );
    expect(titleOf(translate("en"), ["wahoo", "garmin"])).toBe("wahoo og garmin are US companies");
  });

  it("never mentions an American company when only Polar is configured", () => {
    const title = titleOf(translate("da"), ["polar"]);
    expect(title).toBe("polar er et finsk firma");
    expect(title).not.toMatch(/amerikansk/);
  });

  it("joins both groups when the installation has both kinds configured", () => {
    expect(titleOf(translate("da"), ["polar", "wahoo"])).toBe(
      "wahoo er et amerikansk firma, polar er et finsk firma",
    );
  });

  it("names nothing when no provider is configured", () => {
    expect(titleOf(translate("da"), [])).toBe("");
  });

  it("mentions Polar's EU location in the body only when Polar is configured", () => {
    const t = translate("da");
    const withPolar = t("usBody", {
      hasEu: "yes",
      euNames: "Polar",
      providers: "Polar",
      hasPushers: "no",
      pushers: "",
    });
    expect(withPolar).toContain("det gør Polar også");

    const withoutPolar = t("usBody", {
      hasEu: "no",
      euNames: "",
      providers: "Wahoo",
      hasPushers: "no",
      pushers: "",
    });
    expect(withoutPolar).not.toContain("det gør");
    expect(withoutPolar).not.toContain("Polar");
  });

  it("mentions pushing a session only to a provider that can receive one", () => {
    const t = translate("da");
    const withPush = t("usBody", {
      hasEu: "no",
      euNames: "",
      providers: "Wahoo",
      hasPushers: "yes",
      pushers: "Wahoo",
    });
    expect(withPush).toContain("sender de pas, du vælger, til Wahoo");

    const withoutPush = t("usBody", {
      hasEu: "yes",
      euNames: "Polar",
      providers: "Polar",
      hasPushers: "no",
      pushers: "",
    });
    expect(withoutPush).not.toContain("sender de pas");
  });

  it("never leaves an ICU placeholder or a missing key showing, in either language", () => {
    for (const locale of ["da", "en"] as const) {
      const t = translate(locale);
      const text = t("usBody", {
        hasEu: "yes",
        euNames: "Polar",
        providers: "Wahoo, Garmin eller Polar",
        hasPushers: "yes",
        pushers: "Wahoo eller Garmin",
      });
      expect(text).not.toContain("{");
      expect(text).not.toContain("devices.");
    }
  });
});
