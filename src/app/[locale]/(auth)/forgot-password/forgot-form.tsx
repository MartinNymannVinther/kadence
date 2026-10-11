"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/core/auth/actions";
import { Link } from "@/i18n/navigation";

type Said = "sent" | "rateLimited" | "failed" | null;

/**
 * One field, and an answer that is the same whether the address has an
 * account or not: "Hvis adressen findes, har vi sendt et link". A coach's
 * link (ADR 0032) is named beside it, for whoever does not get the mail.
 */
export function ForgotForm() {
  const t = useTranslations("auth.forgot");
  const [pending, setPending] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await forgotPasswordAction({ email: String(form.get("email") ?? "") });
      setSaid(result === "rateLimited" ? "rateLimited" : result === "sent" ? "sent" : "failed");
    } catch {
      setSaid("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {said === "sent" ? (
          <p role="status" className="text-sm leading-relaxed">
            {t("sent")}
          </p>
        ) : (
          <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username" required />
              </Field>
            </FieldGroup>
            {said === "rateLimited" || said === "failed" ? (
              <p role="alert" className="text-destructive text-sm">
                {said === "rateLimited" ? t("tooMany") : t("failed")}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
              {t("submit")}
            </Button>
          </form>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed">{t("coach")}</p>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="focus-ring font-medium underline-offset-4 hover:underline">
          {t("back")}
        </Link>
      </CardFooter>
    </Card>
  );
}
