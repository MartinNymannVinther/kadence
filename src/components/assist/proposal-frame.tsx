import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Every AI proposal in Kadence wears the same frame (dogma 5): marked as a
 * proposal, saying who read it — the rules or the model by name — and
 * that nothing happens until a person presses.
 */
export function ProposalFrame({
  title,
  engine,
  body,
  onClose,
  children,
}: {
  title: string;
  /** "rules" when the deterministic rules answered, else the model's name. */
  engine: string;
  body?: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("assist");
  return (
    <section
      aria-label={title}
      className="border-chart-2/50 bg-accent/40 flex flex-col gap-3 rounded-lg border border-dashed p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles aria-hidden className="text-primary size-4" />
            {title}
          </h3>
          <p className="text-meta text-xs leading-relaxed">{body ?? t("decide")}</p>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t("dismiss")}
          >
            <X />
          </Button>
        )}
      </div>
      {children}
      <p className="text-meta text-2xs">
        {engine === "rules"
          ? t("byRules")
          : engine === "none"
            ? t("byGuardrails")
            : t("byModel", { engine })}
      </p>
    </section>
  );
}
