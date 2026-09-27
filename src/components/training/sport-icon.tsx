import { Bike, Dumbbell, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

/** The sport as a picture: a bike, a dumbbell, or feet for everything else. */
export function SportIcon({ sport, className }: { sport: string; className?: string }) {
  const Icon = sport === "bike" ? Bike : sport === "strength" ? Dumbbell : Footprints;
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} />;
}
