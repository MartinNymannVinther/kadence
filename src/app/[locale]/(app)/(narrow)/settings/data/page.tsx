import { FileArchive, FileJson, FileSpreadsheet, Info } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgContext } from "@/core/auth/session";
import { AUDIT_SHEET, AUDIT_SHEET_ROWS, EXPORT_TABLES } from "@/modules/export/tables";
import { currentRole, workspaceName } from "@/modules/export/workspace";
import { myHealthConsent } from "@/modules/consent/service";
import { whoAmI } from "@/modules/team/access";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { DeleteWorkspaceCard } from "../workspace/delete-workspace-card";
import { HealthConsentCard } from "@/components/consent/health-consent-card";
import { StorageCard } from "./storage-card";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.dataExport");
  return { title: t("title") };
}

/**
 * Taking your data out.
 *
 * Two formats because they answer different questions: the spreadsheet is
 * what you send an accountant, the JSON is what you hand another system the
 * day you want to leave. The page says plainly that neither is a backup,
 * because the failure mode of believing otherwise is losing everything
 * while feeling covered. The ride files are a third download beside them
 * (ADR 0084). Each is limited per workspace and hour; a download past the
 * limit comes back here with `?limited=`, and the page says when it lifts.
 * A coach, and the owner of a personal workspace, also sees how much of
 * the workspace's room for files is used (ADR 0087).
 */
export default async function DataExportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("app.dataExport");
  const locale = await getLocale();
  const sheets = [...EXPORT_TABLES.map((table) => table.sheet), AUDIT_SHEET].join(", ");
  // In one person's own workspace the way out lives here, under Dig, since
  // there is no workspace tab (ADR 0080): "Slet min konto og alt om mig".
  const ctx = await getOrgContext();
  const personal = ctx ? (await workspaceKind(ctx.orgId, ctx.userId)) === "personal" : false;
  const role = ctx ? await currentRole(ctx) : null;
  const owner = personal && role === "owner";
  const name = owner && ctx ? await workspaceName(ctx) : null;
  // The consent to health data the owner gave at sign-up (ADR 0088), and
  // the way to withdraw it or give it again. A workspace from before door
  // 2 has none, and shows nothing.
  const consent = owner && ctx ? await myHealthConsent(ctx) : null;
  const forWhom = owner && ctx && (await whoAmI(ctx.orgId, ctx.userId))?.rider ? "me" : "child";
  const consentDate =
    consent && consent.state !== "none"
      ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
          dateStyle: "long",
          timeZone: "Europe/Copenhagen",
        }).format(consent.state === "given" ? consent.givenAt : consent.withdrawnAt)
      : "";
  const coach = role === "owner" || role === "admin";
  // The routes send a person back to the page in the language they use.
  const href = (path: string, query: string[] = []) => {
    const all = locale === "en" ? [...query, "locale=en"] : query;
    return all.length > 0 ? `${path}?${all.join("&")}` : path;
  };
  const search = await searchParams;
  const minutes = Math.max(1, Math.min(60, Number(search.minutes) || 60));
  const limited =
    search.limited === "export"
      ? t("limitedExport", { minutes })
      : search.limited === "files"
        ? t("limitedFiles", { minutes })
        : null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>

      {limited && (
        <p
          role="status"
          className="bg-warning-tint flex items-start gap-2 rounded-lg px-3 py-2.5 text-2sm"
        >
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {limited}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("xlsxTitle")}</CardTitle>
          <CardDescription>{t("xlsxBody")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <a href={href("/api/export")} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
            <FileSpreadsheet data-slot="icon" />
            {t("xlsxAction")}
          </a>
          <p className="text-meta text-2sm leading-relaxed">
            {t("sheetsLabel")} {t("membersSheet")}, {sheets}.
          </p>
          <p className="text-meta text-2sm leading-relaxed">
            {t("auditNote", { rows: AUDIT_SHEET_ROWS })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("jsonTitle")}</CardTitle>
          <CardDescription>{t("jsonBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={href("/api/export", ["format=json"])}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-fit")}
          >
            <FileJson data-slot="icon" />
            {t("jsonAction")}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("filesTitle")}</CardTitle>
          <CardDescription>{t("filesBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={href("/api/export/files")}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-fit")}
          >
            <FileArchive data-slot="icon" />
            {t("filesAction")}
          </a>
        </CardContent>
      </Card>

      {coach && ctx && <StorageCard ctx={ctx} />}

      <div className="border-border bg-warning-tint rounded-lg border p-4">
        <p className="text-2sm leading-relaxed">
          <strong className="font-semibold">{t("notBackupTitle")}</strong> {t("notBackupBody")}
        </p>
      </div>

      <p className="text-meta text-2sm leading-relaxed">{t("privacy")}</p>

      {consent && consent.state !== "none" && (
        <HealthConsentCard consent={consent} date={consentDate} forWhom={forWhom} />
      )}

      {name !== null && <DeleteWorkspaceCard workspaceName={name} personal />}
    </div>
  );
}
