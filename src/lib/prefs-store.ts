"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeChoice = "dark" | "light" | "system";
export type DigitStyle = "western" | "arabic";
export type AspectRatio = "9:16" | "1:1" | "16:9";
export type TranscriptLanguage = "ar" | "ar-DZ" | "fr" | "en" | "mixed";

export type PrefsState = {
  theme: ThemeChoice;
  digits: DigitStyle;
  reducedMotion: boolean | "system";
  defaultAspect: AspectRatio;
  defaultPreset: string;
  transcriptLanguage: TranscriptLanguage;
  burnCaptionsByDefault: boolean;
  autoSave: boolean;
  keepMediaLocal: true;
  hardwareAccel: boolean;
  ffmpegThreads: 2 | 4 | 8;
  quranTranslationId: number;
  quranScript: "uthmani" | "imlaei" | "indopak";
  quranReciterId: number;
  showTranslationByDefault: boolean;
  onboardedTutorial: boolean;
};

export type PrefsActions = {
  set: <K extends keyof PrefsState>(key: K, value: PrefsState[K]) => void;
  reset: () => void;
};

export const DEFAULT_PREFS: PrefsState = {
  // The studio ships light-first.
  theme: "light",
  digits: "western",
  reducedMotion: "system",
  defaultAspect: "9:16",
  defaultPreset: "dz-signature",
  transcriptLanguage: "ar-DZ",
  burnCaptionsByDefault: true,
  autoSave: true,
  keepMediaLocal: true,
  hardwareAccel: true,
  ffmpegThreads: 4,
  quranTranslationId: 131,
  quranScript: "uthmani",
  quranReciterId: 7,
  showTranslationByDefault: false,
  onboardedTutorial: false,
};

export const usePrefs = create<PrefsState & PrefsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      set: (key, value) => set({ [key]: value } as Partial<PrefsState>),
      reset: () => set({ ...DEFAULT_PREFS }),
    }),
    {
      name: "dz-prefs",
      version: 1,
      // `keepMediaLocal` is a guarantee, not a toggle — never let it be persisted as false.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<PrefsState>) };
        merged.keepMediaLocal = true;
        return merged;
      },
    },
  ),
);

/** Resolve "system" against the live OS setting. */
export function resolveTheme(choice: ThemeChoice): "dark" | "light" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Runs before paint. Kept as a string so the root layout can inline it and avoid
 * a flash of the wrong theme (or a flash of LTR in Arabic).
 */
export const themeBootScript = `(function(){try{
var el=document.documentElement;var raw=localStorage.getItem('dz-prefs');
var t='light',d='western';
if(raw){var s=JSON.parse(raw);var st=(s&&s.state)||{};if(st.theme)t=st.theme;if(st.digits)d=st.digits;}
if(t==='system'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
el.dataset.theme=t;el.dataset.digits=d;
}catch(e){document.documentElement.dataset.theme='light';}})();`;
