/**
 * The parts of a long page as a row of links under its title (docs/adr/0073):
 * Mig's week, rides, form and the rest, a rider's page for the coach. Plain
 * anchors to the sections' own ids, so the row needs no script and the
 * address of a part can be shared. On a phone the row scrolls sideways
 * rather than wrapping into a block of its own.
 */
export function SectionNav({
  label,
  items,
}: {
  /** What the row is, for a screen reader: "Dele af siden". */
  label: string;
  items: Array<{ id: string; label: string }>;
}) {
  return (
    <nav aria-label={label} className="-mx-1 max-w-full overflow-x-auto">
      <ul className="border-border flex gap-1 border-b px-1">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="focus-ring text-meta hover:text-foreground hover:border-border -mb-px flex min-h-10 items-center border-b-2 border-transparent px-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms] ease-out"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
