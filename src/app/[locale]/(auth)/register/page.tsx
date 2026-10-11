import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstName } from "@/core/access/personal";
import { findValidInvitation } from "@/core/access/service";
import { selfSignupOpen, signupAllowed } from "@/core/auth/signup";
import { Link } from "@/i18n/navigation";
import { AccessRequestForm } from "./access-request-form";
import { RegisterForm } from "./register-form";
import { SelfSignupForm } from "./self-signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

/**
 * The front door, in four states.
 *
 * With a valid invitation in the link, the registration form, locked to
 * the address and organization the owner approved. With registration open
 * (or an empty installation), the plain form. With door 2 open
 * (`SIGNUP=individuals` and mail, docs/adr/0088), a person's own
 * workspace, with a link to the application for a club. Otherwise not a
 * closed sign but an application: a closed installation still wants to
 * hear from the people who would like to use it, and the owner decides.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string; apply?: string }>;
}) {
  const t = await getTranslations("auth.register");
  const { invitation: token, apply } = await searchParams;

  if (token) {
    const invitation = await findValidInvitation(token);
    if (invitation) {
      return (
        <RegisterForm
          invitation={{
            token,
            email: invitation.email,
            organizationName: invitation.organizationName,
            personal: invitation.personal && {
              forWhom: invitation.personal.forWhom,
              childFirstName: invitation.personal.childName
                ? firstName(invitation.personal.childName)
                : null,
            },
          }}
        />
      );
    }
    // A dead key is told apart from a closed door: the person holding it
    // did nothing wrong and should ask for a new link, not give up.
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("invitationInvalidTitle")}</CardTitle>
          <CardDescription>{t("invitationInvalidBody")}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 text-sm">
          <Link
            href="/register"
            className="focus-ring font-medium underline-offset-4 hover:underline"
          >
            {t("applyLink")}
          </Link>
          <Link href="/login" className="focus-ring font-medium underline-offset-4 hover:underline">
            {t("loginLink")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (await signupAllowed()) {
    return <RegisterForm />;
  }

  // Door 2 (docs/adr/0088): a person creates their own workspace here, and
  // a club applies one link away (`?apply=1`).
  if (selfSignupOpen()) {
    return apply ? <AccessRequestForm clubOnly /> : <SelfSignupForm />;
  }

  return <AccessRequestForm />;
}
