"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { PERMISSION_GROUPS, type Permission } from "@/modules/mcp/permissions";

/**
 * The switches a person sets for their own assistant (docs/adr/0120):
 * reading, changing and deleting, one switch per kind of thing, each with
 * its word. Used on the consent page and under AI-forbindelser.
 */
export function PermissionSwitches({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("aiConnections.permissions");
  const base = useId();
  const toggle = (p: Permission, on: boolean) =>
    onChange(on ? [...new Set([...value, p])] : value.filter((v) => v !== p));
  return (
    <div className="flex flex-col gap-4">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t(`group.${group.key}`)}</legend>
          {group.permissions.map((p) => (
            <label key={p} htmlFor={`${base}-${p}`} className="flex items-center gap-3 text-2sm">
              <Switch
                id={`${base}-${p}`}
                checked={value.includes(p)}
                disabled={disabled}
                onChange={(e) => toggle(p, e.target.checked)}
              />
              <span>{t(p)}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <p className="text-meta text-xs leading-relaxed">{t("always")}</p>
    </div>
  );
}
