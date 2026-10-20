import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * Building a demo takes a few seconds, and the front page shows a waiting
 * screen meanwhile (src/components/landing/demo-link.tsx). A plain anchor
 * to the demo route would bring the still page back, so every link to it
 * on the front page goes through DemoLink.
 */

const FILES = ["src/app/[locale]/page.tsx", "src/components/landing/ways.tsx"];

describe("the front page's demo links", () => {
  it("are all DemoLinks, none a plain anchor", () => {
    let links = 0;
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/<a\s[^>]*href=\{\s*`?\$?\{?demo(Path|Href)/);
      links += source.match(/<DemoLink\b/g)?.length ?? 0;
    }
    // The hero's, the demo card's two, and the "Alene" way's.
    expect(links).toBe(4);
  });

  it("say what is being made, for a team and for a rider alone, in both languages", () => {
    for (const wait of [da.landing.demoWait, en.landing.demoWait]) {
      expect(wait.title).toBeTruthy();
      expect(wait.team).not.toBe(wait.alone);
      expect(wait.slow).toBeTruthy();
    }
  });
});
