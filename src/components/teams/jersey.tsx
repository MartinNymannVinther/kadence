import { cn } from "@/lib/utils";
import type { JerseyColours } from "@/modules/teams/types";

/** The body's outline, shared by the fill and the clip the pattern sits in. */
const BODY = "M30 14 Q45 6 48 6 Q60 20 72 6 Q75 6 90 14 L90 102 Q60 108 30 102 Z";

/**
 * A team's jersey, drawn (ADR 0072): one hand-drawn shape in Kadence's
 * line, filled with the colours the registry gives the team — the body,
 * the sleeves, and a third colour laid on as a chest band, stripes, the
 * upper body or one half, as the real jersey has it. No logo: that is
 * the team's, and a drawing from its colours says enough at the size of
 * a card. A team without colours wears a neutral jersey with its
 * initials, so the page can tell the reader which jerseys have been
 * checked and which have not.
 */
export function Jersey({
  colours,
  initials,
  label,
  className,
}: {
  colours: JerseyColours | null;
  initials: string;
  label: string;
  className?: string;
}) {
  const body = colours?.body ?? "var(--secondary)";
  const sleeves = colours?.sleeves ?? "var(--secondary)";
  const line = "var(--border)";
  const clip = `jersey-${initials.toLowerCase() || "x"}-${(colours?.body ?? "none").slice(1)}`;
  return (
    <svg
      viewBox="0 0 120 110"
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full", className)}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* sleeves */}
      <path d="M30 14 L4 34 L16 56 L30 48 Z" fill={sleeves} stroke={line} strokeWidth="2" />
      <path d="M90 14 L116 34 L104 56 L90 48 Z" fill={sleeves} stroke={line} strokeWidth="2" />
      {/* body */}
      <clipPath id={clip}>
        <path d={BODY} />
      </clipPath>
      <path d={BODY} fill={body} stroke={line} strokeWidth="2" />
      {colours?.band && (
        <g clipPath={`url(#${clip})`} fill={colours.band}>
          <Pattern pattern={colours.pattern ?? "band"} />
        </g>
      )}
      <path d={BODY} fill="none" stroke={line} strokeWidth="2" />
      {/* collar */}
      <path d="M48 6 Q60 20 72 6" fill="none" stroke={line} strokeWidth="2" />
      {/* zip */}
      <line x1="60" y1="18" x2="60" y2="60" stroke={line} strokeWidth="1.5" opacity="0.6" />
      {!colours && (
        <text
          x="60"
          y="84"
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill="var(--muted-foreground)"
          fontFamily="inherit"
        >
          {initials}
        </text>
      )}
    </svg>
  );
}

/** The third colour's shape inside the body, clipped to it. */
function Pattern({ pattern }: { pattern: NonNullable<JerseyColours["pattern"]> }) {
  switch (pattern) {
    case "band":
      return <rect x="20" y="46" width="80" height="12" />;
    case "stripes":
      return (
        <>
          <rect x="20" y="30" width="80" height="6" />
          <rect x="20" y="46" width="80" height="6" />
          <rect x="20" y="62" width="80" height="6" />
          <rect x="20" y="78" width="80" height="6" />
        </>
      );
    case "chest":
      return <rect x="20" y="0" width="80" height="52" />;
    case "halves":
      return <rect x="20" y="0" width="40" height="110" />;
  }
}

/** Up to three initials from a team's name, skipping the words every team has. */
export function initialsOf(name: string): string {
  const skip = new Set([
    "team",
    "cycling",
    "junior",
    "club",
    "ck",
    "cc",
    "p/b",
    "og",
    "and",
    "–",
    "-",
  ]);
  return name
    .split(/[\s–-]+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 3)
    .join("");
}
