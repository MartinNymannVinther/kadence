"use client";

import { Bike, ChevronDown, Download, Dumbbell, Ellipsis, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { installDcuProgrammesAction } from "@/modules/training/dcu-actions";

/**
 * The coach's corner of the library in two controls instead of four
 * buttons (docs/adr/0077): "Nyt pas" opens the three ways to a new
 * session — on the bike, in the gym, or written for the AI (ADR 0038) —
 * and the three dots hold what is done a few times a season, fetching
 * DCU's strength programmes (ADR 0014). The same addresses as before;
 * only the way to them is shorter.
 */
export function LibraryActions() {
  const t = useTranslations("library");
  const dcu = useTranslations("library.dcu");
  const router = useRouter();
  const { run, pending } = useRun();

  async function installDcu() {
    const result = await run(() => installDcuProgrammesAction({}));
    if (result)
      toast.success(dcu("done", { installed: result.installed, updated: result.updated }));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="max-sm:h-11">
              <Plus data-icon="inline-start" />
              {t("newSession")}
              <ChevronDown data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onClick={() => router.push("/library/new?sport=bike")}>
            <Bike data-slot="icon" />
            {t("newBike")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/library/new?sport=strength")}>
            <Dumbbell data-slot="icon" />
            {t("newStrength")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/library/new?ai=1")}>
            <Sparkles data-slot="icon" />
            {t("newWithAi")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={t("moreActions")}
              className="max-sm:size-11"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuItem disabled={pending} onClick={installDcu}>
            <Download data-slot="icon" />
            {dcu("install")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
