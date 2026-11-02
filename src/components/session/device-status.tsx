import { CalendarCheck, CalendarClock, CircleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatStamp } from "@/core/dates";
import type { SessionOnDevice } from "@/modules/devices/session-device";

/**
 * Whether the session is on the rider's Garmin calendar, and since when,
 * or why it is not (docs/adr/0114): one plain line per provider, for the
 * rider and their coaches, above the button that sends it.
 */
export async function DeviceStatus({
  items,
  own,
}: {
  items: readonly SessionOnDevice[];
  /** The reader is the rider: "din", not "rytterens". */
  own: boolean;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("session.onDevice");
  const names = await getTranslations("devices.name");
  const locale = await getLocale();
  const who = own ? "own" : "other";
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const name = names(item.provider);
        const Icon =
          item.state === "on"
            ? CalendarCheck
            : item.state === "pending"
              ? CalendarClock
              : CircleAlert;
        const text =
          item.state === "on"
            ? t("on", {
                name,
                who,
                when: item.sentAt ? formatStamp(item.sentAt, locale) : "",
                known: item.sentAt ? "yes" : "no",
              })
            : item.state === "pending"
              ? t("pending", { name, who })
              : t(`not.${item.reason}`, { name, who, max: item.max ?? 0 });
        return (
          <li
            key={item.provider}
            className={
              item.state === "not"
                ? "bg-warning-tint flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
                : "text-meta flex items-start gap-2 text-2sm leading-relaxed"
            }
          >
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {text}
          </li>
        );
      })}
    </ul>
  );
}
