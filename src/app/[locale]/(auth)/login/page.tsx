import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signupAllowed } from "@/core/auth/signup";
import { mailConfigured } from "@/core/mail/mailer";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage() {
  // No point offering a door that is locked. "Glemt adgangskode?" leads
  // to a link by e-mail only where the installation sends mail
  // (docs/adr/0086); elsewhere it says to ask a coach (ADR 0032).
  // The form reads the URL's `next` parameter, which Next wants behind a
  // Suspense boundary even on a page that is dynamic anyway.
  return (
    <Suspense>
      <LoginForm signupOpen={await signupAllowed()} mailOn={mailConfigured()} />
    </Suspense>
  );
}
