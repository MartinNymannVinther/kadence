"use client";

import { HaijMark, PRODUCT_NAME } from "@/components/wordmark";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";
import { TeamName } from "./team-name";

export type TeamLockupProps = {
  /** The team's name, under the wordmark on every screen. */
  organization: string;
  /** The club's logo, when it has one (ADR 0048). */
  logo?: string | null;
  /** The person is on more than one team: the name is the switcher. */
  switchable?: boolean;
  /** The installation's owner may create workspaces; nobody else sees the choice. */
  canCreate?: boolean;
};

const productName = "text-heading leading-none font-semibold tracking-[-0.045em]";

/**
 * The top of the sidebar and the "Mere" sheet (docs/adr/0068): the
 * family's mark, the product's name, and the team's name under it. With
 * somewhere to switch to — another team, or for the installation's owner a
 * new one to create — the team's name is the switcher, a button with a
 * chevron; otherwise it is plain text, because most people are on one
 * team and a control for nothing is only noise.
 *
 * In the sidebar the product's name leads home. In the sheet it is only
 * the name, as it was: the phone's header already leads home with a
 * target a thumb can hit, and a 21px link would be one it cannot.
 */
export function TeamLockup({
  home,
  organization,
  logo = null,
  switchable = false,
  canCreate = false,
}: TeamLockupProps & {
  /** Where the product's name leads; without it the name is only a name. */
  home?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <HaijMark className="h-5" />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {home ? (
          <Link
            href={home}
            className={cn(
              "focus-ring -my-0.5 rounded-sm py-0.5 transition-opacity hover:opacity-80",
              productName,
            )}
          >
            {PRODUCT_NAME}
          </Link>
        ) : (
          <span className={productName}>{PRODUCT_NAME}</span>
        )}
        {switchable ? (
          <OrgSwitcher organization={organization} logo={logo} canCreate={canCreate} />
        ) : organization ? (
          <span className="text-meta mt-1 flex max-w-full min-w-0 items-center gap-1.5 text-xs leading-none">
            <TeamName organization={organization} logo={logo} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
