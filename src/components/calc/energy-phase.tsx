/**
 * One part of the day — before, on the bike, after — with its number,
 * its name and a line on what it is for, so the plan reads in the order
 * it is eaten.
 */
export function EnergyPhase({
  step,
  title,
  intro,
  children,
}: {
  step: number;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `energy-phase-${step}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        >
          {step}
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 id={id} className="text-base font-semibold">
            {title}
          </h3>
          <p className="text-reading text-2sm leading-relaxed">{intro}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
