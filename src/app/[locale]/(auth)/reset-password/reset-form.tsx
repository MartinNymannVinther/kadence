"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/core/auth/client";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 12;

/**
 * A new password from a coach's one-time link (ADR 0032). The rules are
 * the sign-up's: at least twelve characters. What went wrong is said in
 * the reader's words; a link that is used or old says to ask for another.
 */
export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < MIN_LENGTH) return setError(t("tooShort"));
    if (password !== String(form.get("repeat") ?? "")) return setError(t("mismatch"));
    setError(null);
    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) {
      setError(result.error.code === "INVALID_TOKEN" ? t("invalid") : t("failed"));
      return;
    }
    setDone(true);
  }

  if (!token)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("missing")}</CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{done ? t("done") : t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <Link href="/login" className={cn(buttonVariants(), "w-full")}>
            {t("login")}
          </Link>
        ) : (
          <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="repeat">{t("repeat")}</FieldLabel>
                <Input
                  id="repeat"
                  name="repeat"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                />
              </Field>
            </FieldGroup>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
              {t("submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
