"use client";

import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/core/auth/client";
import { resendVerificationAction } from "@/core/auth/actions";
import { useRouter } from "@/i18n/navigation";

type Said = "sent" | "rateLimited" | "failed" | null;

/** "Send mailen igen", three times an hour, and the way out: signing out. */
export function ResendVerification() {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  async function send() {
    setPending(true);
    try {
      const result = await resendVerificationAction();
      if (result === "verified") {
        router.push("/today");
        router.refresh();
        return;
      }
      setSaid(result === "sent" ? "sent" : result === "rateLimited" ? "rateLimited" : "failed");
    } catch {
      setSaid("failed");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {said && (
        <p role="status" className="text-2sm leading-relaxed">
          {t(said)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={send} disabled={pending}>
          {pending ? (
            <Loader2 data-slot="icon" className="animate-spin" />
          ) : (
            <Mail data-slot="icon" />
          )}
          {t("resend")}
        </Button>
        <Button variant="ghost" onClick={signOut}>
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
