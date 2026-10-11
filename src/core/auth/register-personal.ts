import { eq } from "drizzle-orm";
import type { PersonalSpec } from "@/core/access/personal";
import { authDb } from "@/core/db/client";
import { organizations } from "@/core/db/schema";
import { inviteMember } from "@/core/team/service";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";

/**
 * Makes a workspace one person's own (docs/adr/0080). The only writer of
 * `organizations.kind`: the registration below and the demo's "alone"
 * (src/modules/demo/service.ts), on the auth role, right after Better
 * Auth has created the row. The audit trigger on organizations records it.
 */
export async function markWorkspacePersonal(orgId: string): Promise<void> {
  await authDb.update(organizations).set({ kind: "personal" }).where(eq(organizations.id, orgId));
}

/**
 * A personal workspace, made ready right after the registration has
 * created it (docs/adr/0080). The person is its owner, as every new
 * workspace's creator is; what makes it personal is three things done
 * here, in order:
 *
 * 1. `organizations.kind` is set to 'personal', on the auth role, by this
 *    code and nothing else — Better Auth does not know the column, and a
 *    request body that names it is refused (src/core/auth/auth.ts).
 * 2. A rider row, through the ordinary service under RLS as the new
 *    owner (`createRider`, which checks they coach the team): for "me"
 *    the person's own, carrying their account, so they are coach and
 *    rider in one (ADR 0010); for "child" the child's, with no account.
 * 3. For a child whose address the application gave, the link the child
 *    joins by, made and attached as a coach's "Inviter rytter" makes it;
 *    joining links the child's account to the row (ADR 0010). Without an
 *    address the parent invites the child from the rider's page later.
 *
 * The class follows the birth year (`category_override` stays empty).
 */
export async function setUpPersonalWorkspace(input: {
  orgId: string;
  userId: string;
  /** The name the person registered with: the rider's name for "me". */
  userName: string;
  /** The new owner's session, which is what may make a team invitation. */
  sessionHeaders: Headers;
  spec: PersonalSpec;
}): Promise<void> {
  const { orgId, userId, userName, sessionHeaders, spec } = input;
  await markWorkspacePersonal(orgId);

  const ctx = { orgId, userId };
  const own = spec.forWhom === "me";
  const rider = await createRider(ctx, {
    name: (own ? userName : (spec.childName ?? userName)).slice(0, 120),
    birthYear: spec.birthYear,
    sex: null,
    categoryOverride: null,
    userId: own ? userId : null,
  });
  if (own || !spec.childEmail) return;

  const invited = await inviteMember(
    sessionHeaders,
    { email: spec.childEmail, role: "member" },
    orgId,
  );
  if (!invited.ok) {
    // The workspace and the child's row stand; the rider's page makes
    // the link again. Said in the log, as nobody waits for it here.
    console.error("register: the child's invitation failed", invited.error);
    return;
  }
  await attachRiderInvitation(ctx, rider.id, invited.invitation.id);
}
