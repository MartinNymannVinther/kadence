"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/core/dates";
import type { RequestItem } from "./access-admin";

/** The last applications the owner decided, with how and when. */
export function DecidedRequests({ requests }: { requests: RequestItem[] }) {
  const t = useTranslations("settings.access");
  const locale = useLocale();
  const formatDate = (value: Date | string) => formatDay(new Date(value), locale);
  if (requests.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {requests.map((request) => (
            <li
              key={request.id}
              className="border-border flex items-center gap-3 border-b py-2.5 text-sm first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {request.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {request.organizationName}
                  </span>
                </p>
                <p className="text-muted-foreground truncate">{request.email}</p>
              </div>
              <Badge variant="outline">
                {request.status === "approved"
                  ? t("decidedApproved", {
                      date: formatDate(request.decidedAt ?? request.createdAt),
                    })
                  : t("decidedDeclined", {
                      date: formatDate(request.decidedAt ?? request.createdAt),
                    })}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
