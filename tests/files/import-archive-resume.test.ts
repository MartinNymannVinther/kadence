import { afterEach, describe, expect, it, vi } from "vitest";
import { full, run, server, sha, storage, RIDER } from "./archive-fixtures";

/**
 * A Strava archive's run that goes on another day (docs/adr/0030): the
 * rides Kadence has are known by their hash even where the page has no
 * crypto.subtle, what Kadence turned away is remembered in the browser
 * and not sent again, and a busy door is waited for, not given up on.
 */

afterEach(() => vi.unstubAllGlobals());

describe("a page that cannot hash with the browser's own", () => {
  it("hashes all the same, and sends only what Kadence has not got", async () => {
    // A Kadence reached over http has no crypto.subtle.
    vi.stubGlobal("crypto", {});
    const { sent, asked } = server(["ride 3", "ride 5"]);
    const { final } = await run(full(), true);
    expect(asked).toEqual([[sha("ride 5"), sha("ride 4"), sha("ride 3"), sha("ride 1")]]);
    expect(sent.flatMap((s) => s.files)).toEqual(["4.fit.gz", "1.fit.gz"]);
    expect(final).toMatchObject({ imported: 2, known: 2, outcome: "done" });
  });
});

describe("what Kadence turned away", () => {
  const answers: Record<string, { ok: boolean; error?: string }> = {
    "5.fit.gz": { ok: true },
    // A ride Kadence has from the device, under another file.
    "4.fit.gz": { ok: false, error: "duplicate" },
    "3.fit.gz": { ok: false, error: "not_bike" },
    "2.gpx": { ok: false, error: "not_bike" },
    "1.fit.gz": { ok: false, error: "bad_crc" },
  };

  it("is remembered, and not sent again when the run goes on another day", async () => {
    const memory = storage();
    server([], (name) => answers[name]!);
    await run(full(), true, undefined, memory);

    // The next day: Kadence has the one it kept, and remembers nothing else.
    const { sent, asked } = server(["ride 5"], (name) => answers[name]!);
    const { final } = await run(full(), true, undefined, memory);
    expect(asked).toEqual([[sha("ride 5")]]);
    expect(sent).toEqual([]);
    expect(final).toMatchObject({
      outcome: "done",
      imported: 0,
      known: 2,
      skipped: 2,
      unreadable: 1,
    });
  });

  it("as not a ride is sent when every activity is asked for", async () => {
    const memory = storage();
    server([], (name) => answers[name]!);
    await run(full(), true, undefined, memory);
    const { sent } = server(["ride 5"], () => ({ ok: true }));
    await run(full(), false, undefined, memory);
    expect(sent.flatMap((s) => s.files)).toEqual(["3.fit.gz", "2.gpx"]);
  });

  it("is not remembered when the failure may pass: it is sent again", async () => {
    const memory = storage();
    server([], () => ({ ok: false, error: "generic" }));
    await run(full(), true, undefined, memory);
    const { sent } = server([]);
    await run(full(), true, undefined, memory);
    expect(sent.flatMap((s) => s.files)).toEqual(["5.fit.gz", "4.fit.gz", "3.fit.gz", "1.fit.gz"]);
  });

  it("is kept per rider, as the files' hashes and the reasons, nothing more", async () => {
    const memory = storage();
    server([], (name) => answers[name]!);
    await run(full(), true, undefined, memory);
    expect([...memory.items.keys()]).toEqual([`kadence:archive-refused:${RIDER}`]);
    const kept = JSON.parse(memory.items.get(`kadence:archive-refused:${RIDER}`)!);
    expect(Object.keys(kept).sort()).toEqual([sha("ride 4"), sha("ride 3"), sha("ride 1")].sort());
    expect(kept[sha("ride 4")][0]).toBe("d");
    expect(kept[sha("ride 3")][0]).toBe("n");
    expect(kept[sha("ride 1")][0]).toBe("u");
  });
});

describe("a busy door", () => {
  it("is waited for, and the same rides are sent again", async () => {
    const tries: string[][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url === "/api/activities/known") return Response.json({ known: [] });
        const files = ((init.body as FormData).getAll("file") as File[]).map((f) => f.name);
        tries.push(files);
        if (tries.length === 1)
          return Response.json({ error: "busy", retryAfterSeconds: 1 }, { status: 429 });
        return Response.json({ results: files.map(() => ({ ok: true })) });
      }),
    );
    const { final } = await run(full(), true);
    expect(tries[0]).toEqual(tries[1]);
    expect(final).toMatchObject({ outcome: "done", imported: 4 });
  });
});
