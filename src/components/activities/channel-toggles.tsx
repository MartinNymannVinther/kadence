import type { Channel } from "./streams-data";

/**
 * Which channels the curves show: one labelled checkbox per channel the
 * file recorded, a finger's height on a phone and a row's on a desk.
 */
export function ChannelToggles({
  available,
  on,
  label,
  name,
  onChange,
}: {
  available: readonly Channel[];
  on: ReadonlySet<Channel>;
  /** The group's name for a screen reader. */
  label: string;
  name: (channel: Channel) => string;
  onChange: (channel: Channel, checked: boolean) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {available.map((c) => (
        <label
          key={c}
          className="border-border bg-card has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-2sm has-focus-visible:outline-2 sm:min-h-9"
        >
          <input
            type="checkbox"
            checked={on.has(c)}
            className="accent-primary size-4"
            onChange={(e) => onChange(c, e.target.checked)}
          />
          {name(c)}
        </label>
      ))}
    </div>
  );
}
