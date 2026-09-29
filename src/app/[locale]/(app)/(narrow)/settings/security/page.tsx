import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getOrgContext, getSession } from "@/core/auth/session";
import { listMyResets } from "@/core/team/reset-link";
import { PasskeyManager } from "./passkey-manager";
import { TotpManager } from "./totp-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.security");
  return { title: t("title") };
}

export default async function SecurityPage() {
  const t = await getTranslations("app.security");
  const session = await getSession();
  const ctx = await getOrgContext();
  const resets = ctx ? await listMyResets(ctx) : [];
  const locale = await getLocale();
  const when = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  });

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>
      <PasskeyManager />
      <TotpManager initialEnabled={Boolean(session?.user.twoFactorEnabled)} />
      {/* A coach's link for a new password is the person's to know of (ADR 0032). */}
      {resets.length > 0 && (
        <section aria-labelledby="security-resets" className="flex flex-col gap-2">
          <h3 id="security-resets" className="text-sm font-semibold">
            {t("resets.title")}
          </h3>
          <p className="text-meta text-2sm leading-relaxed">{t("resets.body")}</p>
          <ul className="flex flex-col gap-1 text-2sm">
            {resets.map((reset) => (
              <li key={reset.createdAt.toISOString()}>
                {t("resets.item", { name: reset.byName, date: when.format(reset.createdAt) })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
