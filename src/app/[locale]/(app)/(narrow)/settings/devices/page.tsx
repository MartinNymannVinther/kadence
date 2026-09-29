import type { Metadata } from "next";
import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DeviceCard } from "@/components/devices/device-card";
import { connectErrorKey } from "@/components/devices/device-words";
import { UploadKeysCard } from "@/components/devices/upload-keys-card";
import { getOrgContext } from "@/core/auth/session";
import { env } from "@/core/env";
import { Link, redirect } from "@/i18n/navigation";
import { listDeviceLinks } from "@/modules/devices/links";
import { isProviderId } from "@/modules/devices/providers";
import { listUploadKeys, MAX_KEYS_PER_RIDER } from "@/modules/devices/upload-keys";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("devices");
  return { title: t("title") };
}

const SUBPROCESSORS =
  "https://github.com/MartinNymannVinther/kadence/blob/main/docs/subprocessors.md#services-a-rider-chooses-to-connect";

/**
 * A rider's own Wahoo, Garmin and Polar (ADR 0018, 0020): each with where
 * it stands and the one thing to do next. Without the installation's keys
 * a provider says so and FIT upload does the job (dogma 2). Wahoo and
 * Garmin are US companies, Polar a Finnish one; the rider chooses to
 * connect, and the page says what flows.
 * Coaches and parents do not connect anyone's device; they are told so.
 * The OAuth round trip lands back here with `?connected=` or `?error=`.
 * Below the providers, the rider's upload keys (ADR 0029): what a helper
 * hands rides over with, whatever the installation has keys for.
 */
export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("devices");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const connected = typeof search.connected === "string" ? search.connected : undefined;
  const error = connectErrorKey(typeof search.error === "string" ? search.error : undefined);

  if (!me?.rider) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
        </div>
        <p className="border-border bg-card rounded-xl border p-4 text-2sm leading-relaxed">
          {me?.isCoach ? t("coachNote") : t("otherNote")}
        </p>
      </div>
    );
  }

  const [links, keys] = await Promise.all([listDeviceLinks(ctx), listUploadKeys(ctx)]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>

      {connected && isProviderId(connected) && (
        <p
          role="status"
          className="bg-success-tint text-success flex items-center gap-2 rounded-lg px-3 py-2.5 text-2sm font-medium"
        >
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          {t("connected", { name: t(`name.${connected}`) })}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="bg-warning-tint flex items-start gap-2 rounded-lg px-3 py-2.5 text-2sm"
        >
          <CircleX aria-hidden className="text-destructive mt-0.5 size-4 shrink-0" />
          {t(`connectError.${error}` as "connectError.failed")}
        </p>
      )}

      <div className="grid gap-3">
        {links.map((link) => (
          <DeviceCard
            key={link.provider}
            link={{ ...link, lastSyncAt: link.lastSyncAt?.toISOString() ?? null }}
          />
        ))}
      </div>

      <UploadKeysCard
        own
        max={MAX_KEYS_PER_RIDER}
        endpoint={new URL("/api/ingest", env.BETTER_AUTH_URL).toString()}
        keys={keys.map((key) => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        }))}
      />

      <p className="text-meta text-2sm leading-relaxed">
        {t("uploadInstead")}{" "}
        <Link href="/today" className="focus-ring text-primary font-medium hover:underline">
          {t("uploadLink")}
        </Link>
      </p>

      <div className="border-border bg-secondary/40 flex flex-col gap-1.5 rounded-xl border p-4">
        <h3 className="text-sm font-semibold">{t("usTitle")}</h3>
        <p className="text-2sm leading-relaxed">{t("usBody")}</p>
        <a
          href={SUBPROCESSORS}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring text-primary inline-flex min-h-9 w-fit items-center gap-1.5 text-2sm font-medium hover:underline"
        >
          {t("usLink")}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
