"use client";

import { SearchIconButton } from "@/components/search/search-button";
import { Wordmark } from "@/components/wordmark";
import { Link } from "@/i18n/navigation";
import { UserMenu } from "./user-menu";

/**
 * Slim top bar for small screens: the brand, the magnifier that opens Søg,
 * and the person. The places themselves are in the bottom bar and its
 * "Mere" sheet (ADR 0061), where a thumb reaches them.
 */
export function MobileHeader({
  userName,
  userEmail,
  home,
}: {
  userName: string;
  userEmail: string;
  /** Where the wordmark leads: the first place in the role's day. */
  home: string;
}) {
  return (
    <header className="print:hidden! bg-background/90 border-border sticky top-0 z-40 border-b backdrop-blur-md lg:hidden">
      <div className="flex h-[3.75rem] items-center justify-between gap-3 px-[18px]">
        <Link href={home} aria-label="Kadence" className="focus-ring flex min-h-11 items-center">
          <Wordmark className="text-lg" />
        </Link>
        <div className="flex items-center gap-1">
          <SearchIconButton />
          <UserMenu name={userName} email={userEmail} />
        </div>
      </div>
    </header>
  );
}
