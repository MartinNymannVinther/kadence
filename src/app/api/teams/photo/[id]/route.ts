import { readPhoto } from "@/modules/teams/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A team's photograph as copied from Wikimedia Commons (ADR 0072), served
 * by Kadence itself so no reader's browser reaches Commons. Open, like
 * the page it sits on; the id is a registry slug and nothing else gets
 * past the pattern. A day's caching: the copy changes once a month at
 * most.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bytes = await readPhoto(id);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
