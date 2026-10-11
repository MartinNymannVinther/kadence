import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  // The link's token must not travel on to anywhere a link on this page leads.
  return { title: t("title"), referrer: "no-referrer" };
}

/**
 * Where a coach's one-time link lands (ADR 0032), and the one a person
 * asked for by e-mail (docs/adr/0086): a new password, twice,
 * for Better Auth's own `/reset-password`, which takes the token once and
 * within the hour. Nobody is signed in here; the token is the door.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; via?: string | string[] }>;
}) {
  const { token, via } = await searchParams;
  // A link from "Glemt adgangskode?" (docs/adr/0086) says so; the words differ, the door does not.
  return (
    <ResetForm
      token={typeof token === "string" ? token.slice(0, 200) : ""}
      viaMail={via === "mail"}
    />
  );
}
