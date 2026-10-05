import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/** A link to a maker or a shop, opening elsewhere and saying so to a screen reader. */
export function Outlink({ href, label }: { href: string; label: string }) {
  const open = useTranslations("open");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring text-primary inline-flex items-center gap-1 hover:underline"
    >
      {label}
      <ExternalLink aria-hidden className="size-3" />
      <span className="sr-only">{open("opensElsewhere")}</span>
    </a>
  );
}
