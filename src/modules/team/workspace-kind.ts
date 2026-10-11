import { eq } from "drizzle-orm";
import { cache } from "react";
import type { WorkspaceKind } from "@/core/access/personal";
import { organizations } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * What the active workspace is (docs/adr/0080): a club, or one person's
 * own training. Read under RLS as a member, once per request. It changes
 * what the person sees — the menu, Today's title, the settings — and
 * nothing about what they may do: every service decides that by role.
 */
export const workspaceKind = cache(
  async (orgId: string, userId: string): Promise<WorkspaceKind> => {
    const ctx: OrgContext = { orgId, userId };
    const [row] = await withOrgContext(ctx, (tx) =>
      tx
        .select({ kind: organizations.kind })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1),
    );
    return row?.kind === "personal" ? "personal" : "club";
  },
);
