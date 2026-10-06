import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge knows Tailwind's own scales; the steps globals.css names
 * (ADR 0007, 0060) are taught here, or `text-heading` beside a
 * `text-primary` reads as two colours and the size is dropped.
 * `2xs` and `2sm` already pass for T-shirt sizes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "reading",
        "heading",
        "brand",
        "title-page",
        "title-detail",
        "title-section",
        "ride-label",
        "ride-value",
        "ride-hero",
      ],
      shadow: ["surface"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
