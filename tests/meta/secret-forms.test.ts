import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A form that carries a secret posts, even before the page has come alive.
 *
 * The sign-in, registration, invitation, reset and two-factor forms are
 * rendered on the server and submitted by React. Pressed before React has
 * hydrated — a slow phone on a slow line, a script still loading — the
 * browser submits the form itself, and a form without a method is a GET:
 * the e-mail and the password travel in the address, into the browser's
 * history and the proxy's access log. It happened, in a test that pressed
 * too soon. With method="post" the same press puts them in the body, and
 * the page only renders again.
 *
 * So every form in the auth pages, and every form anywhere with a
 * password field, says method="post".
 */

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");
const AUTH = join(SRC, "app", "[locale]", "(auth)");

async function tsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath, e.name));
}

/** Every `<form …>` opening tag in the file, attributes and all. */
const formTags = (source: string) => source.match(/<form\b[^>]*>/g) ?? [];

describe("a form that carries a secret", () => {
  it("posts, in every auth page and wherever a password is typed", async () => {
    const files = await tsxFiles(SRC);
    const checked: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const secret = file.startsWith(AUTH) || /type="password"/.test(source);
      if (!secret) continue;
      for (const tag of formTags(source)) {
        checked.push(relative(ROOT, file));
        expect(tag, relative(ROOT, file)).toMatch(/\smethod="post"/);
      }
    }
    // The sign-in form is among them, so the sweep is looking where it should.
    expect(checked).toContain(join("src", "app", "[locale]", "(auth)", "login", "login-form.tsx"));
    expect(checked.length).toBeGreaterThanOrEqual(6);
  });
});
