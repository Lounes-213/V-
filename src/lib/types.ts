import type { AspectRatio, TranscriptLanguage } from "./prefs-store";

export type ProjectMode = "auto" | "manual" | "hybrid" | "quran";
export type ProjectStatus = "draft" | "transcribing" | "review" | "exported";

/**
 * CapCut-style basic transform for one clip: scale, position, rotation, flips.
 * Percentages are relative to the *frame*, so a 9:16 and a 16:9 project move by
 * the same visual amount.
 */
export type VideoTransform = {
  /** 1 = fills the frame. */
  scale: number;
  /** Offset as a percent of frame width/height, −100…100. */
  x: number;
  y: number;
  /** Degrees, −180…180. */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
};

export const DEFAULT_VIDEO_TRANSFORM: VideoTransform = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
};

/** Fills in whatever a stored (possibly partial or legacy) transform lacks. */
export function resolveTransform(value?: Partial<VideoTransform> | null): VideoTransform {
  if (!value) return DEFAULT_VIDEO_TRANSFORM;
  return {
    scale: Number.isFinite(value.scale) ? (value.scale as number) : 1,
    x: Number.isFinite(value.x) ? (value.x as number) : 0,
    y: Number.isFinite(value.y) ? (value.y as number) : 0,
    rotation: Number.isFinite(value.rotation) ? (value.rotation as number) : 0,
    flipH: value.flipH === true,
    flipV: value.flipV === true,
  };
}

/** True when every field sits at its default — used to skip needless work. */
export function isDefaultTransform(value: VideoTransform): boolean {
  return (
    value.scale === 1 &&
    value.x === 0 &&
    value.y === 0 &&
    value.rotation === 0 &&
    !value.flipH &&
    !value.flipV
  );
}

/** A contiguous slice of the source media that survives in the output. */
export type Clip = {
  id: string;
  /** Playback order in the output. */
  order: number;
  /** In/out points on the *source* timeline, in seconds. */
  sourceIn: number;
  sourceOut: number;
  label: string;
  muted?: boolean;
  transform?: VideoTransform;
};

export type Word = {
  id: string;
  text: string;
  /** Source-timeline seconds. */
  start: number;
  end: number;
  /** Set when the word was cut from the output. */
  deleted?: boolean;
  /** Speaker index for multi-speaker transcripts. */
  speaker?: number;
  /** Matched Quran verse, when the project is in Quran Mode. */
  ayahRef?: string;
  confidence?: number;
};

export type CaptionPreset = {
  id: string;
  name: string;
  fontId: string;
  size: number;
  weight: number;
  color: string;
  highlightColor: string;
  highlightActiveWord: boolean;
  emphasisScale: number;
  outlineWidth: number;
  shadow: boolean;
  uppercase: boolean;
  letterSpacing: number;
  lineHeight: number;
  maxWidth: number;
  padding: number;
  radius: number;
  background: "none" | "solid" | "blur";
  backgroundOpacity: number;
  position: "top" | "middle" | "bottom";
  /** Vertical offset as a fraction of frame height, 0 = centred band. */
  offsetY: number;
  alignment: "start" | "center" | "end";
  lineHeightBonus?: number;
  /** Scripture styling (Uthmani/mushaf) — offered only in Quran Mode editors. */
  quranOnly?: boolean;
};

export type CaptionRules = {
  maxWordsPerLine: number;
  maxLines: number;
  minDurationMs: number;
  maxDurationMs: number;
  autoSplit: boolean;
  removeFillers: boolean;
  respectPauses: boolean;
  punctuation: boolean;
  capitalize: boolean;
  /** "sentence": shows natural breath phrase. "word": shows word-by-word dynamic pop. */
  displayMode?: "sentence" | "word";
};

export type BackgroundStyle = {
  kind: "none" | "blur" | "solid" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  blur: number;
  imageName?: string;
  footerBar: boolean;
  footerHeight: number;
  watermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
};

export type Suggestion = {
  id: string;
  title: string;
  /** Source-timeline range of the proposed cut. */
  start: number;
  end: number;
  hookScore: number;
  clarityScore: number;
  reason: string;
  draftScript: string;
  status: "new" | "accepted" | "edited" | "dismissed";
  wordIds: string[];
  /** Machine-readable reasons behind the scores, for localised UI copy. */
  factors?: string[];
};

export type QuranMatch = {
  id: string;
  surah: number;
  surahName: string;
  ayah: number;
  /** Uthmani script, exactly as returned by the canonical source. */
  uthmani: string;
  translation?: string;
  transliteration?: string;
  /** 0–1 similarity between the recitation and the canonical text. */
  confidence: number;
  start: number;
  end: number;
  reviewed: boolean;
  correctedAyah?: number;
  /** True when the canonical text came from the network rather than cache. */
  fromCache?: boolean;
};

export type ExportSettings = {
  format: "mp4" | "webm" | "m4a";
  resolution: "original" | "720";
  burnCaptions: boolean;
  sidecar: "none" | "srt" | "vtt";
  quality: "high" | "balanced" | "small";
  fps: "source" | 30 | 60;
  filename: string;
};

export type Project = {
  id: string;
  name: string;
  mode: ProjectMode;
  status: ProjectStatus;
  aspect: AspectRatio;
  language: TranscriptLanguage;
  createdAt: number;
  updatedAt: number;
  durationSec: number;
  words: Word[];
  clips: Clip[];
  presetId: string;
  captionOverrides?: Partial<CaptionPreset>;
  rules: CaptionRules;
  background: BackgroundStyle;
  suggestions: Suggestion[];
  quran: QuranMatch[];
  hasMedia: boolean;
  lastExportAt?: number;
  sourceName?: string;
};

export type MediaHandle = {
  projectId: string;
  name: string;
  type: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
  /** OPFS path or blob URL, resolved at read time. */
  opfsPath?: string;
  posterDataUrl?: string;
  peaks?: Float32Array;
};
