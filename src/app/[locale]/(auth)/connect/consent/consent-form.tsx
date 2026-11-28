"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { PermissionSwitches } from "@/components/mcp/permission-switches";
import { authClient } from "@/core/auth/client";
import { stageAiPermissionsAction } from "@/modules/mcp/actions";
import { DEFAULT_PERMISSIONS, type Permission } from "@/modules/mcp/permissions";
import type { ConsentWorkspace } from "@/modules/mcp/consent-view";

/**
 * The yes or no (docs/adr/0118). A yes first makes the chosen workspace the
 * active one, because the yes is for the workspace the session names, then
 * tells Better Auth, which answers with the address back to the assistant.
 * The switches the person set go just before the yes, for the connection
 * it makes (docs/adr/0120). A no goes back too, so the assistant hears it.
 */
export function ConsentForm({
  workspaces,
  active,
}: {
  workspaces: ConsentWorkspace[];
  active: string | null;
}) {
  const t = useTranslations("connect");
  const allowed = workspaces.filter((w) => w.refused === null);
  const [chosen, setChosen] = useState(
    allowed.find((w) => w.orgId === active)?.orgId ?? allowed[0]?.orgId ?? "",
  );
  const [pending, setPending] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([...DEFAULT_PERMISSIONS]);
  const [error, setError] = useState<string | null>(null);
  const refusal =
    allowed.length === 0 ? (workspaces.find((w) => w.orgId === active) ?? workspaces[0]) : null;

  async function answer(accept: boolean) {
    setError(null);
    setPending(true);
    if (accept && chosen !== active) {
      const { error: switchError } = await authClient.organization.setActive({
        organizationId: chosen,
      });
      if (switchError) {
        setPending(false);
        setError(t("error"));
        return;
      }
    }
    if (accept) {
      const clientId = new URLSearchParams(window.location.search).get("client_id") ?? "";
      const staged = await stageAiPermissionsAction({ clientId, permissions });
      if (!staged.ok) {
        setPending(false);
        setError(t("error"));
        return;
      }
    }
    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: window.location.search.slice(1) }),
    });
    const data = (await response.json().catch(() => null)) as {
      url?: unknown;
      code?: unknown;
    } | null;
    if (!response.ok || typeof data?.url !== "string") {
      setPending(false);
      setError(
        data?.code === "tooYoung" || data?.code === "notRider"
          ? t(`refused.${data.code}`, { workspace: "" })
          : t("error"),
      );
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="flex flex-col gap-5">
      {refusal ? (
        <p role="status" className="text-2sm leading-relaxed">
          {t(`refused.${refusal.refused ?? "notRider"}`, { workspace: refusal.name })}
        </p>
      ) : (
        <>
          {allowed.length > 1 ? (
            <Field>
              <FieldLabel htmlFor="workspace">{t("workspace")}</FieldLabel>
              <NativeSelect
                id="workspace"
                value={chosen}
                onChange={(event) => setChosen(event.target.value)}
              >
                {allowed.map((w) => (
                  <option key={w.orgId} value={w.orgId}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <p className="text-2sm leading-relaxed">
              {t("workspaceOne", { workspace: allowed[0]?.name ?? "" })}
            </p>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("mayTitle")}</h2>
            <p className="text-meta text-2sm leading-relaxed">{t("mayHint")}</p>
            <PermissionSwitches value={permissions} onChange={setPermissions} disabled={pending} />
          </section>
          <section className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold">{t("mayNotTitle")}</h2>
            <ul className="text-2sm list-disc pl-5 leading-relaxed">
              <li>{t("mayNotSend")}</li>
              <li>{t("mayNotOthers")}</li>
              <li>{t("mayNotGarmin")}</li>
            </ul>
          </section>
          <p className="text-meta text-2sm leading-relaxed">{t("where")}</p>
          <p className="text-meta text-2sm leading-relaxed">{t("name")}</p>
        </>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {refusal ? null : (
          <Button type="button" disabled={pending || !chosen} onClick={() => answer(true)}>
            {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
            {t("accept")}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={pending} onClick={() => answer(false)}>
          {refusal ? t("back") : t("deny")}
        </Button>
      </div>
    </div>
  );
}
