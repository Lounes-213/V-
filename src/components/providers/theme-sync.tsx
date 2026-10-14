"use client";

import { useEffect } from "react";
import { resolveTheme, usePrefs } from "@/lib/prefs-store";

/**
 * Mirrors persisted preferences onto `<html>`: theme, digit style and a
 * manual reduced-motion override. The boot script already painted the first
 * frame; this keeps it in sync afterwards (system changes included).
 */
export function ThemeSync() {
  const theme = usePrefs((s) => s.theme);
  const digits = usePrefs((s) => s.digits);
  const reducedMotion = usePrefs((s) => s.reducedMotion);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = resolveTheme(theme);
    };
    apply();

    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.digits = digits;
  }, [digits]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion === "system") delete root.dataset.reducedMotion;
    else root.dataset.reducedMotion = reducedMotion ? "true" : "false";
  }, [reducedMotion]);

  return null;
}
