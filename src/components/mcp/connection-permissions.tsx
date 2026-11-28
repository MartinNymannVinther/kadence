"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { setAiPermissionsAction } from "@/modules/mcp/actions";
import type { Permission } from "@/modules/mcp/permissions";
import { PermissionSwitches } from "./permission-switches";

/** One connection's switches, saved the moment one is turned (docs/adr/0120). */
export function ConnectionPermissions({
  id,
  initial,
}: {
  id: string;
  initial: readonly Permission[];
}) {
  const t = useTranslations("aiConnections.permissions");
  const { run, pending } = useRun();
  const [value, setValue] = useState<Permission[]>([...initial]);
  return (
    <details className="w-full">
      <summary className="focus-ring text-primary cursor-pointer text-2sm font-medium">
        {t("title")}
      </summary>
      <div className="pt-3">
        <PermissionSwitches
          value={value}
          disabled={pending}
          onChange={async (next) => {
            const before = value;
            setValue(next);
            const done = await run(() => setAiPermissionsAction({ id, permissions: next }), {
              success: t("saved"),
            });
            if (!done) setValue(before);
          }}
        />
      </div>
    </details>
  );
}
