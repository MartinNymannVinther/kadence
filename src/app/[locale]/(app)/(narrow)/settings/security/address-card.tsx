"use client";

import { Check, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { askForVerificationAction } from "@/core/auth/actions";

type Said = "sent" | "rateLimited" | "failed" | null;

/**
 * "Bekræft din adresse" (docs/adr/0086): the person's address, a check
 * mark once it is confirmed, and before that a button that sends the link
 * to it. Shown only where the installation sends mail.
 */
export function AddressCard({
  email,
  verified,
  outcome,
}: {
  email: string;
  verified: boolean;
  /** What the confirmation link said when it came back here. */
  outcome: "done" | "expired" | null;
}) {
  const t = useTranslations("app.security.address");
  const [pending, setPending] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  async function send() {
    setPending(true);
    try {
      const result = await askForVerificationAction();
      setSaid(
        result === "sent" || result === "verified"
          ? "sent"
          : result === "rateLimited"
            ? "rateLimited"
            : "failed",
      );
    } catch {
      setSaid("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          {verified ? (
            <Badge>
              <Check data-icon="inline-start" />
              {t("verified")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("unverified")}</Badge>
          )}
        </CardTitle>
        <CardDescription className="break-all">{email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {outcome === "done" && verified && <p className="text-2sm">{t("done")}</p>}
        {outcome === "expired" && !verified && <p className="text-2sm">{t("expired")}</p>}
        {!verified && (
          <>
            <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
            {said === "sent" ? (
              <p role="status" className="text-2sm leading-relaxed">
                {t("sent", { email })}
              </p>
            ) : (
              <Button
                variant="outline"
                onClick={send}
                disabled={pending}
                className="self-start max-sm:h-11"
              >
                {pending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Mail data-icon="inline-start" />
                )}
                {t("send")}
              </Button>
            )}
            {(said === "rateLimited" || said === "failed") && (
              <p role="alert" className="text-destructive text-2sm">
                {said === "rateLimited" ? t("tooMany") : t("failed")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
