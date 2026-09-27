import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { getRider } from "@/modules/team/riders";
import { getSession } from "@/modules/training/sessions";
import { readStructure } from "@/modules/workouts/structure";
import { exportWorkout, WORKOUT_FORMATS, type WorkoutFormat } from "@/modules/workouts/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A planned bike session as a file for the trainer or the head unit:
 * `?format=zwo|erg|mrc|fit`. Watts come from the rider's own FTP; without
 * one, ERG falls back to MRC (percent of FTP) and says so in the name.
 * Anyone who may read the session may download it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const asked = request.nextUrl.searchParams.get("format") ?? "fit";
  if (!(WORKOUT_FORMATS as readonly string[]).includes(asked))
    return new Response("Unknown format", { status: 400 });

  const session = await getSession(ctx, id.slice(0, 100));
  if (!session) return new Response("Not found", { status: 404 });
  if (session.sport !== "bike") return new Response("Only bike sessions", { status: 400 });
  const structure = readStructure(session.structure, "bike");
  if (structure.kind !== "bike" || structure.steps.length === 0)
    return new Response("No steps", { status: 400 });
  const rider = await getRider(ctx, session.riderId);

  const file = exportWorkout(
    asked as WorkoutFormat,
    structure,
    { ftp: rider?.ftpWatts ?? null, thresholdHr: rider?.thresholdHr ?? null },
    session.title,
    { description: session.description },
  );
  const body = typeof file.body === "string" ? file.body : new Uint8Array(file.body);
  return new Response(body, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
