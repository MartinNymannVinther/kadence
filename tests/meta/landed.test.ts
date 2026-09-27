import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { LANDED_MS } from "@/components/common/use-landed";

/**
 * The landing mark lives in two places that cannot see each other: the
 * timeout that takes the class off, and the animation that fades the
 * tint. Drift either way and the mark lingers or flickers. Reduced motion
 * may take the fade, never the mark: the mark is the answer to "where
 * did it land?".
 */

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

describe("the landing mark", () => {
  it("fades for exactly as long as the class is on the row", async () => {
    const css = await read("src/app/globals.css");
    expect(Number(css.match(/animation: landed (\d+)ms/)?.[1])).toBe(LANDED_MS);
  });

  it("keeps the mark under reduced motion and drops only the movement", async () => {
    const css = await read("src/app/globals.css");
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.landed::after \{([\s\S]*?)\}/,
    )?.[1];
    expect(block).toContain("animation: none");
    expect(block).toMatch(/opacity:\s*1/);
  });
});
