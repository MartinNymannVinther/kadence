import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/core/auth/session";
import { mustVerifyFirst } from "@/core/auth/verify-first";
import { redirect } from "@/i18n/navigation";
import { UNVERIFIED_DAYS } from "@/modules/signup/sweep";
import { ResendVerification } from "./resend-verification";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify");
  return { title: t("title") };
}

/**
 * The one page a person who created their own workspace sees until their
 * address is confirmed (docs/adr/0088): a mail is on its way, it can be
 * sent again three times an hour, and nothing else of Kadence. Once the
 * address is confirmed, or for anyone who never had to, it is Today.
 */
export default async function VerifyPage() {
  const session = await getSession();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!(await mustVerifyFirst(session.user))) {
    redirect({ href: "/today", locale });
    return null;
  }
  const t = await getTranslations("auth.verify");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="break-words">
          {t("body", { email: session.user.email })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-meta text-2sm leading-relaxed">{t("spam")}</p>
        <ResendVerification />
        <p className="text-meta text-2sm leading-relaxed">
          {t("expiry", { days: UNVERIFIED_DAYS })}
        </p>
      </CardContent>
    </Card>
  );
}
