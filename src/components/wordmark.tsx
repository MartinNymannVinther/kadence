import { cn } from "@/lib/utils";

/**
 * The Haij family mark: three left-aligned bars, long-short-medium, in the
 * moss ramp. Kadence is one tool in that family and wears the same mark next
 * to its own name, the way every Haij tool does. Inline SVG so it follows
 * the theme in both light and dark, and so it needs no network request. The
 * wordmark beside it is live text in Archivo 600, per the design handoff -
 * it is never part of the SVG.
 */
export function HaijMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "ink";
}) {
  const fills =
    tone === "ink"
      ? ["currentColor", "currentColor", "currentColor"]
      : ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  return (
    <svg
      viewBox="0 0 38 34"
      role="presentation"
      aria-hidden
      className={cn("h-[1.15em] w-auto shrink-0", className)}
    >
      <rect x="0" y="0" width="38" height="8" rx="2.5" fill={fills[0]} />
      <rect x="0" y="13" width="25" height="8" rx="2.5" fill={fills[1]} />
      <rect x="0" y="26" width="31" height="8" rx="2.5" fill={fills[2]} />
    </svg>
  );
}

/** The product's name as it is written everywhere. */
export const PRODUCT_NAME = "Kadence";

/** Mark plus wordmark on one line. `className` sets the type size. */
export function Wordmark({ className, tone }: { className?: string; tone?: "brand" | "ink" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <HaijMark tone={tone} />
      <span className="tracking-[-0.03em]">{PRODUCT_NAME}</span>
    </span>
  );
}

/**
 * Sidebar lockup: mark and wordmark over the workspace name, the way the
 * app identifies both product and tenant in one block. A club that has
 * uploaded a logo (ADR 0048) has it beside its name; the family's mark
 * stays where it is.
 */
export function WordmarkLockup({
  organization,
  logo,
}: {
  organization?: string;
  /** URL of the club's logo, when it has one. */
  logo?: string | null;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <HaijMark className="h-5" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[1.0625rem] leading-none font-semibold tracking-[-0.045em]">
          {PRODUCT_NAME}
        </span>
        {organization ? (
          <span className="text-meta mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-none font-normal">
            {logo ? (
              // The image is the club's own, served behind its login; next/image
              // would fetch it without the session and get nothing.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-4 shrink-0 rounded-sm object-contain" />
            ) : null}
            <span className="truncate">{organization}</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
