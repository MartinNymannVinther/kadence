import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The AI is thinking: a sparkle and three dots that breathe one after
 * the other, beside the words the panel says ("Tænker … det kan tage
 * lidt tid."). The motion stands still for a reader who asked for less
 * (`motion-reduce`); the words carry the meaning either way, and the
 * element is a status to a screen reader. Shared by every AI panel, so
 * waiting looks the same everywhere.
 */
export function Thinking({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("text-meta flex items-center gap-2 text-2sm", className)}
    >
      <span aria-hidden className="text-primary flex items-center gap-1">
        <Sparkles className="size-4 animate-pulse motion-reduce:animate-none" />
        <span className="flex items-end gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="bg-primary size-1.5 rounded-full animate-thinking motion-reduce:animate-none"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </span>
      </span>
      <span>{children}</span>
    </p>
  );
}
