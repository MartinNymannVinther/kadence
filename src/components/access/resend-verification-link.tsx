"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/core/auth/actions";
import { useRouter } from "@/i18n/navigation";

type Said = "sent" | "rateLimited" | "failed" | null;

/**
 * "Send mailen igen" in the stripe (verify-stripe.tsx): the same action
 * as on /verify, with its three an hour, said in the stripe itself.
 */
export function ResendVerificationLink() {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<Said>(null);

  const send = () =>
    start(async () => {
      try {
        const result = await resendVerificationAction();
        if (result === "verified") {
          router.refresh();
          return;
        }
        setSaid(result === "sent" ? "sent" : result === "rateLimited" ? "rateLimited" : "failed");
      } catch {
        setSaid("failed");
      }
    });

  if (said) return <span role="status">{t(said)}</span>;
  return (
    <button
      type="button"
      onClick={send}
      disabled={pending}
      className="focus-ring text-primary font-medium underline-offset-4 hover:underline disabled:opacity-60"
    >
      {t("resend")}
    </button>
  );
}
