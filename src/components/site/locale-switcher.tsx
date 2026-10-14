"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { cn } from "@/lib/cn";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const active = useLocale() as Locale;
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (locale: Locale) => {
    startTransition(() => {
      // `pathname` is locale-stripped by next-intl, so one call keeps the page.
      router.replace(pathname, { locale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("language")}: ${localeNames[active]}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-muted",
            "transition-colors hover:border-border-strong hover:text-fg",
            "min-h-9 touch:min-h-11",
            pending && "opacity-60",
          )}
        >
          <Languages aria-hidden className="size-4" />
          {compact ? (
            <span className="force-ltr text-xs font-semibold uppercase">{active}</span>
          ) : (
            <span>{localeNames[active]}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            selected={locale === active}
            onSelect={() => switchTo(locale)}
          >
            <span dir={locale === "ar" ? "rtl" : "ltr"}>{localeNames[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
