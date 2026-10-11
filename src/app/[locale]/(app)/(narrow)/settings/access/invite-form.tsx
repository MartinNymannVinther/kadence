"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ChoiceRadios } from "@/components/access/choice-radios";
import {
  EMPTY_PERSONAL,
  PersonalFields,
  personalPayload,
  tooYoung,
  type PersonalDraft,
} from "@/components/access/personal-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createInvitationAction, type IssuedLink } from "@/core/access/actions";
import type { WorkspaceKind } from "@/core/access/personal";

/**
 * The owner invites an address directly, without an application: a club
 * with the name the owner types, or one person's own training — theirs
 * or their child's — named after its rider (docs/adr/0080), the same
 * choice the application form offers.
 */
export function InviteForm({ onIssued }: { onIssued: (link: IssuedLink) => void }) {
  const t = useTranslations("settings.access");
  const tApply = useTranslations("auth.apply");
  const tCommon = useTranslations("common");
  const [inviting, setInviting] = useState(false);
  const [kind, setKind] = useState<WorkspaceKind>("club");
  const [personal, setPersonal] = useState<PersonalDraft>(EMPTY_PERSONAL);
  const blocked = kind === "personal" && tooYoung(personal);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    setInviting(true);
    try {
      const result = await createInvitationAction(
        kind === "club"
          ? { kind, email, organizationName: String(form.get("organizationName") ?? "") }
          : {
              kind,
              email,
              name: String(form.get("name") ?? ""),
              personal: personalPayload(personal),
            },
      );
      if (!result.ok) {
        toast.error(result.error === "invalid" ? t("errorInvalid") : tCommon("error"));
        return;
      }
      onIssued(result.data);
      formElement.reset();
      setPersonal(EMPTY_PERSONAL);
    } catch (error) {
      console.error("access: invite failed", error);
      toast.error(tCommon("error"));
    } finally {
      setInviting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inviteTitle")}</CardTitle>
        <CardDescription>{t("inviteBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <FieldGroup>
            <ChoiceRadios
              legend={tApply("kindLegend")}
              value={kind}
              onChange={setKind}
              options={[
                { value: "club", label: tApply("kindClub") },
                { value: "personal", label: tApply("kindPersonal") },
              ]}
            />
            <Field>
              <FieldLabel htmlFor="invite-email">{t("inviteEmail")}</FieldLabel>
              <Input id="invite-email" name="email" type="email" required />
            </Field>
            {kind === "club" ? (
              <Field>
                <FieldLabel htmlFor="invite-organization">{t("inviteOrganization")}</FieldLabel>
                <Input id="invite-organization" name="organizationName" required maxLength={200} />
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="invite-name">{t("inviteName")}</FieldLabel>
                  <Input id="invite-name" name="name" required maxLength={200} />
                </Field>
                <PersonalFields idPrefix="invite" draft={personal} onChange={setPersonal} />
              </>
            )}
          </FieldGroup>
          <Button type="submit" variant="outline" className="w-fit" disabled={inviting || blocked}>
            {inviting ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
            {t("inviteSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
