import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TwoFactorForm } from "./two-factor-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.twoFactor");
  return { title: t("title") };
}

export default function TwoFactorPage() {
  // The form reads where to go on to (?next=) from the address.
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  );
}
