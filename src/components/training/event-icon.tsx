import {
  CalendarDays,
  GraduationCap,
  School,
  Tent,
  Thermometer,
  TreePalm,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  race: Trophy,
  exam: GraduationCap,
  school: School,
  camp: Tent,
  holiday: TreePalm,
  ill: Thermometer,
  other: CalendarDays,
};

/** What kind of day it is, as a picture beside its word. */
export function EventIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = ICONS[kind] ?? CalendarDays;
  return <Icon aria-hidden className={cn("size-3.5 shrink-0", className)} />;
}
