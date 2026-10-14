import { DEFAULT_RULES } from "./captions";
import { demoTranscriptDuration, demoTranscriptWords, hasDemoTranscript } from "./demo-transcript";
import { CAPTION_PRESETS } from "./presets";
import { suggestClips } from "./suggest";
import type { Clip, Project, Word } from "./types";

/**
 * Demo content.
 *
 * The primary demo is built from `src/lib/fixtures/demo-transcript.json`: a real
 * transcription of the bundled Algerian-Arabic clip, produced by Gemini with the
 * prompt in `prompts/transcribe-captions.md`. Nothing about it is invented, so
 * the timings, the pauses and the mixed Darja/French wording are all facts about
 * the audio the user can play two panels over.
 *
 * The scripted fallback below is only used when that fixture is absent (a fresh
 * clone that has not run the transcription script), and it keeps the store shape
 * identical, so no screen has to special-case a missing demo.
 */

const SCRIPT: { text: string; pauseAfter?: number; speaker?: number }[] = [
  { text: "الحمد", speaker: 0 },
  { text: "لله،" },
  { text: "اليوم" },
  { text: "نشرحو" },
  { text: "كيفاش" },
  { text: "نقصّو" },
  { text: "فيديو" },
  { text: "بكلمة" },
  { text: "وحدة.", pauseAfter: 0.62 },
  { text: "ما" },
  { text: "تحتاجش" },
  { text: "تكون" },
  { text: "مونتير" },
  { text: "باش" },
  { text: "تخدم" },
  { text: "ريلز" },
  { text: "نضيفة.", pauseAfter: 0.55 },
  { text: "تكتب," },
  { text: "تحذف," },
  { text: "والفيديو" },
  { text: "يتقصّ" },
  { text: "وحدو.", pauseAfter: 0.5 },
  { text: "بالعربية،" },
  { text: "وبالدارجة،" },
  { text: "وبالفرنسية" },
  { text: "تاني.", pauseAfter: 0.58 },
  { text: "وكلش" },
  { text: "يصير" },
  { text: "في" },
  { text: "المتصفح،" },
  { text: "ما" },
  { text: "يطلعش" },
  { text: "حتى" },
  { text: "شيء" },
  { text: "للسيرفر.", pauseAfter: 0.6 },
  { text: "جرّب" },
  { text: "بلا" },
  { text: "حساب،" },
  { text: "وصدّر" },
  { text: "بلا" },
  { text: "ووترمارك.", pauseAfter: 0.7 },
  { text: "الجزائر" },
  { text: "تصنع" },
  { text: "محتوى" },
  { text: "يستاهل", pauseAfter: 0.0 },
  { text: "أحسن" },
  { text: "أدوات." },
];

/** Rough syllable timing: longer words take longer to say. */
function wordDuration(text: string): number {
  const clean = text.replace(/[^\p{L}]/gu, "");
  const base = 0.24 + Math.min(0.42, clean.length * 0.045);
  return Number(base.toFixed(3));
}

export function buildDemoWords(): Word[] {
  const words: Word[] = [];
  let cursor = 0.35;

  SCRIPT.forEach((entry, index) => {
    const duration = wordDuration(entry.text);
    words.push({
      id: `w${String(index).padStart(3, "0")}`,
      text: entry.text,
      start: Number(cursor.toFixed(3)),
      end: Number((cursor + duration).toFixed(3)),
      speaker: entry.speaker ?? 0,
    });
    cursor += duration + 0.07;
    if (entry.pauseAfter) cursor += entry.pauseAfter;
  });

  return words;
}

export function demoDuration(words: Word[]): number {
  const last = words[words.length - 1];
  return Number(((last?.end ?? 0) + 1.6).toFixed(2));
}

export function buildDemoClips(duration: number): Clip[] {
  return [
    {
      id: "c1",
      order: 0,
      sourceIn: 0,
      sourceOut: Number((duration * 0.62).toFixed(2)),
      label: "Opening",
    },
    {
      id: "c2",
      order: 1,
      sourceIn: Number((duration * 0.68).toFixed(2)),
      sourceOut: duration,
      label: "Close",
    },
  ];
}

