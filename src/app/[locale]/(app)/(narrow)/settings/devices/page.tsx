import type { Metadata } from "next";
import { ChevronRight, CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DeviceCard } from "@/components/devices/device-card";
import { connectErrorKey } from "@/components/devices/device-words";
import { UploadKeysCard } from "@/components/devices/upload-keys-card";
import { getOrgContext } from "@/core/auth/session";
import { env } from "@/core/env";
import { Link, redirect } from "@/i18n/navigation";
import { listDeviceLinks } from "@/modules/devices/links";
import { providerOrigin } from "@/modules/devices/origin";
import {
  configuredProviders,
  isProviderId,
  providerById,
  type ProviderId,
} from "@/modules/devices/providers";
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
 * Only the providers this installation has keys for are offered; with
 * none, the page says plainly that files work just as well (ADR 0057).
 * Under "Avanceret", the rider's upload keys (ADR 0029): what a helper
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
  const offered = configuredProviders();
  const names = (ids: ProviderId[]) =>
    new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "disjunction" }).format(
      ids.map((id) => t(`name.${id}`)),
    );
  const namesAnd = (ids: ProviderId[]) =>
    new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" }).format(
      ids.map((id) => t(`name.${id}`)),
    );
  const pushers = offered.filter((id) => Boolean(providerById(id).pushWorkout));
  // Only the providers this installation has keys for, so the page never
  // tells a rider their data could go to a company nobody here can
  // actually connect to (P2-10).
  const origin = providerOrigin(offered);
  const originTitle = [
    origin.us.length > 0
      ? t("usTitle.us", { names: namesAnd(origin.us), count: origin.us.length })
      : null,
    origin.eu.length > 0
      ? t("usTitle.eu", { names: namesAnd(origin.eu), count: origin.eu.length })
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  const search = await searchParams;
  const connected = typeof search.connected === "string" ? search.connected : undefined;
  const error = connectErrorKey(typeof search.error === "string" ? search.error : undefined);

  if (!me?.rider) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 text-2sm leading-relaxed">
          {offered.length === 0 ? (
            <p>{t("ridersFilesOnly")}</p>
          ) : me?.isCoach ? (
            <>
              <p>{t("coachNote", { providers: names(offered) })}</p>
              {pushers.length > 0 && <p>{t("coachPush", { providers: names(pushers) })}</p>}
            </>
          ) : (
            <p>{t("otherNote", { providers: names(offered) })}</p>
          )}
        </div>
      </div>
    );
  }

  const [links, keys] = await Promise.all([listDeviceLinks(ctx), listUploadKeys(ctx)]);
  // A link made before the installation lost its keys still shows, so the rider knows it is there.
  const shown = links.filter((link) => link.configured || link.status !== null);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        {shown.length > 0 && offered.length > 0 && (
          <p className="text-meta text-2sm leading-relaxed">
            {t("subtitle", { providers: names(offered) })}
          </p>
        )}
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

      {shown.length > 0 ? (
        <div className="grid gap-3">
          {shown.map((link) => (
            <DeviceCard
              key={link.provider}
              link={{ ...link, lastSyncAt: link.lastSyncAt?.toISOString() ?? null }}
            />
          ))}
        </div>
      ) : null}

      <p
        className={
          shown.length > 0
            ? "text-meta text-2sm leading-relaxed"
            : "border-border bg-card rounded-xl border p-4 text-2sm leading-relaxed"
        }
      >
        {shown.length > 0 ? t("uploadInstead") : t("filesOnly")}{" "}
        <Link href="/me#upload" className="focus-ring text-primary font-medium hover:underline">
          {t("uploadLink")}
        </Link>
      </p>

      <details className="group text-2sm">
        <summary className="focus-ring text-primary flex min-h-11 w-fit cursor-pointer items-center gap-1 font-medium">
          <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
          {t("advanced")}
        </summary>
        <div className="mt-2">
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
        </div>
      </details>

      {offered.length > 0 && originTitle && (
        <div className="border-border bg-secondary/40 flex flex-col gap-1.5 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">{originTitle}</h3>
          <p className="text-2sm leading-relaxed">
            {t("usBody", {
              hasEu: origin.eu.length > 0 ? "yes" : "no",
              euNames: origin.eu.length > 0 ? names(origin.eu) : "",
              providers: names(offered),
              hasPushers: pushers.length > 0 ? "yes" : "no",
              pushers: pushers.length > 0 ? names(pushers) : "",
            })}
          </p>
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
      )}
    </div>
  );
}
