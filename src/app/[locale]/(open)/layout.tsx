import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getSession } from "@/core/auth/session";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The open pages: guides and calculators anyone may read without an
 * account (ADR 0047). Signed in or not, they look the same; the corner
 * leads back into Kadence or to the login. Nothing on these pages reads
 * the database beyond the session cookie that decides that one link.
 */
export default async function OpenLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("open");
  const session = await getSession();

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="focus-ring rounded-md">
          <Wordmark className="text-xl" />
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/guides"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-sm:hidden")}
          >
            {t("nav.hub")}
          </Link>
          <Link
            href={session ? "/today" : "/login"}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {session ? t("nav.toApp") : t("nav.login")}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20">{children}</main>

      <footer className="border-border mx-auto w-full max-w-3xl border-t px-6 py-6">
        <p className="text-meta text-2sm leading-relaxed">{t("footer")}</p>
        <Link
          href="/terms"
          className="focus-ring text-primary mt-2 inline-block text-2sm hover:underline"
        >
          {t("terms")}
        </Link>
      </footer>
    </div>
  );
}
