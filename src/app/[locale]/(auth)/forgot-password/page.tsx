import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { mailConfigured } from "@/core/mail/mailer";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title") };
}

/**
 * "Glemt adgangskode?" (docs/adr/0086): one field, and the same answer
 * for every address. Only where the installation sends mail; without it
 * the page is not there, and a coach's link (ADR 0032) is the way back in.
 */
export default function ForgotPasswordPage() {
  if (!mailConfigured()) notFound();
  return <ForgotForm />;
}
