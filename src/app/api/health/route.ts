import { NextResponse, type NextRequest } from "next/server";
import { appPool } from "@/core/db/client";
import { jobsHealth, type JobsHealth } from "@/core/jobs/status";
import { log, requestIdFrom } from "@/core/log";

export const dynamic = "force-dynamic";

/**
 * Liveness and readiness for Docker, Coolify and uptime monitoring.
 * Deliberately returns no version or environment information — this
 * endpoint is public.
 *
 * - `GET /api/health` is readiness: the database must answer within
 *   `READY_TIMEOUT_MS`. The pool itself has no connection timeout (a
 *   separate fix), so without the race below an exhausted pool makes
 *   this hang rather than answer, and a hung health check is worse than
 *   a failing one — Docker and Coolify wait for it, and so does whoever
 *   is paged. `503` with `{ "status": "degraded" }` either way: a
 *   connection failure and a connection that never answers both mean the
 *   same thing to a caller of this endpoint.
 * - `GET /api/health?live=1` is liveness: the process can answer HTTP at
 *   all, nothing more. A database outage must not restart a container
 *   that would otherwise come back the moment the database does.
 *
 * - When the database answers, the queue of background jobs is reported
 *   beside it (docs/adr/0085): how many are due and waiting, how many
 *   gave up, and how long the oldest has waited. Counts only — no kind,
 *   no team — and never a reason for 503: a queue that has fallen behind
 *   is for the person reading the numbers, not for Docker to restart.
 *
 * The log line says what failed, because somebody has to fix it; the
 * response does not, because it is public. Code and message only, never
 * the error object — a connection string has no reason to be anywhere
 * near a log line.
 */

const READY_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("live") === "1") {
    return NextResponse.json({ status: "ok" });
  }

  try {
    await withTimeout(appPool.query("select 1"), READY_TIMEOUT_MS);
  } catch (error) {
    const { code, message } = (error ?? {}) as { code?: string; message?: string };
    await log.error("health: database check failed", {
      requestId: requestIdFrom(request.headers),
      code,
      message: message ?? String(error),
    });
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }

  let jobs: JobsHealth | null = null;
  try {
    jobs = await withTimeout(jobsHealth(), READY_TIMEOUT_MS);
  } catch (error) {
    await log.warn("health: jobs not counted", {
      requestId: requestIdFrom(request.headers),
      code: (error as { code?: string } | null)?.code,
    });
  }
  return NextResponse.json({ status: "ok", checks: { db: "ok" }, ...(jobs ? { jobs } : {}) });
}
