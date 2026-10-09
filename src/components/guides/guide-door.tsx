import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * A card that is one way into a guide: its icon, its name, one line on
 * what is in it, and the word that opens it. Viden og hjælp opens both
 * guides with it, the parents' page its guide, and GuidesCard the open
 * guides and calculators.
 */
export function GuideDoor({
  href,
  icon: Icon,
  title,
  body,
  open,
  className,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  open: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "focus-ring border-border bg-card hover:border-primary flex items-start gap-3 rounded-xl border p-4 shadow-surface",
        className,
      )}
    >
      <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
      <span className="flex flex-col gap-1">
        <span className="text-reading font-semibold">{title}</span>
        <span className="text-meta text-2sm leading-relaxed">{body}</span>
        <span className="text-primary text-2sm font-medium">{open}</span>
      </span>
    </Link>
  );
}
