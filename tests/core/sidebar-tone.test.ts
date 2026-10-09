import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_TONE,
  SIDEBAR_TONE_COOKIE,
  SIDEBAR_TONES,
  sidebarToneClass,
  sidebarToneCookie,
  sidebarToneFrom,
} from "@/components/common/sidebar-tone";

/**
 * The rail's tone (docs/adr/0073): dark moss unless the person chose
 * paper, read from a cookie the server paints the first pass from.
 */
describe("the rail's tone", () => {
  it("is dark moss unless the cookie says paper", () => {
    expect(DEFAULT_SIDEBAR_TONE).toBe("moss");
    expect(sidebarToneFrom(undefined)).toBe("moss");
    expect(sidebarToneFrom(null)).toBe("moss");
    expect(sidebarToneFrom("")).toBe("moss");
    expect(sidebarToneFrom("moss")).toBe("moss");
    expect(sidebarToneFrom("paper")).toBe("paper");
    expect(sidebarToneFrom("green")).toBe("moss");
  });

  it("wears a class for moss only; paper is the tokens as they are", () => {
    expect(sidebarToneClass("moss")).toBe("sidebar-moss");
    expect(sidebarToneClass("paper")).toBeUndefined();
  });

  it("is kept for a year, site-wide, same-site, and carries one word", () => {
    expect(sidebarToneCookie("paper")).toBe(
      `${SIDEBAR_TONE_COOKIE}=paper; path=/; max-age=31536000; samesite=lax`,
    );
    for (const tone of SIDEBAR_TONES) expect(sidebarToneFrom(tone)).toBe(tone);
  });
});
