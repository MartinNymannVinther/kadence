import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * A card that is one way into a guide: its icon, its name, one line on
 * what is in it, and the word that opens it. Viden og hjælp opens both
 * guides and the manual with it, the parents' page its guide, and
 * GuidesCard the open guides and calculators. A `file` is a plain link,
 * outside the app's routes and its locale prefix: the manual's PDF.
 */
export function GuideDoor({
  href,
  icon: Icon,
  title,
  body,
  open,
  className,
  file = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  open: string;
  className?: string;
  /** A file under public/, not a page: a plain link without the locale. */
  file?: boolean;
}) {
  const classes = cn(
    "focus-ring border-border bg-card hover:border-primary flex items-start gap-3 rounded-xl border p-4 shadow-surface",
    className,
  );
  const inside = (
    <>
      <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
      <span className="flex flex-col gap-1">
        <span className="text-reading font-semibold">{title}</span>
        <span className="text-meta text-2sm leading-relaxed">{body}</span>
        <span className="text-primary text-2sm font-medium">{open}</span>
      </span>
    </>
  );
  if (file) {
    return (
      <a href={href} className={classes}>
        {inside}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {inside}
    </Link>
  );
}
