import { auth } from "@/core/auth/auth";
import { organizationSlug } from "@/lib/slug";
import { markWorkspacePersonal } from "./register-personal";

/**
 * A personal workspace made for a person who already belongs to a team
 * (docs/adr/0081): the one a rider leaving a team takes their training
 * into. ADR 0048's rule — nobody on a team creates a workspace — still
 * holds for every request; this goes through Better Auth's server-only
 * path, a call with the person's id and no session, which the endpoint
 * refuses to any request and which skips `allowUserToCreateOrganization`.
 * The before-hook in auth.ts adds the one rule that path needs: a person
 * owns at most one personal workspace. Then the kind is set as the
 * registration sets it, and the person is the workspace's owner, as
 * every creator is.
 */
export async function createPersonalWorkspaceFor(
  userId: string,
  name: string,
): Promise<{ orgId: string; name: string } | null> {
  const workspaceName = name.trim().slice(0, 200) || "Kadence";
  try {
    const organization = await auth.api.createOrganization({
      body: { name: workspaceName, slug: organizationSlug(workspaceName), userId },
    });
    if (!organization) return null;
    await markWorkspacePersonal(organization.id);
    return { orgId: organization.id, name: organization.name };
  } catch (error) {
    console.error("personal workspace: creation failed", error);
    return null;
  }
}
