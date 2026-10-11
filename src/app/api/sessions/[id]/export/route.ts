import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { rateLimit } from "@/core/rate-limit";
import { getRider } from "@/modules/team/riders";
import { getSession, listSessions } from "@/modules/training/sessions";
import { readStructure } from "@/modules/workouts/structure";
import {
  exportWorkout,
  versionSerial,
  WORKOUT_FORMATS,
  type WorkoutFormat,
} from "@/modules/workouts/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/** Which of the rider's bike sessions with steps this is on its day, 1 for the first. */
async function dayIndexOf(
  ctx: NonNullable<Awaited<ReturnType<typeof requireOrgContext>>>,
  session: { id: string; onDate: string; riderId: string },
): Promise<number> {
  const day = await listSessions(ctx, {
    from: session.onDate,
    to: session.onDate,
    riderIds: [session.riderId],
  });
  const withSteps = day.filter((s) => {
    if (s.sport !== "bike") return false;
    const structure = readStructure(s.structure, "bike");
    return structure.kind === "bike" && structure.steps.length > 0;
  });
  return Math.max(1, withSteps.findIndex((s) => s.id === session.id) + 1);
}

/**
 * A planned bike session as a file for the trainer or the head unit:
 * `?format=zwo|erg|mrc|fit`. Watts come from the rider's own FTP; without
 * one, ERG falls back to MRC (percent of FTP) and says so in the name.
 * Anyone who may read the session may download it. The file is named by
 * the session's day and its place in the day, and a FIT file carries a
 * serial number for this version of the session (ADR 0031): a week sent
 * to a bike computer neither overwrites itself nor an older version.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  // A week is seven files; a person asking for hundreds an hour is not sending a week.
  if (!(await rateLimit(`session-export:${ctx.userId}`, 300, HOUR)).allowed)
    return new Response("Too many requests", { status: 429 });
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
    {
      description: session.description,
      onDate: session.onDate,
      dayIndex: await dayIndexOf(ctx, session),
      serial: versionSerial(session.id, new Date(session.updatedAt).getTime()),
    },
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