export type DemoChapter = {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string;
  ayahs: { ayah: number; uthmani: string; translation: string }[];
};

/** Placeholder project so the store always has a well-formed shape to render. */
export function createEmptyProject(id = "new-project", name = ""): Project {
  const now = Date.now();
  return {
    id,
    name,
    mode: "auto",
    status: "draft",
    aspect: "9:16",
    language: "ar-DZ",
    createdAt: now,
    updatedAt: now,
    durationSec: 0,
    words: [],
    clips: [{ id: "c1", order: 0, sourceIn: 0, sourceOut: 0, label: "Clip 1" }],
    presetId: CAPTION_PRESETS[0]!.id,
    rules: { ...DEFAULT_RULES },
    background: {
      kind: "none",
      color: "#0B0F14",
      gradientFrom: "#12241C",
      gradientTo: "#0B0F14",
      blur: 18,
      footerBar: false,
      footerHeight: 22,
      watermark: false,
      watermarkText: "",
      watermarkOpacity: 0.72,
    },
    suggestions: [],
    quran: [],
    hasMedia: false,
  };
}

export function createDemoProject(options?: { id?: string; mode?: Project["mode"] }): Project {
  // Real transcript when we have it, scripted fallback when we do not.
  const real = hasDemoTranscript();
  const words = real ? demoTranscriptWords() : buildDemoWords();
  const duration = real ? demoTranscriptDuration(words) : demoDuration(words);
  const now = Date.now();

  return {
    id: options?.id ?? "demo-darja-reel",
    name: "Fayçal from Oran — Darja interview",
    mode: options?.mode ?? "hybrid",
    status: "review",
    aspect: "9:16",
    language: "ar-DZ",
    createdAt: now - 1000 * 60 * 60 * 26,
    updatedAt: now - 1000 * 60 * 12,
    durationSec: duration,
    words,
    clips: buildDemoClips(duration),
    presetId: CAPTION_PRESETS[0]!.id,
    rules: { ...DEFAULT_RULES },
    background: {
      kind: "blur",
      color: "#0B0F14",
      gradientFrom: "#12241C",
      gradientTo: "#0B0F14",
      blur: 18,
      footerBar: false,
      footerHeight: 22,
      watermark: true,
      watermarkText: "@dz.studio",
      watermarkOpacity: 0.72,
    },
    suggestions: suggestClips(words),
    quran: [],
    hasMedia: false,
    sourceName: "wikitongues-faycal-darja.webm",
  };
}

/** A second, shorter project so the dashboard grid has real density. */
export function createSecondDemoProject(): Project {
  const base = createDemoProject({ id: "demo-podcast-clip", mode: "manual" });
  // A real 30-second excerpt of the same recording, re-based to zero.
  const from = Math.min(40, Math.max(0, base.words.length - 60));
  const excerpt = base.words.slice(from, from + 60);
  const words = excerpt.map((word, index) => ({
    ...word,
    id: `p${index}`,
    start: Number((word.start - (excerpt[0]?.start ?? 0)).toFixed(3)),
    end: Number((word.end - (excerpt[0]?.start ?? 0)).toFixed(3)),
  }));
  const duration = Number((demoDuration(words) - 1.6 + 0.8).toFixed(2));
  const now = Date.now();

  return {
    ...base,
    id: "demo-podcast-clip",
    name: "Podcast — privacy and local editing",
    mode: "manual",
    status: "exported",
    aspect: "1:1",
    language: "mixed",
    words,
    clips: [{ id: "c1", order: 0, sourceIn: 0, sourceOut: duration, label: "Take 2" }],
    suggestions: suggestClips(words).slice(0, 3),
    durationSec: duration,
    createdAt: now - 1000 * 60 * 60 * 96,
    updatedAt: now - 1000 * 60 * 60 * 40,
    lastExportAt: now - 1000 * 60 * 60 * 39,
    sourceName: "podcast-ep-04-mix.wav",
  };
}
