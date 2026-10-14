import type { CaptionPreset, ExportSettings, ProjectMode } from "./types";

/**
 * Presets are the product's opinion about what looks good. The "signature"
 * preset is the one we would ship a client's reel with: Cairo at a weight that
 * survives compression, emerald highlight, no outline noise.
 */
export const CAPTION_PRESETS: CaptionPreset[] = [
  {
    id: "dz-signature",
    name: "DZ Signature",
    fontId: "cairo",
    size: 62,
    weight: 800,
    color: "#FFFFFF",
    highlightColor: "#19C37D",
    highlightActiveWord: true,
    emphasisScale: 1.06,
    outlineWidth: 2,
    shadow: true,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.32,
    maxWidth: 82,
    padding: 14,
    radius: 14,
    background: "solid",
    backgroundOpacity: 0.34,
    position: "bottom",
    offsetY: 0.02,
    alignment: "center",
  },
  {
    id: "bold-hook",
    name: "Bold hook",
    fontId: "cairo",
    size: 78,
    weight: 900,
    color: "#FFFFFF",
    highlightColor: "#E8B04B",
    highlightActiveWord: false,
    emphasisScale: 1,
    outlineWidth: 4,
    shadow: true,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.22,
    maxWidth: 88,
    padding: 10,
    radius: 10,
    background: "none",
    backgroundOpacity: 0,
    position: "middle",
    offsetY: 0,
    alignment: "center",
  },
  {
    id: "minimal",
    name: "Minimal",
    fontId: "inter",
    size: 46,
    weight: 600,
    color: "#E8EDF4",
    highlightColor: "#19C37D",
    highlightActiveWord: false,
    emphasisScale: 1,
    outlineWidth: 0,
    shadow: false,
    uppercase: false,
    letterSpacing: 0.01,
    lineHeight: 1.4,
    maxWidth: 74,
    padding: 12,
    radius: 8,
    background: "solid",
    backgroundOpacity: 0.62,
    position: "bottom",
    offsetY: 0.06,
    alignment: "start",
  },
  {
    id: "karaoke",
    name: "Karaoke highlight",
    fontId: "cairo",
    size: 58,
    weight: 700,
    color: "#8B97A8",
    highlightColor: "#FFFFFF",
    highlightActiveWord: true,
    emphasisScale: 1.12,
    outlineWidth: 2,
    shadow: true,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.34,
    maxWidth: 84,
    padding: 16,
    radius: 18,
    background: "solid",
    backgroundOpacity: 0.5,
    position: "bottom",
    offsetY: 0.04,
    alignment: "center",
  },
  {
    id: "tilawa-gold",
    name: "Tilawa (Uthmani)",
    fontId: "amiri-quran",
    size: 54,
    weight: 400,
    color: "#FFFFFF",
    highlightColor: "#E8B04B",
    highlightActiveWord: true,
    emphasisScale: 1.03,
    outlineWidth: 2,
    shadow: true,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.9,
    maxWidth: 88,
    padding: 18,
    radius: 16,
    background: "solid",
    backgroundOpacity: 0.42,
    position: "bottom",
    offsetY: 0.05,
    alignment: "center",
    lineHeightBonus: 0.35,
    quranOnly: true,
  },
];

export function presetById(id: string): CaptionPreset {
  return CAPTION_PRESETS.find((preset) => preset.id === id) ?? CAPTION_PRESETS[0]!;
}

/**
 * Presets visible in the given editor. The Tilawa/Uthmani look is scripture
 * styling — it only exists in Quran Mode, never in the normal studio.
 */
export function presetsForMode(
  mode: ProjectMode | "normal",
): CaptionPreset[] {
  const isQuran = mode === "quran";
  return isQuran ? CAPTION_PRESETS : CAPTION_PRESETS.filter((preset) => !preset.quranOnly);
}

/** Resolves a project's preset plus its per-project overrides. */
export function resolvePreset(id: string, overrides?: Partial<CaptionPreset>): CaptionPreset {
  return { ...presetById(id), ...overrides };
}

export const DEFAULT_EXPORT: ExportSettings = {
  format: "mp4",
  resolution: "original",
  burnCaptions: true,
  sidecar: "srt",
  quality: "high",
  fps: "source",
  filename: "dz-studio-export",
};

export const TEMPLATES = [
  {
    id: "reel-darja",
    nameKey: "templateReel",
    descKey: "templateReelDesc",
    presetId: "dz-signature",
    aspect: "9:16" as const,
    accent: "primary" as const,
  },
  {
    id: "podcast-clip",
    nameKey: "templatePodcast",
    descKey: "templatePodcastDesc",
    presetId: "minimal",
    aspect: "1:1" as const,
    accent: "info" as const,
  },
  {
    id: "tilawa",
    nameKey: "templateTilawa",
    descKey: "templateTilawaDesc",
    presetId: "tilawa-gold",
    aspect: "9:16" as const,
    accent: "gold" as const,
  },
  {
    id: "lesson",
    nameKey: "templateLesson",
    descKey: "templateLessonDesc",
    presetId: "bold-hook",
    aspect: "16:9" as const,
    accent: "primary" as const,
  },
];
