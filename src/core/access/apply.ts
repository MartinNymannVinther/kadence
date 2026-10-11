import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { recordAuthEvent } from "@/core/audit/events";
import { todayInCopenhagen } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { accessRequests } from "@/core/db/schema";
import { PersonalFields, personalColumns, personalProblem, type PersonalSpec } from "./personal";

/**
 * Applying: the first of admission's three steps (service.ts). A person
 * asks, which stores a request and nothing else. For a club, or for one
 * person's own training — theirs, or their child's (docs/adr/0080).
 */

const thisYear = () => Number(todayInCopenhagen().slice(0, 4));

export const AccessRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  /** For a personal workspace the server names it (actions.ts); the form has no field. */
  organizationName: z.string().trim().min(1).max(200),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  kind: z.enum(["club", "personal"]).default("club"),
  /** Only for kind "personal". */
  personal: PersonalFields.optional(),
  /** Honeypot. Humans never see it; anything in it is a bot. */
  website: z.string().max(200).optional().or(z.literal("")),
});

export type AccessRequestInput = z.infer<typeof AccessRequestSchema>;

export type RequestMeta = { ipAddress: string | null; userAgent: string | null };

export type AccessRequestResult =
  { ok: true } | { ok: false; error: "invalid" | "tooMany" | "tooYoung" };

/**
 * The personal workspace an application or the owner's invitation asks
 * for: null for a club, the spec when it holds, or the reason it does
 * not. Under 15 is its own answer, because the form says it plainly.
 */
export function personalFrom(
  kind: "club" | "personal",
  personal: z.infer<typeof PersonalFields> | undefined,
): { ok: true; spec: PersonalSpec | null } | { ok: false; error: "invalid" | "tooYoung" } {
  if (kind === "club") return { ok: true, spec: null };
  if (!personal) return { ok: false, error: "invalid" };
  const problem = personalProblem(personal, thisYear());
  if (problem === "tooYoung") return { ok: false, error: "tooYoung" };
  if (problem) return { ok: false, error: "invalid" };
  return { ok: true, spec: personal };
}

/** Applications per address per hour before the form stops listening. */
const MAX_REQUESTS_PER_IP_PER_HOUR = 5;

export async function submitAccessRequest(
  input: unknown,
  meta: RequestMeta,
): Promise<AccessRequestResult> {
  const parsed = AccessRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, email, organizationName, message, website } = parsed.data;

  // A filled honeypot gets the same answer as a real application and
  // leaves no trace: the point is to waste the bot's time, not ours.
  if (website) return { ok: true };

  const personal = personalFrom(parsed.data.kind, parsed.data.personal);
  if (!personal.ok) return personal;

  if (meta.ipAddress) {
    const [recent] = await authDb
      .select({ total: count() })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.ipAddress, meta.ipAddress),
          gt(accessRequests.createdAt, sql`now() - interval '1 hour'`),
        ),
      );
    if (Number(recent?.total ?? 0) >= MAX_REQUESTS_PER_IP_PER_HOUR) {
      return { ok: false, error: "tooMany" };
    }
  }

  // One pending application per address, enforced by a partial unique
  // index. A second one is answered exactly like the first: the person
  // already did the right thing, and the answer must not reveal anything
  // about who has applied before.
  const [row] = await authDb
    .insert(accessRequests)
    .values({
      name,
      email: email.toLowerCase(),
      organizationName,
      message: message || null,
      ...personalColumns(personal.spec),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
    .onConflictDoNothing()
    .returning({ id: accessRequests.id });

  if (row) {
    await recordAuthEvent({
      action: "access.requested",
      entityType: "access_requests",
      entityId: row.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
  return { ok: true };
}
