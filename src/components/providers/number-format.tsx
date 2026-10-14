"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { localeDir, localeTags, type Locale } from "@/i18n/routing";
import { usePrefs } from "@/lib/prefs-store";

type Fmt = {
  locale: Locale;
  dir: "ltr" | "rtl";
  /** Localised number string, honouring the western/arabic-indic digit setting. */
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Timecode — always LTR, always tabular, colon separated. */
  tc: (seconds: number, options?: { hours?: boolean; frames?: number }) => string;
  /** Signed delta for score badges, e.g. "+12" */
  pct: (value: number) => string;
};

const FmtContext = createContext<Fmt | null>(null);

export function NumberFormatProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as Locale;
  const digits = usePrefs((s) => s.digits);

  const value = useMemo<Fmt>(() => {
    const tag = localeTags[locale];
    const numberingSystem = digits === "arabic" && locale === "ar" ? "arab" : "latn";
    const nf = new Intl.NumberFormat(tag, { numberingSystem });

    return {
      locale,
      dir: localeDir[locale],
      n: (input, options) =>
        options ? new Intl.NumberFormat(tag, { numberingSystem, ...options }).format(input) : nf.format(input),
      tc: (seconds, options) => {
        const safe = Math.max(0, seconds);
        const whole = Math.floor(safe);
        const h = Math.floor(whole / 3600);
        const m = Math.floor((whole % 3600) / 60);
        const s = whole % 60;
        const parts = [h > 0 || options?.hours ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")];
        return parts.filter((part) => part !== null).join(":");
      },
      pct: (input) => `${input > 0 ? "+" : ""}${nf.format(Math.round(input))}`,
    };
  }, [locale, digits]);

  return <FmtContext.Provider value={value}>{children}</FmtContext.Provider>;
}

export function useFormat(): Fmt {
  const ctx = useContext(FmtContext);
  if (!ctx) throw new Error("useFormat must be used inside <NumberFormatProvider>");
  return ctx;
}
