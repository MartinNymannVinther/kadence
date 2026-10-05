/**
 * One step on the day's timeline — the evening before, the hours before,
 * on the bike, after — with its time as a label, a dot on the line down
 * the left, and what to eat and drink then.
 */
export function EnergyStep({
  id,
  when,
  title,
  last = false,
  children,
}: {
  id: string;
  when: string;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid grid-cols-[1.25rem_1fr] gap-x-3 sm:gap-x-4">
      <div aria-hidden className="flex flex-col items-center">
        <span className="bg-primary ring-success-tint mt-1.5 size-3.5 shrink-0 rounded-full ring-4" />
        {!last && <span className="bg-border mt-1 w-0.5 flex-1" />}
      </div>
      <div className="flex min-w-0 flex-col gap-3 pb-8">
        <div className="flex flex-col items-start gap-1">
          <span className="bg-secondary text-label rounded-full px-2.5 py-0.5 text-xs font-medium">
            {when}
          </span>
          <h3 id={id} className="text-lg font-semibold">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </section>
  );
}
