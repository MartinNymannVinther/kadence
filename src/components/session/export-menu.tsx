"use client";

import { ChevronDown, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FORMATS = ["zwo", "erg", "mrc", "fit"] as const;

/**
 * "Hent til træner/enhed": the session as a file for Zwift (.zwo), for a
 * trainer program (.erg in watts, .mrc in percent of FTP) or for a head
 * unit (.fit). Each is a plain download from the export route; the watts
 * come from the rider's own FTP.
 */
export function ExportMenu({ sessionId }: { sessionId: string }) {
  const t = useTranslations("session.export");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="max-sm:h-11" />}>
        <Download data-icon="inline-start" />
        {t("button")}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        {FORMATS.map((format) => (
          <DropdownMenuItem
            key={format}
            className="min-h-11 sm:min-h-9"
            render={<a href={`/api/sessions/${sessionId}/export?format=${format}`} download />}
          >
            <span className="flex flex-col">
              <span className="font-medium">{t(`${format}.label`)}</span>
              <span className="text-meta text-xs">{t(`${format}.hint`)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
