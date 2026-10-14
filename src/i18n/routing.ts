import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * `dir` is derived, never stored — a locale's direction is a property of the locale.
 * The timeline and all timecode output stay LTR regardless.
 */
export const localeDir: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  fr: "ltr",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

/** BCP-47 tags used for Intl APIs (numbering system differs per preference). */
export const localeTags: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-DZ",
  fr: "fr-FR",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
