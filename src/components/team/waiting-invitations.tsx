import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recipient } from "./invitation-recipients";
import { RecipientList } from "./recipient-list";

/**
 * "Links, der venter" on the coach's list of riders: every rider and
 * parent who has been invited and not joined yet, with "Del" to send the
 * link again — the overview after "Inviter hele holdet" (ADR 0064), and
 * for links made one at a time too. Shown only while there is one.
 */
export function WaitingInvitations({
  recipients,
  team,
}: {
  recipients: Recipient[];
  team: string;
}) {
  const t = useTranslations("riders.waiting");
  if (recipients.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("title")} <span className="text-meta font-normal">({recipients.length})</span>
        </CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RecipientList recipients={recipients} team={team} />
      </CardContent>
    </Card>
  );
}
