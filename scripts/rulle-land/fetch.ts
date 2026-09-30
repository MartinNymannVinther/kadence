/** Who is asking, as OpenStreetMap's servers and the tiles' ask to be told. */
const AGENT = "Kadence-Rulle/0.9 (land for bundled routes; https://kadence.haij.dk)";

/**
 * A fetch for the land script (ADR 0035): it says who it is, and tries
 * again, waiting longer each time, while a server is busy.
 */
export async function get(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: { "User-Agent": AGENT, ...init?.headers },
    });
    if (response.ok) return response;
    if (attempt >= 4 || ![429, 502, 503, 504].includes(response.status))
      throw new Error(`${url}: ${response.status}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}
