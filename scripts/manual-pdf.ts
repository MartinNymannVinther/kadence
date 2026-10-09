import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Renders the user manual (public/brugervejledning/index.html) to the PDF
 * beside it, with a Chrome of this machine's — never a dependency of the
 * app, and never at build time (docs/adr/0079). Run it against a running
 * Kadence, so the fonts and the pictures resolve the way a reader sees
 * them, whenever the manual's text or pictures have changed:
 *
 *     pnpm dev -p 3000
 *     pnpm script scripts/manual-pdf.ts http://localhost:3000
 *
 * The browser is found in CHROME, else among the usual places on a Mac
 * (Google Chrome, or Playwright's cached Chromium). It is driven over the
 * DevTools protocol with Node's own fetch and WebSocket: no npm package.
 */

const origin = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "public/brugervejledning/kadence-brugervejledning.pdf";
const PORT = 9337;

function findChrome(): string {
  const candidates = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter((c): c is string => Boolean(c));
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error("No Chrome found. Set CHROME=/path/to/chrome.");
  return found;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = findChrome();
  const proc = spawn(
    chrome,
    [
      "--headless",
      `--remote-debugging-port=${PORT}`,
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  try {
    let page: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 60 && !page; i++) {
      await sleep(250);
      try {
        const targets = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as Array<{
          type: string;
          webSocketDebuggerUrl: string;
        }>;
        page = targets.find((t) => t.type === "page");
      } catch {
        // The browser is still starting.
      }
    }
    if (!page) throw new Error("Chrome did not answer on its debugging port.");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map<number, (m: { result?: Record<string, unknown> }) => void>();
    ws.onmessage = (event) => {
      const m = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown> };
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)!(m);
        pending.delete(m.id);
      }
    };
    const send = (method: string, params: Record<string, unknown> = {}) =>
      new Promise<Record<string, unknown>>((r) => {
        const i = ++id;
        pending.set(i, (m) => r(m.result ?? {}));
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    await send("Page.enable");
    await send("Page.navigate", { url: `${origin}/brugervejledning/index.html` });
    // Fonts and pictures: wait for the document, then a moment for the web fonts.
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const r = await send("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && document.fonts.status === 'loaded'",
        returnByValue: true,
      });
      if ((r.result as { value?: boolean } | undefined)?.value) break;
    }
    await sleep(500);
    const pdf = await send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    const data = (pdf as { data?: string }).data;
    if (!data) throw new Error("Chrome returned no PDF.");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(data, "base64"));
    const pages = (
      Buffer.from(data, "base64")
        .toString("latin1")
        .match(/\/Type\s*\/Page[^s]/g) ?? []
    ).length;
    console.log(`manual-pdf: wrote ${out} (${pages} pages)`);
    ws.close();
  } finally {
    proc.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
