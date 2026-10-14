"use client";

import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { usePrefs, type ThemeChoice } from "@/lib/prefs-store";
import { IconButton } from "@/components/ui/icon-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";

const ICONS: Record<ThemeChoice, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

export function ThemeToggle() {
  const theme = usePrefs((state) => state.theme);
  const set = usePrefs((state) => state.set);
  const t = useTranslations("settings");
  const Icon = ICONS[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("themeLabel")}: ${t(`theme${theme.charAt(0).toUpperCase()}${theme.slice(1)}` as "themeDark")}`}
          className="inline-flex size-9 touch:size-11 items-center justify-center rounded-md border border-border bg-raised text-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <Icon aria-hidden className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(["dark", "light", "system"] as const).map((choice) => (
          <DropdownMenuItem key={choice} selected={theme === choice} onSelect={() => set("theme", choice)}>
            {t(
              (choice === "dark" ? "themeDark" : choice === "light" ? "themeLight" : "themeSystem") as "themeDark",
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Icon button used inside the editor toolbar where space is tight. */
export function QuickThemeToggle() {
  const theme = usePrefs((state) => state.theme);
  const set = usePrefs((state) => state.set);
  const t = useTranslations("settings");
  const isDark = theme === "dark";

  return (
    <IconButton
      label={isDark ? t("themeLight") : t("themeDark")}
      tooltip={isDark ? t("themeLight") : t("themeDark")}
      onClick={() => set("theme", isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
