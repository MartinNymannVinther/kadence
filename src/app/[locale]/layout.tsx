import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

/**
 * The two faces every page paints with: the Latin subsets of Archivo and
 * Geist Mono. The other seven subsets in globals.css are fetched only if
 * a page has a glyph that needs one, so they are not preloaded.
 *
 * Without this the browser finds the files only after it has parsed the
 * stylesheet and laid out the first glyph, which is one round trip of
 * Arial. next/font emitted the same two links while it owned the fonts.
 */
const PRELOADED_FONTS = ["/fonts/archivo-latin.woff2", "/fonts/geist-mono-latin.woff2"];

export const metadata: Metadata = {
  title: {
    default: "Kadence",
    template: "%s · Kadence",
  },
  description:
    "Open source training planning for young cyclists, their coaches and their parents. Part of the Haij family.",
  applicationName: "Kadence",
  appleWebApp: { capable: true, title: "Kadence", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

/**
 * The browser's own chrome in 2a's paper, light and dark (src/app/theme.css).
 * `cover` lets the page reach under a phone's home indicator, so the bottom
 * bar can stand on the safe area rather than beside it (ADR 0061).
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  for (const href of PRELOADED_FONTS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
