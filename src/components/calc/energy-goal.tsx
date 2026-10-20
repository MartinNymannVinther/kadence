import { Droplet, Drumstick, Zap } from "lucide-react";

const ICONS = { carbs: Zap, protein: Drumstick, fluid: Droplet } as const;

/** The goal for a window as pills: carbohydrate, protein, fluid. */
export function EnergyGoal({
  label,
  goals,
}: {
  label: string;
  goals: readonly { kind: keyof typeof ICONS; text: string }[];
}) {
  return (
    <div className="bg-success-tint flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-3 py-2">
      <span className="text-2sm font-semibold">{label}</span>
      {goals.map((goal) => {
        const Icon = ICONS[goal.kind];
        return (
          <span key={goal.text} className="flex items-center gap-1 text-2sm tabular-nums">
            <Icon aria-hidden className="text-success size-3.5 shrink-0" />
            {goal.text}
          </span>
        );
      })}
    </div>
  );
}
