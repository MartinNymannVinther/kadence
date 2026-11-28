"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { runAction, STILL_ALLOWED } from "@/core/action";
import { env } from "@/core/env";
import { undoAiAction } from "./ai-actions";
import { removeConnection, setPermissions } from "./connections";
import { PERMISSIONS } from "./permissions";
import { sealStaged, STAGED_COOKIE, STAGED_SECONDS } from "./staged-permissions";

const PATH = ["/settings/ai-connections"];
const Id = z.string().min(1).max(100);
const Permissions = z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length);

/** Removes one of the caller's own assistant connections (docs/adr/0118). */
export async function removeAiConnectionAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ id: Id }),
    (ctx, input) => removeConnection(ctx, input.id),
    PATH,
    STILL_ALLOWED,
  );
}

/** The person's own switches for one connection (docs/adr/0120). */
export async function setAiPermissionsAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ id: Id, permissions: Permissions }),
    (ctx, input) => setPermissions(ctx, input.id, input.permissions),
    PATH,
  );
}

/** "Fortryd" on something the person's assistant wrote or deleted (docs/adr/0120). */
export async function undoAiActionAction(raw: unknown) {
  return runAction(raw, z.object({ id: Id }), (ctx, input) => undoAiAction(ctx, input.id), [
    "/settings/ai-connections",
    "/calendar",
    "/today",
    "/me",
  ]);
}

/** The switches set on the consent page, left for the yes that follows (./staged-permissions.ts). */
export async function stageAiPermissionsAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ clientId: z.string().min(1).max(255), permissions: Permissions }),
    async (ctx, input) => {
      (await cookies()).set(
        STAGED_COOKIE,
        sealStaged(ctx.userId, input.clientId, input.permissions),
        {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api/auth",
          maxAge: STAGED_SECONDS,
        },
      );
    },
    [],
    STILL_ALLOWED,
  );
}
