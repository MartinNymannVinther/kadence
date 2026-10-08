"use client";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authClient } from "@/core/auth/client";
import { useRouter } from "@/i18n/navigation";
import { organizationSlug } from "@/lib/slug";
import { TeamName } from "./team-name";

/**
 * The team's name under the wordmark, as the switcher (docs/adr/0068):
 * shown by ./team-lockup.tsx only when the person has somewhere to switch
 * to. The button reads as the team's name with "Skift hold" after it, so
 * a screen reader hears both what is chosen and what pressing does.
 */
export function OrgSwitcher({
  organization,
  logo = null,
  align = "start",
  canCreate = false,
}: {
  /** The active team's name, as the server read it: no flash while the list loads. */
  organization: string;
  /** The club's logo, when it has one (ADR 0048). */
  logo?: string | null;
  align?: "start" | "end" | "center";
  /**
   * Only the installation's owner creates workspaces (ADR 0048); a new club
   * comes in through an approved application.
   */
  canCreate?: boolean;
}) {
  const t = useTranslations("app.orgSwitcher");
  const router = useRouter();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(organizationId: string) {
    if (organizationId === activeOrganization?.id) return;
    const target = organizations?.find((o) => o.id === organizationId);
    const { error: switchError } = await authClient.organization.setActive({ organizationId });
    if (switchError) {
      toast.error(t("switchError"));
      return;
    }
    if (target) toast.success(t("switched", { name: target.name }));
    router.refresh();
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    const { data, error: createError } = await authClient.organization.create({
      name,
      slug: organizationSlug(name),
    });
    setPending(false);
    if (createError || !data) {
      setError(t("error"));
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    setDialogOpen(false);
    toast.success(t("created", { name: data.name }));
    router.refresh();
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              title={t("switch")}
              className="focus-ring text-meta hover:text-sidebar-foreground hover:bg-sidebar-hover data-popup-open:bg-sidebar-hover -ml-1.5 flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs leading-none transition-colors duration-[120ms] ease-out max-lg:min-h-11"
            />
          }
        >
          <TeamName organization={organization} logo={logo} />
          <span className="sr-only">, {t("switch")}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-56">
          {/* Base UI: a GroupLabel must live inside a Group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("switch")}</DropdownMenuLabel>
            {(organizations ?? []).map((team) => (
              <DropdownMenuItem key={team.id} onClick={() => switchTo(team.id)}>
                <span className="flex-1 truncate">{team.name}</span>
                {team.id === activeOrganization?.id ? <Check data-slot="icon" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {canCreate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <Plus data-slot="icon" />
                {t("create")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-org-name">{t("name")}</FieldLabel>
              <Input id="new-org-name" name="name" required maxLength={200} />
            </Field>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
            {t("createSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
