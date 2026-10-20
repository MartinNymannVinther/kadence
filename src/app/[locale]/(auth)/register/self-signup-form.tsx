"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  EMPTY_PERSONAL,
  PersonalFields,
  personalPayload,
  tooYoung,
  type PersonalDraft,
} from "@/components/access/personal-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerSelfAction } from "@/core/auth/actions";
import { UNVERIFIED_DAYS, VERIFY_GRACE_DAYS } from "@/core/auth/verify-days";
import { Link, useRouter } from "@/i18n/navigation";

const linkClass = "focus-ring font-medium underline-offset-4 hover:underline";

/**
 * Door 2 (docs/adr/0088): a person creates their own workspace — for
 * themselves from 15, or for their child — with S-01's "Mig selv" fields,
 * a password and two boxes that must both be ticked: the terms, and the
 * explicit consent to health data, which a parent gives on the child's
 * behalf. A club still applies, one link away. Under 15 for "me" the form
 * says so plainly and does not send.
 */
export function SelfSignupForm() {
  const t = useTranslations("auth.self");
  const tr = useTranslations("auth.register");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personal, setPersonal] = useState<PersonalDraft>(EMPTY_PERSONAL);
  const [terms, setTerms] = useState(false);
  const [health, setHealth] = useState(false);
  const blocked = tooYoung(personal);
  const child = personal.forWhom === "child";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!terms || !health) {
      setError(t("errorConsent"));
      return;
    }
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await registerSelfAction({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      personal: personalPayload(personal),
      terms,
      health,
      website: String(form.get("website") ?? ""),
    });
    if (!result.ok) {
      setPending(false);
      const messages = {
        invalid: tr("errorInvalid"),
        consent: t("errorConsent"),
        tooYoung: tr("errorTooYoung"),
        tooMany: t("errorTooMany"),
        emailExists: tr("errorEmailExists"),
        closed: t("errorClosed"),
        generic: tr("errorGeneric"),
      };
      setError(messages[result.error]);
      return;
    }
    // In at once (ADR 0088, amended): the stripe on every page asks for the address.
    router.push("/today");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="self-name">{t("name")}</FieldLabel>
              <Input id="self-name" name="name" autoComplete="name" required maxLength={200} />
            </Field>
            <Field>
              <FieldLabel htmlFor="self-email">{t("email")}</FieldLabel>
              <Input id="self-email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="self-password">{tr("password")}</FieldLabel>
              <Input
                id="self-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
              <FieldDescription>{tr("passwordHint")}</FieldDescription>
            </Field>
            <PersonalFields idPrefix="self" draft={personal} onChange={setPersonal} />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">{t("consentLegend")}</legend>
              <label className="flex items-start gap-2.5 text-2sm leading-relaxed">
                <input
                  type="checkbox"
                  name="terms"
                  required
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="accent-primary mt-1 size-4 shrink-0"
                />
                <span>
                  {t.rich("terms", {
                    link: (chunks) => (
                      <Link href="/terms" target="_blank" className={linkClass}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-2sm leading-relaxed">
                <input
                  type="checkbox"
                  name="health"
                  required
                  checked={health}
                  onChange={(e) => setHealth(e.target.checked)}
                  className="accent-primary mt-1 size-4 shrink-0"
                />
                <span>{child ? t("healthChild") : t("healthMe")}</span>
              </label>
            </fieldset>
            {/* Honeypot: hidden from people, irresistible to bots. */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="self-website">Website</label>
              <input
                id="self-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <p className="text-meta text-2sm leading-relaxed">
            {t("verifyNote", { grace: VERIFY_GRACE_DAYS, days: UNVERIFIED_DAYS })}
          </p>
          <Button type="submit" disabled={pending || blocked} className="w-full">
            {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
            {t("submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 text-sm">
        <Link href="/register?apply=1" className={linkClass}>
          {t("clubLink")}
        </Link>
        <span>
          <span className="text-muted-foreground">{tr("haveAccount")}&nbsp;</span>
          <Link href="/login" className={linkClass}>
            {tr("loginLink")}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
