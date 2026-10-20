import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { newsWhen } from "@/components/today/news-when";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * When a rider wrote what "Nyt fra rytterne" shows: today, yesterday, the
 * weekday within the week, and the date beyond it — by the Copenhagen
 * day, also when the moment is another day in UTC.
 */

function words(locale: "da" | "en") {
  const t = createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "today.news",
  });
  return {
    today: t("today"),
    yesterday: t("yesterday"),
    when: (day: string, clock: string) => t("when", { day, clock }),
  };
}

const TODAY = "2026-10-09";

describe("newsWhen", () => {
  it("says today and yesterday with the clock", () => {
    expect(newsWhen(new Date("2026-10-09T07:05:00Z"), TODAY, words("da"), "da")).toBe(
      "i dag 09.05",
    );
    expect(newsWhen(new Date("2026-10-08T16:40:00Z"), TODAY, words("en"), "en")).toBe(
      "yesterday 18:40",
    );
  });

  it("names the weekday within the week, and the date before it", () => {
    expect(newsWhen(new Date("2026-10-05T16:40:00Z"), TODAY, words("da"), "da")).toBe(
      "mandag 18.40",
    );
    expect(newsWhen(new Date("2026-09-30T10:00:00Z"), TODAY, words("da"), "da")).toBe(
      "30. sep. 12.00",
    );
  });

  it("goes by the Copenhagen day, not the UTC one", () => {
    // 23.30 UTC on the 8th is half past one at night on the 9th in Copenhagen.
    expect(newsWhen(new Date("2026-10-08T23:30:00Z"), TODAY, words("da"), "da")).toBe(
      "i dag 01.30",
    );
  });
});
