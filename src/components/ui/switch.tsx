import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * An on/off choice, as a real checkbox with the switch role: it works with
 * a keyboard, a screen reader and a thumb, and says its state in words
 * through the label beside it, never by its colour alone.
 */
function Switch({ className, ...props }: Omit<React.ComponentProps<"input">, "type" | "role">) {
  return (
    <input
      type="checkbox"
      role="switch"
      data-slot="switch"
      className={cn(
        "bg-input checked:bg-primary focus-visible:outline-ring relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full transition-colors duration-[120ms] ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
        "before:bg-card before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:shadow-[var(--surface-shadow)] before:transition-transform before:duration-[120ms] checked:before:translate-x-5",
        className,
      )}
      {...props}
    />
  );
}

export { Switch };
