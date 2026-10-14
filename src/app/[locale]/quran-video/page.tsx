"use client";

import * as React from "react";
import { analyzeSound, speechRanges, type SoundAnalysis } from "@/lib/audio/voice-activity";
import { alignWordsAcoustically, computeTajweedWordWeight } from "@/lib/audio/tajweed-aligner";
import { ALL_SURAHS } from "@/lib/quran/surahs-data";

/* -------------------------------------------------- MONOLINE SVG ICONS */

function IconPlay({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M7 4.5V19.5L19 12L7 4.5Z" />
    </svg>
  );
}

function IconPause({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M6 5H10V19H6V5ZM14 5H18V19H14V5Z" />
    </svg>
  );
}

function IconRotateCcw({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function IconVolume({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function IconVolumeMute({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconDesign({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconCanvas({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function IconSparkles({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    </svg>
  );
}

function IconExport({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconChevronRight({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconSliders({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconQuran({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconX({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSettings({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconChevronDown({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ types */

type DetectionResult = {
  surah: number;
  ayah: number;
  fromAyah: number;
  toAyah: number;
  isPartial: boolean;
  surahName: string;
  surahNameSimple: string;
  uthmani: string;
  translation: string;
  ayahs: { ayah: number; text: string; translation: string; isPartial?: boolean }[];
  words: { text: string; ayah?: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[];
  durationSec: number;
  audioUrl: string;
  confidence: number;
};

type ReciterInfo = {
  id: number;
  name: string;
  en: string;
  folder: string;
};

/* Web Speech is not part of lib.dom and only Chromium ships it, so it stays an
   optional progressive enhancement — typed to exactly the shape we use. */
type SpeechAlternative = { transcript?: string };
type SpeechResult = { [index: number]: SpeechAlternative | undefined; isFinal?: boolean };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function browserSpeechRecognition(): SpeechRecognitionCtor | null {
  const holder = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return holder.SpeechRecognition ?? holder.webkitSpeechRecognition ?? null;
}

const RECITERS: ReciterInfo[] = [
  { id: 7, name: "مشاري راشد العفاسي", en: "Mishary Rashid Alafasy", folder: "Alafasy_128kbps" },
  { id: 1, name: "عبد الباسط عبد الصمد (مرتل)", en: "AbdulBaset Murattal", folder: "Abdul_Basit_Murattal_192kbps" },
  { id: 2, name: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary", folder: "Husary_128kbps" },
  { id: 3, name: "ماهر المعيقلي", en: "Maher Al-Muaiqly", folder: "MaherAlMuaiqly128kbps" },
  { id: 4, name: "سعد الغامدي", en: "Saad Al-Ghamdi", folder: "Ghamadi_40kbps" },
  { id: 5, name: "أبو بكر الشاطري", en: "Abu Bakr Al-Shatri", folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
];

type WordMode = "one_by_one" | "two_by_two" | "phrase" | "full_ayah";

type AnimationType =
  | "typewriter"
  | "pop_bounce"
  | "glow_pulse"
  | "fade_slide_up"
  | "cinematic_zoom"
  | "shimmer_gold"
  | "flip_reveal";

type CursorStyle = "golden_dot" | "sparkle_star" | "pulsing_ring" | "none";
type FontFamily = "uthmani" | "amiri" | "cairo";
type Riwayah = "hafs" | "warsh";
type AnimationSpeed = "fast" | "normal" | "smooth";
type VerseScope = "canonical_complete" | "recited_flow";

type BoxStyle = "glass" | "gold_frame" | "dark_cinematic" | "none";

type BgPreset =
  | "mosque_night"
  | "golden_emerald"
  | "space_stars"
  | "dark_onyx"
  | "spiritual_emerald"
  | "midnight_blue";

type Customization = {
  riwayah: Riwayah;
  displayScope: VerseScope; // "canonical_complete" (ayat compli) or "recited_flow"
  wordMode: WordMode;
  wordAnimation: AnimationType;
  cursorStyle: CursorStyle;
  fontFamily: FontFamily;
  animationSpeed: AnimationSpeed;
  showRepetitionBadge: boolean;
  holdMaddVowels: boolean;
  wordsPerStanza: number;
  hideOnSilence: boolean;
  wordPosY: number; // 20 to 80 (percentage from top, default 50)
  boxStyle: BoxStyle;
  boxWidthRatio: number; // 0.50 to 0.95 (default 0.84)
  boxPaddingY: number; // 20 to 80 (default 36)
  boxOpacity: number; // 0.0 to 1.0 (default 0.75)
  boxBorderRadius: number; // 8 to 36 (default 22)
  syncOffsetSec: number; // -1.0 to +1.0 (timing nudge)
  bgType: "preset_image" | "preset_gradient" | "stars" | "custom_image" | "custom_video" | "uploaded_video" | "custom_color";
  bgPreset: BgPreset;
  customImage: string | null;
  customVideo: string | null;
  customColor1: string;
  customColor2: string;
  selectedAudioSource: "original" | number;
  fontSize: number;
  glowColor: string;
  showTranslation: boolean;
  showAyahInfo: boolean;
  showWaveform: boolean;
  showBismillah: boolean;
  aspect: AspectKey;
};

type SyncedData = {
  words: { text: string; ayah?: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[];
  speechRuns: { start: number; end: number }[];
  duration: number;
  analysis: SoundAnalysis | null;
  audioBuffer: AudioBuffer | null;
  audioUrl: string;
};

type Stage =
  | "idle"
  | "recording"
  | "processing"
  | "detected"
  | "exporting"
  | "exported"
  | "error";

/* ---------------------------------------------------------------- helpers */

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getReciterAudioUrl(surah: number, ayah: number, reciterId: number): string {
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0]!;
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.folder}/${s}${a}.mp3`;
}

// Procedural stars data
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: ((i * 137.5) % 1000) / 1000,
  y: ((i * 269.3) % 1000) / 1000,
  r: 1 + ((i * 37) % 3) * 0.8,
  speed: 0.6 + ((i * 19) % 15) / 10,
  phase: (i * 1.7) % (Math.PI * 2),
}));

/** 16-bit mono WAV encoder for buffers we assemble in the browser. */
function encodeWavMono(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const arrayBuffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(arrayBuffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Fetches canonical word-by-word forced alignment timestamps from the Quran.com segments API
 * and aligns words to exact milliseconds, including real Tajweed Madd (2-6 harakat) and pauses.
 */
async function fetchReciterWordSegments(
  surah: number,
  fromAyah: number,
  toAyah: number,
  reciterId: number,
  spans: { ayah: number; start: number; duration: number }[],
  piecesWithAyah: { text: string; ayah: number }[],
): Promise<{ text: string; ayah: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[]> {
  try {
    const res = await fetch(
      `/api/quran?action=reciter_segments&surah=${surah}&from=${fromAyah}&to=${toAyah}&reciter=${reciterId}`,
    );
    if (res.ok) {
      const data = await res.json();
      const timestamps = (data.timestamps || []) as {
        ayah: number;
        segments: [number, number, number][];
      }[];
      if (timestamps.length > 0) {
        const words: { text: string; ayah: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[] = [];
        for (const span of spans) {
          const ayahWords = piecesWithAyah.filter((p) => p.ayah === span.ayah);
          const tMatch = timestamps.find((t) => t.ayah === span.ayah);
          if (tMatch && tMatch.segments && tMatch.segments.length > 0) {
            const firstSegStart = tMatch.segments[0]![1];
            ayahWords.forEach((item, idx) => {
              const seg = tMatch.segments[idx];
              const isLast = idx === ayahWords.length - 1;
              const tajweed = computeTajweedWordWeight(item.text, isLast);
              if (seg) {
                const s = Number((span.start + (seg[1] - firstSegStart) / 1000).toFixed(3));
                const e = Number((span.start + (seg[2] - firstSegStart) / 1000).toFixed(3));
                words.push({
                  text: item.text,
                  ayah: item.ayah,
                  start: s,
                  end: Math.max(s + 0.15, e),
                  hasMadd: tajweed.hasMadd,
                  maddHarakat: tajweed.maddHarakat,
                });
              } else {
                const s = Number((span.start + (idx / Math.max(1, ayahWords.length)) * span.duration).toFixed(3));
                const e = Number((span.start + ((idx + 1) / Math.max(1, ayahWords.length)) * span.duration).toFixed(3));
                words.push({
                  text: item.text,
                  ayah: item.ayah,
                  start: s,
                  end: e,
                  hasMadd: tajweed.hasMadd,
                  maddHarakat: tajweed.maddHarakat,
                });
              }
            });
          } else {
            const aligned = alignWordsAcoustically({
              words: ayahWords,
              speechRuns: [{ start: span.start, end: span.start + span.duration }],
              durationSec: span.start + span.duration,
            });
            words.push(...aligned.map((a) => ({ ...a, ayah: span.ayah })));
          }
        }
        if (words.length > 0) return words;
      }
    }
  } catch (err) {
    console.warn("Reciter segment fetch warning:", err);
  }

  // Pure Tajweed acoustic fallback
  const fallbackWords: { text: string; ayah: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[] = [];
  for (const span of spans) {
    const ayahWords = piecesWithAyah.filter((p) => p.ayah === span.ayah);
    const aligned = alignWordsAcoustically({
      words: ayahWords,
      speechRuns: [{ start: span.start, end: span.start + span.duration }],
      durationSec: span.start + span.duration,
    });
    fallbackWords.push(...aligned.map((a) => ({ ...a, ayah: span.ayah })));
  }
  return fallbackWords;
}

/**
 * Extracts a lightweight 16kHz mono WAV snippet (up to 300 seconds / 5 minutes) from any audio or video file.
 * This guarantees ultra-fast upload and instant AI processing on both mobile and desktop.
 */
async function extractLightweightAudio(blobOrFile: Blob, maxAiSeconds = 300): Promise<{ blob: Blob; duration: number }> {
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const tempCtx = new AudioCtxClass();
    const arrayBuf = await blobOrFile.arrayBuffer();
    const decoded = await tempCtx.decodeAudioData(arrayBuf);
    tempCtx.close();

    const fullDuration = decoded.duration;
    // For AI passage detection, up to 300s (5 minutes) captures full surahs and long passages without truncating ayahs
    const snippetDuration = Math.min(fullDuration, maxAiSeconds);
    const targetSampleRate = 16000;
    const targetLength = Math.max(1, Math.floor(snippetDuration * targetSampleRate));

    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const pcmData = rendered.getChannelData(0);

    // Fast 16-bit PCM WAV encoding
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, pcmData.length * 2, true);

    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]!));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    const wavBlob = new Blob([view], { type: "audio/wav" });
    return { blob: wavBlob, duration: fullDuration };
  } catch (err) {
    console.warn("Audio extraction fallback to raw blob:", err);
    return { blob: blobOrFile, duration: 15 };
  }
}

/* --------------------------------------------------------------- aspect */

/**
 * Output geometry. The canvas is authored at full export resolution, so the
 * aspect a creator picks is the aspect they get — the preview and the export
 * both read from here, and the renderer already works off `canvas.width/height`.
 */
const ASPECTS = {
  "9:16": { w: 1080, h: 1920, label: "ريلز / تيك توك" },
  "1:1": { w: 1080, h: 1080, label: "مربع إنستغرام" },
  "16:9": { w: 1920, h: 1080, label: "يوتيوب" },
} as const;

type AspectKey = keyof typeof ASPECTS;

/* ============================================================= MAIN PAGE */

export default function QuranVideoPage() {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DetectionResult | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [recordingSec, setRecordingSec] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Quick edit/correction for Ayah
  const [showEditAyahModal, setShowEditAyahModal] = React.useState(false);
  const [editSurah, setEditSurah] = React.useState<number>(1);
  const [editFromAyah, setEditFromAyah] = React.useState<number>(1);
  const [editToAyah, setEditToAyah] = React.useState<number>(7);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [searchResults, setSearchResults] = React.useState<{ id: string; surah: number; ayah: number; surahNameArabic: string; uthmani: string }[]>([]);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);

  // Standalone app states
  const [showSplash, setShowSplash] = React.useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = React.useState<boolean>(false);
  const [exportQuality, setExportQuality] = React.useState<"1080p" | "720p">("1080p");
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(true);
  const [onboardingAudioSource, setOnboardingAudioSource] = React.useState<"instant" | "upload" | "record">("instant");
  const [onboardingVerses, setOnboardingVerses] = React.useState<{ ayah: number; uthmani: string }[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState<boolean>(false);

  // Splash auto-dismiss timer
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  // Original uploaded media
  const [originalAudioBlob, setOriginalAudioBlob] = React.useState<Blob | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = React.useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = React.useState<string | null>(null);

  // Synced audio & VAD state
  const [syncedData, setSyncedData] = React.useState<SyncedData | null>(null);

  // Interactive Live Preview state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);

  // Final exported video
  const [exportedVideoUrl, setExportedVideoUrl] = React.useState<string | null>(null);
  const [exportProgress, setExportProgress] = React.useState(0);

  // Customization
  const [customization, setCustomization] = React.useState<Customization>({
    riwayah: "hafs",
    displayScope: "canonical_complete",
    wordMode: "phrase",
    wordAnimation: "typewriter",
    cursorStyle: "golden_dot",
    fontFamily: "uthmani",
    animationSpeed: "normal",
    showRepetitionBadge: true,
    holdMaddVowels: true,
    wordsPerStanza: 7,
    hideOnSilence: false,
    wordPosY: 52, // Center
    boxStyle: "glass",
    boxWidthRatio: 0.84,
    boxPaddingY: 34,
    boxOpacity: 0.72,
    boxBorderRadius: 22,
    syncOffsetSec: 0,
    bgType: "preset_image",
    bgPreset: "mosque_night",
    customImage: null,
    customVideo: null,
    customColor1: "#070B18",
    customColor2: "#141E33",
    selectedAudioSource: "original",
    fontSize: 64,
    glowColor: "rgba(235, 185, 75, 0.95)",
    showTranslation: false,
    showAyahInfo: true,
    showWaveform: true,
    showBismillah: true,
    aspect: "9:16",
  });

  // Pre-fetch live Uthmani verses preview for selected range & Riwayah
  React.useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(
          `/api/quran?action=surah_verses&surah=${editSurah}&from=${editFromAyah}&to=${editToAyah}&riwayah=${customization.riwayah}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setOnboardingVerses(data.verses || []);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };
    const timer = setTimeout(fetchPreview, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [editSurah, editFromAyah, editToAyah, customization.riwayah]);

  const [designerTab, setDesignerTab] = React.useState<"quran" | "cadre" | "style" | "scene">("quran");
  const [isDraggingCadre, setIsDraggingCadre] = React.useState(false);

  const loopRangeRef = React.useRef<{ start: number; end: number } | null>(null);

  // Refs
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const recordTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecRef = React.useRef<{ stop: () => void } | null>(null);
  const transcribedWordsRef = React.useRef<string>("");

  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Cached assets
  const mosqueImgRef = React.useRef<HTMLImageElement | null>(null);
  const goldenImgRef = React.useRef<HTMLImageElement | null>(null);
  const customImgRef = React.useRef<HTMLImageElement | null>(null);
  /** Blob URL of the stitched reciter track, so it can be revoked on change. */
  const reciterTrackUrlRef = React.useRef<string | null>(null);
  const customVideoElRef = React.useRef<HTMLVideoElement | null>(null);
  const uploadedVideoElRef = React.useRef<HTMLVideoElement | null>(null);

  /* Pre-load background images */
  React.useEffect(() => {
    const img1 = new Image();
    img1.src = "/backgrounds/mosque-night.jpg";
    img1.onload = () => { mosqueImgRef.current = img1; };

    const img2 = new Image();
    img2.src = "/backgrounds/golden-emerald.jpg";
    img2.onload = () => { goldenImgRef.current = img2; };
  }, []);

  /* Cleanup URLs and timers */
  React.useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
      if (uploadedVideoUrl) URL.revokeObjectURL(uploadedVideoUrl);
      if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
    };
  }, [originalAudioUrl, uploadedVideoUrl, exportedVideoUrl]);

  /* --------------------------------------------------------- RECORDING */

  const startRecording = async () => {
    setError(null);
    setResult(null);
    setExportedVideoUrl(null);
    setProgress(0);
    setRecordingSec(0);
    chunksRef.current = [];
    transcribedWordsRef.current = "";

    try {
      // Start client-side Web Speech recognition in parallel (Arabic)
      const SpeechRecClass = typeof window !== "undefined" ? browserSpeechRecognition() : null;

      if (SpeechRecClass) {
        try {
          const rec = new SpeechRecClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "ar-SA";
          rec.onresult = (evt: SpeechRecognitionEventLike) => {
            let fullText = "";
            for (let i = 0; i < evt.results.length; i++) {
              fullText += " " + (evt.results[i]?.[0]?.transcript || "");
            }
            transcribedWordsRef.current = fullText.trim();
          };
          rec.onerror = () => {};
          rec.start();
          speechRecRef.current = rec;
        } catch {
          /* optional progressive enhancement */
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (speechRecRef.current) {
          try { speechRecRef.current.stop(); } catch {}
          speechRecRef.current = null;
        }

        const rawBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(rawBlob);
        setOriginalAudioBlob(rawBlob);
        setOriginalAudioUrl(url);

        const recognizedText = transcribedWordsRef.current;
        setStatusMessage("استخراج ومعالجة الصوت...");
        const { blob: lightBlob, duration } = await extractLightweightAudio(rawBlob, 300);
        handleAudioBlob(lightBlob, duration || recordingSec || 10, url, rawBlob, recognizedText);
      };

      recorder.start(250);
      setStage("recording");

      recordTimerRef.current = setInterval(() => {
        setRecordingSec((s) => s + 1);
      }, 1000);
    } catch (err) {
      setError("لم يتم السماح بالوصول إلى الميكروفون. " + String(err));
      setStage("error");
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch {}
    }
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    setStage("processing");
  };

  /* --------------------------------------------------------- FILE UPLOAD */

  const handleFileUpload = async (file: File) => {
    setError(null);
    setResult(null);
    setExportedVideoUrl(null);
    setProgress(10);
    setStage("processing");
    setStatusMessage("استخراج ومعالجة الصوت فائق السرعة...");

    const isVideo = file.type.startsWith("video/");
    const url = URL.createObjectURL(file);

    if (isVideo) {
      setUploadedVideoUrl(url);
      setCustomization((prev) => ({
        ...prev,
        bgType: "uploaded_video",
      }));
    }

    setOriginalAudioBlob(file);
    setOriginalAudioUrl(url);

    // Extract lightweight WAV for flash-speed AI detection while preserving full file duration (up to 5 minutes)
    const { blob: lightBlob, duration } = await extractLightweightAudio(file, 300);
    handleAudioBlob(lightBlob, duration, url, file, "");
  };

  /* --------------------------------------------------------- FAST AUDIO DETECT */

  const handleAudioBlob = async (
    aiBlob: Blob,
    durationSec: number,
    localAudioUrl: string,
    fullBlobForVad?: Blob | null,
    clientTranscribedText?: string,
  ) => {
    setStage("processing");
    setProgress(30);
    setStatusMessage("التعرف على السورة والآيات الكريمة ومطابقتها...");

    try {
      const form = new FormData();
      form.set("consent", "true");
      form.set("file", aiBlob, "recitation.wav");
      form.set("durationSec", String(durationSec));
      if (clientTranscribedText) {
        form.set("transcribedText", clientTranscribedText);
      }

      setProgress(60);
      const res = await fetch("/api/quran/detect-audio", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Unknown" }))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      setProgress(85);
      setStatusMessage("تحديد توقيتات الكلمات ومخارج الحروف مع الصوت...");

      const rawData = await res.json();
      const surahMeta = ALL_SURAHS.find((s) => s.number === rawData.surah) || ALL_SURAHS[0]!;
      const data: DetectionResult = {
        ...rawData,
        ayah: rawData.ayah || rawData.fromAyah || 1,
        fromAyah: rawData.fromAyah || rawData.ayah || 1,
        toAyah: rawData.toAyah || rawData.ayah || 1,
        surahName: rawData.surahName || rawData.surahNameArabic || surahMeta.nameArabic,
        surahNameSimple: rawData.surahNameSimple || surahMeta.nameSimple,
        ayahs: (rawData.ayahs || []).map((a: { ayah: number; text?: string; uthmani?: string; translation?: string; isPartial?: boolean }) => ({
          ayah: a.ayah,
          text: a.text || a.uthmani || "",
          translation: a.translation || "",
          isPartial: a.isPartial,
        })),
      };
      setResult(data);
      setEditSurah(data.surah);
      setEditFromAyah(data.fromAyah);
      setEditToAyah(data.toAyah);

      // Align words to speech runs using local VAD
      await buildSyncedData(data, localAudioUrl, fullBlobForVad || aiBlob);

      setProgress(100);
      setStage("detected");
    } catch (err) {
      console.error(err);
      setError("تعذر استكمال المزامنة التلقائية: " + String(err));
      setStage("error");
    }
  };

  /**
   * One continuous recitation track for a whole ayah range.
   *
   * Recitations are published per ayah, so a range used to play only its first
   * ayah: every word past that point pointed at audio that did not exist, and
   * seeking anywhere past the first verse landed on the end of the clip. These
   * are decoded and stitched into a single buffer (with a short pause between
   * ayahs, as a reciter leaves) so word timings, the timeline and the export all
   * describe the same track.
   */
  const buildReciterTrack = async (
    surahNum: number,
    fromAyahNum: number,
    toAyahNum: number,
    reciterId: number,
  ): Promise<{
    url: string;
    blob: Blob;
    duration: number;
    buffer: AudioBuffer;
    spans: { ayah: number; start: number; duration: number }[];
  } | null> => {
    const first = Math.max(1, Math.min(fromAyahNum, toAyahNum));
    const last = Math.max(first, toAyahNum);
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const decodeCtx = new AudioCtxClass();
    const fetchedAyahs: { ayah: number; buffer: AudioBuffer }[] = [];

    try {
      for (let ayah = first; ayah <= last; ayah += 1) {
        const response = await fetch(getReciterAudioUrl(surahNum, ayah, reciterId));
        if (!response.ok) continue;
        const ab = await decodeCtx.decodeAudioData(await response.arrayBuffer());
        fetchedAyahs.push({ ayah, buffer: ab });
      }
    } catch (err) {
      console.warn("Reciter track assembly stopped early:", err);
    } finally {
      void decodeCtx.close();
    }

    if (fetchedAyahs.length === 0) return null;

    const sampleRate = fetchedAyahs[0]!.buffer.sampleRate;
    const gapSamples = Math.round(0.35 * sampleRate);
    const totalSamples =
      fetchedAyahs.reduce((sum, item) => sum + item.buffer.length, 0) + gapSamples * (fetchedAyahs.length - 1);
    const offline = new OfflineAudioContext(1, totalSamples, sampleRate);
    let offsetSamples = 0;
    const spans: { ayah: number; start: number; duration: number }[] = [];

    for (const item of fetchedAyahs) {
      const source = offline.createBufferSource();
      source.buffer = item.buffer;
      source.connect(offline.destination);
      const startSec = offsetSamples / sampleRate;
      source.start(startSec);
      spans.push({ ayah: item.ayah, start: startSec, duration: item.buffer.duration });
      offsetSamples += item.buffer.length + gapSamples;
    }

    const rendered = await offline.startRendering();
    const blob = encodeWavMono(rendered);
    return { url: URL.createObjectURL(blob), blob, duration: rendered.duration, buffer: rendered, spans };
  };

  /* ------------------------------------------- QUICK AYAH CORRECTION */

  const loadCorrectedAyah = async (
    surahNum: number,
    fromAyahNum: number,
    toAyahNum: number,
    targetRiwayah?: Riwayah,
  ) => {
    setError(null);
    setStage("processing");
    setProgress(40);
    const activeRiwayah = targetRiwayah || customization.riwayah || "hafs";
    setStatusMessage(
      `جلب الآيات الكريمة برواية ${activeRiwayah === "warsh" ? "ورش عن نافع" : "حفص عن عاصم"}...`,
    );

    try {
      const surahMeta = ALL_SURAHS.find((s) => s.number === surahNum);
      const res = await fetch(
        `/api/quran?action=surah_verses&surah=${surahNum}&from=${fromAyahNum}&to=${toAyahNum}&riwayah=${activeRiwayah}`,
      );
      if (!res.ok) throw new Error("تعذر جلب الآيات المحددة");

      const data = await res.json();
      const verses = (data.verses || []) as { ayah: number; uthmani: string; translation: string }[];
      if (verses.length === 0) throw new Error("لم يتم العثور على آيات في هذا النطاق");

      setProgress(75);

      const fullUthmani = verses.map((v) => v.uthmani).join(" ۝ ");
      const fullTrans = verses.map((v) => v.translation).filter(Boolean).join(" • ");

      const piecesWithAyah: { text: string; ayah: number }[] = [];
      for (const v of verses) {
        const wordsInAyah = v.uthmani.split(/\s+/).filter(Boolean);
        for (const w of wordsInAyah) {
          piecesWithAyah.push({ text: w, ayah: v.ayah });
        }
      }

      // The range's own audio, stitched from the reciter — unless the creator is
      // working from their own recording, which stays the source of truth.
      const reciterId = typeof customization.selectedAudioSource === "number" ? customization.selectedAudioSource : RECITERS[0]!.id;
      const ownRecording = originalAudioBlob ?? null;
      const rangeTrack = ownRecording ? null : await buildReciterTrack(surahNum, fromAyahNum, toAyahNum, reciterId);
      if (rangeTrack) {
        if (reciterTrackUrlRef.current && reciterTrackUrlRef.current !== rangeTrack.url) {
          URL.revokeObjectURL(reciterTrackUrlRef.current);
        }
        reciterTrackUrlRef.current = rangeTrack.url;
      }

      const totalDur = rangeTrack?.duration ?? syncedData?.duration ?? 10;
      let wordsWithTimings: { text: string; ayah: number; start: number; end: number; hasMadd?: boolean; maddHarakat?: number }[] = [];

      if (rangeTrack?.spans && rangeTrack.spans.length > 0) {
        wordsWithTimings = await fetchReciterWordSegments(
          surahNum,
          fromAyahNum,
          toAyahNum,
          reciterId,
          rangeTrack.spans,
          piecesWithAyah,
        );
      } else {
        const aligned = alignWordsAcoustically({
          words: piecesWithAyah,
          speechRuns: syncedData?.speechRuns && syncedData.speechRuns.length > 0 ? syncedData.speechRuns : [{ start: 0, end: totalDur }],
          silences: syncedData?.analysis?.silences || [],
          durationSec: totalDur,
        });
        wordsWithTimings = aligned.map((a) => ({ ...a, ayah: a.ayah || fromAyahNum }));
      }

      const detectionData: DetectionResult = {
        surah: surahNum,
        ayah: fromAyahNum,
        fromAyah: fromAyahNum,
        toAyah: toAyahNum,
        isPartial: false,
        surahName: surahMeta?.nameArabic || data.surahNameArabic || "",
        surahNameSimple: surahMeta?.nameSimple || data.surahNameSimple || "",
        uthmani: fullUthmani,
        translation: fullTrans,
        ayahs: verses.map((v) => ({ ayah: v.ayah, text: v.uthmani, translation: v.translation })),
        durationSec: totalDur,
        audioUrl: rangeTrack?.url ?? syncedData?.audioUrl ?? getReciterAudioUrl(surahNum, fromAyahNum, reciterId),
        confidence: 1.0,
        words: wordsWithTimings,
      };

      setResult(detectionData);
      setEditSurah(surahNum);
      setEditFromAyah(fromAyahNum);
      setEditToAyah(toAyahNum);
      if (targetRiwayah) {
        setCustomization((prev) => ({ ...prev, riwayah: targetRiwayah }));
      }

      // Rebuild sync using existing audio buffer or rendered reciter buffer
      await buildSyncedData(
        detectionData,
        detectionData.audioUrl,
        rangeTrack?.blob ?? ownRecording ?? originalAudioBlob,
        rangeTrack?.buffer,
      );

      setProgress(100);
      setStage("detected");
      setShowEditAyahModal(false);
    } catch (err) {
      console.error(err);
      setError("تعذر تحديث الآيات: " + String(err));
      setStage((prev) => (prev === "processing" ? (result ? "detected" : "idle") : prev));
    }
  };

  const handleRiwayahChange = async (targetRiwayah: Riwayah) => {
    if (customization.riwayah === targetRiwayah) return;
    setCustomization((prev) => ({ ...prev, riwayah: targetRiwayah }));
    if (result) {
      await loadCorrectedAyah(
        result.surah,
        result.fromAyah || result.ayah,
        result.toAyah || result.ayah,
        targetRiwayah,
      );
    }
  };

  const handleSearchAyah = async (q: string) => {
    const clean = q.trim();
    if (!clean || clean.length < 2) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/quran?action=search&q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.warn("Quran search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  /* -------------------------------------------------- BUILD SYNCED DATA */

  const buildSyncedData = async (
    detection: DetectionResult,
    audioUrl: string,
    audioBlobOrNull?: Blob | null,
    alreadyDecodedBuffer?: AudioBuffer | null,
  ) => {
    try {
      let decoded = alreadyDecodedBuffer ?? null;
      if (!decoded) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtxClass();

        let arrayBuf: ArrayBuffer;
        if (audioBlobOrNull) {
          arrayBuf = await audioBlobOrNull.arrayBuffer();
        } else {
          const res = await fetch(audioUrl);
          arrayBuf = await res.arrayBuffer();
        }

        decoded = await audioCtx.decodeAudioData(arrayBuf);
        void audioCtx.close();
      }

      const mono = decoded.getChannelData(0);
      const analysis = analyzeSound(mono, decoded.sampleRate, {
        silenceThreshold: 0.012,
        speechThreshold: 0.024,
        minSilenceMs: 250,
        paddingMs: 70,
      });
      const vadRuns = speechRanges(analysis);

      // Extract words with ayah mapping
      const piecesWithAyah: { text: string; ayah: number }[] = [];
      if (detection.ayahs && detection.ayahs.length > 0) {
        for (const a of detection.ayahs) {
          const ws = (a.text || (a as { uthmani?: string }).uthmani || "").split(/\s+/).filter(Boolean);
          for (const w of ws) {
            piecesWithAyah.push({ text: w, ayah: a.ayah });
          }
        }
      } else {
        const pieces = detection.uthmani.split(/\s+/).filter(Boolean);
        for (const p of pieces) {
          piecesWithAyah.push({ text: p, ayah: detection.ayah });
        }
      }

      const inputWords = piecesWithAyah.length > 0 ? piecesWithAyah : [{ text: detection.uthmani, ayah: detection.ayah }];

      // Check if pre-aligned words exist and have valid acoustic intervals
      const hasPreAlignedWords = Boolean(
        detection.words &&
        detection.words.length > 0 &&
        detection.words.some((w) => w.end > w.start),
      );

      // Tajweed-aware acoustic alignment with VAD runs, silences, and onset snapping
      const mappedWords = alignWordsAcoustically({
        words: inputWords,
        frames: analysis.frames,
        speechRuns: vadRuns,
        silences: analysis.silences,
        durationSec: decoded.duration,
        existingWordTimings: hasPreAlignedWords ? detection.words : undefined,
      });

      // 3. Build speech runs for exact silence gating from word boundaries + VAD
      const wordSpeechRuns: { start: number; end: number }[] = [];
      for (const w of mappedWords) {
        const s = Math.max(0, w.start - 0.04);
        const e = Math.min(decoded.duration, w.end + 0.04);
        const prev = wordSpeechRuns[wordSpeechRuns.length - 1];
        if (prev && s <= prev.end + 0.28) {
          prev.end = Math.max(prev.end, e);
        } else {
          wordSpeechRuns.push({ start: s, end: e });
        }
      }

      const activeSpeechRuns = wordSpeechRuns.length > 0 ? wordSpeechRuns : vadRuns;

      setSyncedData({
        words: mappedWords,
        speechRuns: activeSpeechRuns,
        duration: decoded.duration,
        analysis,
        audioBuffer: decoded,
        audioUrl,
      });
    } catch (err) {
      console.warn("Audio sync calculation error:", err);
      const fallbackWords = detection.words?.length > 0 ? detection.words : [
        { text: detection.uthmani, start: 0, end: detection.durationSec }
      ];
      setSyncedData({
        words: fallbackWords,
        speechRuns: [{ start: 0, end: detection.durationSec }],
        duration: detection.durationSec,
        analysis: null,
        audioBuffer: null,
        audioUrl,
      });
    }
  };

  /* ------------------------------------------- INTERACTIVE PREVIEW LOOP */

  const activeAudioUrl = syncedData?.audioUrl ?? originalAudioUrl ?? null;

  React.useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    try {
      audio.load();
    } catch {
      // ignore
    }
    setCurrentTime(0);
    setIsPlaying(false);

    const onTimeUpdate = () => {
      const loop = loopRangeRef.current;
      if (loop && audio.currentTime >= loop.end) {
        // Repeat the ayah instead of running past it — this is how a reciter
        // drills a verse that will not sit right.
        audio.currentTime = loop.start;
      }
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      const loop = loopRangeRef.current;
      if (loop) {
        // The last ayah's loop ends exactly at the end of the track, and the
        // browser fires `ended` before the next timeupdate can wrap it — so the
        // loop has to be honoured here too, or rehearsing the final verse would
        // stop the playback every time.
        audio.currentTime = loop.start;
        setCurrentTime(loop.start);
        void audio.play().catch(() => setIsPlaying(false));
        return;
      }
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [activeAudioUrl]);

  // Synchronous Canvas Animation Loop for Preview
  React.useEffect(() => {
    if (!result || !syncedData) return;

    let animId: number;
    const render = () => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const time = previewAudioRef.current ? previewAudioRef.current.currentTime : currentTime;
        drawQuranCanvasFrame(
          canvas,
          time,
          syncedData.duration,
          result,
          syncedData,
          customization,
          {
            mosqueImg: mosqueImgRef.current,
            goldenImg: goldenImgRef.current,
            customImg: customImgRef.current,
            customVideo: customVideoElRef.current,
            uploadedVideo: uploadedVideoElRef.current,
          },
          false,
        );
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [result, syncedData, customization, currentTime]);

  const togglePlayPreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (customVideoElRef.current) customVideoElRef.current.pause();
      if (uploadedVideoElRef.current) uploadedVideoElRef.current.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if (customVideoElRef.current) customVideoElRef.current.play().catch(() => undefined);
        if (uploadedVideoElRef.current) uploadedVideoElRef.current.play().catch(() => undefined);
      }).catch((e) => console.warn(e));
    }
  };

  /**
   * The single seek path for the scrubber, the timeline, the mobile dock and
   * the keyboard — every one of them has to move the audio, the background
   * videos and the canvas together or the preview desynchronises.
   */
  const seekTo = React.useCallback((time: number) => {
    const target = Math.max(0, Math.min(syncedData?.duration ?? time, time));
    setCurrentTime(target);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = target;
    }
    if (customVideoElRef.current) {
      customVideoElRef.current.currentTime = target % (customVideoElRef.current.duration || 1);
    }
    if (uploadedVideoElRef.current) {
      uploadedVideoElRef.current.currentTime = target % (uploadedVideoElRef.current.duration || 1);
    }
  }, [syncedData?.duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  /* ------------------------------------------- INTERACTIVE CADRE DRAGGING */

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDraggingCadre(true);
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const clamped = Math.max(20, Math.min(80, Math.round(ratio * 100)));
    setCustomization((prev) => ({ ...prev, wordPosY: clamped }));
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingCadre) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const clamped = Math.max(20, Math.min(80, Math.round(ratio * 100)));
    setCustomization((prev) => ({ ...prev, wordPosY: clamped }));
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingCadre) {
      setIsDraggingCadre(false);
      try {
        previewCanvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* ---------------------------------------------------- EXPORT VIDEO */

  const exportVideo = async () => {
    if (!result || !syncedData) return;
    setStage("exporting");
    setExportProgress(0);

    if (previewAudioRef.current) previewAudioRef.current.pause();
    setIsPlaying(false);

    try {
      const W = ASPECTS[customization.aspect].w;
      const H = ASPECTS[customization.aspect].h;
      const FPS = 30;
      const duration = syncedData.duration;

      const canvas = exportCanvasRef.current;
      if (!canvas) throw new Error("Export canvas not found");
      canvas.width = W;
      canvas.height = H;

      await document.fonts.load("700 68px Amiri, serif").catch(() => undefined);
      await document.fonts.load("400 38px Amiri, serif").catch(() => undefined);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const stream = canvas.captureStream(FPS);

      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();

      let audioBuffer = syncedData.audioBuffer;
      if (!audioBuffer) {
        const resp = await fetch(syncedData.audioUrl);
        const arrayBuf = await resp.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
      }

      const bufferSource = audioCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      const dest = audioCtx.createMediaStreamDestination();
      bufferSource.connect(dest);

      for (const track of dest.stream.getAudioTracks()) {
        stream.addTrack(track);
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recorderDone = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(250);
      bufferSource.start(0);

      const startTime = performance.now();

      await new Promise<void>((resolve) => {
        const renderLoop = (now: number) => {
          const elapsed = (now - startTime) / 1000;
          if (elapsed >= duration + 0.5) {
            resolve();
            return;
          }

          setExportProgress(Math.min(96, Math.round((elapsed / duration) * 96)));

          if (customVideoElRef.current && customVideoElRef.current.duration) {
            customVideoElRef.current.currentTime = elapsed % customVideoElRef.current.duration;
          }
          if (uploadedVideoElRef.current && uploadedVideoElRef.current.duration) {
            uploadedVideoElRef.current.currentTime = elapsed % uploadedVideoElRef.current.duration;
          }

          drawQuranCanvasFrame(
            canvas,
            elapsed,
            duration,
            result,
            syncedData,
            customization,
            {
              mosqueImg: mosqueImgRef.current,
              goldenImg: goldenImgRef.current,
              customImg: customImgRef.current,
              customVideo: customVideoElRef.current,
              uploadedVideo: uploadedVideoElRef.current,
            },
            true,
          );

          requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);
      });

      try {
        bufferSource.stop();
      } catch {
        // ignore if already finished
      }
      recorder.stop();
      await recorderDone;
      await audioCtx.close().catch(() => undefined);

      setExportProgress(100);
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
      setStage("exported");
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تصدير الفيديو: " + String(err));
      setStage("detected");
    }
  };

  /* ---------------------------------------------------- DRAG & DROP */

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("audio/") || file.type.startsWith("video/"))) {
      handleFileUpload(file);
    } else {
      setError("يُرجى رفع ملف صوتي أو فيديو (mp3, wav, m4a, webm, mp4)");
    }
  };

  /* ---------------------------------------------------------------- UI */

  const adjustedTime = Math.max(0, currentTime + (customization.syncOffsetSec || 0));
  const isInSpeechNow = isTimeInSpeech(adjustedTime, syncedData?.speechRuns ?? []);
  const currentSurahMeta = ALL_SURAHS.find((s) => s.number === editSurah) || ALL_SURAHS[0]!;

  /* ----------------- REUSABLE 4-SECTION DESIGNER CONTROLS ----------------- */
  const renderDesignerTabContent = (activeTab: "quran" | "cadre" | "style" | "scene") => {
    switch (activeTab) {
      case "quran":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, direction: "rtl" }}>
            {/* Riwayah Selector */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                رواية المصحف الشريف:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "hafs", title: "رواية حفص عن عاصم", desc: "المصحف الشريف بالرسم العثماني المعتمد" },
                  { id: "warsh", title: "رواية ورش عن نافع", desc: "المصحف الشريف برسم ورش العثماني" },
                ].map((r) => {
                  const isSelected = customization.riwayah === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRiwayahChange(r.id as Riwayah)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        textAlign: "right",
                        cursor: "pointer",
                        border: isSelected ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: isSelected ? "linear-gradient(135deg, #FEFDF9 0%, #FFF9EB 100%)" : "#FFFFFF",
                        color: "#0F172A",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#854D0E" : "#0F172A" }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, lineHeight: 1.4 }}>
                        {r.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sacred Quran Read-only Text View */}
            {result && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                    نص الآيات الكريمة ({customization.riwayah === "warsh" ? "رواية ورش" : "رواية حفص"}):
                  </label>
                  <span style={{ fontSize: 11, color: "#64748B" }}>
                    قراءة مقدسة بالرسم العثماني
                  </span>
                </div>

                <div
                  style={{
                    background: "linear-gradient(135deg, #FEFDF9 0%, #FAF6ED 100%)",
                    border: "1.5px solid #EAD8B1",
                    borderRadius: 14,
                    padding: "18px 20px",
                    fontFamily: "'Amiri', serif",
                    fontSize: 20,
                    lineHeight: 2.2,
                    textAlign: "center",
                    color: "#1E293B",
                    direction: "rtl",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {result.ayahs && result.ayahs.length > 0 ? (
                    result.ayahs.map((a) => (
                      <span key={a.ayah} style={{ margin: "0 4px" }}>
                        {a.text}
                        <span
                          style={{
                            display: "inline-block",
                            margin: "0 6px",
                            color: "#D4AF37",
                            fontSize: "0.85em",
                            userSelect: "none",
                          }}
                        >
                          ۝{a.ayah}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span>{result.uthmani}</span>
                  )}
                </div>
              </div>
            )}

            {/* Change Ayah Range button */}
            <button
              onClick={() => setShowEditAyahModal(true)}
              style={{
                ...ghostBtn,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconSliders size={14} />
              <span>تغيير أو توسيع نطاق الآيات من المصحف</span>
            </button>
          </div>
        );

      case "cadre":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, direction: "rtl" }}>
            {/* Cadre Y-position */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  موضع النص عمودياً (محور Y):
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  {customization.wordPosY}%
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 10px" }}>
                تحريك إطار الآيات لأعلى أو أسفل (يمكنك أيضاً السحب بيدك على شاشة المعاينة مباشرة)
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[
                  { label: "أعلى (32%)", val: 32 },
                  { label: "وسط (52%)", val: 52 },
                  { label: "ريلز/تيك توك (68%)", val: 68 },
                ].map((btn) => {
                  const active = customization.wordPosY === btn.val;
                  return (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, wordPosY: btn.val }))}
                      style={{
                        flex: 1,
                        padding: "7px 6px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: active ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                        background: active ? "#FEF9C3" : "#FFFFFF",
                        color: active ? "#854D0E" : "#334155",
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={customization.wordPosY}
                onChange={(e) => setCustomization((c) => ({ ...c, wordPosY: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#D4AF37", cursor: "pointer" }}
              />
            </div>

            {/* Cadre Width & Words per Line */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  عرض الإطار وعدد كلمات السطر:
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  {Math.round(customization.boxWidthRatio * 100)}%
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 10px" }}>
                توسيع الإطار يجمع كلمات أكثر في السطر الواحد، وتضييقه يقسم الآية على أسطر متعددة
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[
                  { label: "عريض (92%)", val: 0.92 },
                  { label: "متناسق (82%)", val: 0.82 },
                  { label: "مدمج (64%)", val: 0.64 },
                ].map((btn) => {
                  const active = customization.boxWidthRatio === btn.val;
                  return (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, boxWidthRatio: btn.val }))}
                      style={{
                        flex: 1,
                        padding: "7px 6px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: active ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                        background: active ? "#FEF9C3" : "#FFFFFF",
                        color: active ? "#854D0E" : "#334155",
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.02"
                value={customization.boxWidthRatio}
                onChange={(e) => setCustomization((c) => ({ ...c, boxWidthRatio: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#D4AF37", cursor: "pointer" }}
              />
            </div>

            {/* Text Font Size */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  حجم خط كتابة الآيات:
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>
                  {customization.fontSize}px
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 10px" }}>
                تكبير أو تصغير حجم كتابة الكلمات داخل الإطار
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[
                  { label: "صغير (52px)", val: 52 },
                  { label: "قياسي (64px)", val: 64 },
                  { label: "كبير (76px)", val: 76 },
                ].map((btn) => {
                  const active = customization.fontSize === btn.val;
                  return (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, fontSize: btn.val }))}
                      style={{
                        flex: 1,
                        padding: "7px 6px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: active ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                        background: active ? "#FEF9C3" : "#FFFFFF",
                        color: active ? "#854D0E" : "#334155",
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min="32"
                max="84"
                step="2"
                value={customization.fontSize}
                onChange={(e) => setCustomization((c) => ({ ...c, fontSize: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#D4AF37", cursor: "pointer" }}
              />
            </div>

            {/* Frame Style */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                نمط وتصميم الإطار:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "glass", label: "زجاجي ناعم (Glass)", desc: "شفافية سينمائية" },
                  { id: "gold", label: "إطار ذهبي فاخر", desc: "زوايا مذهبة أصيلة" },
                  { id: "cinematic_dark", label: "مظلم سينمائي", desc: "تباين فائق للكلمات" },
                  { id: "none", label: "نص نقي بدون إطار", desc: "الكلمات حرة على المشهد" },
                ].map((s) => {
                  const active = customization.boxStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, boxStyle: s.id as typeof customization.boxStyle }))}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        textAlign: "right",
                        cursor: "pointer",
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEFDF7" : "#FFFFFF",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "style":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, direction: "rtl" }}>
            {/* Font Family */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                نوع الخط القرآني الشريف:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { id: "uthmani", label: "مصحف المدينة", sub: "رسم عثماني أصيل" },
                  { id: "amiri", label: "الخط الأميري", sub: "نسخ كلاسيكي فاخر" },
                  { id: "cairo", label: "خط كايرو", sub: "حديث متوازن وواضح" },
                ].map((f) => {
                  const active = customization.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, fontFamily: f.id as typeof customization.fontFamily }))}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 10,
                        textAlign: "center",
                        cursor: "pointer",
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEFDF7" : "#FFFFFF",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{f.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Word Animation */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                التأثير الحركي للكلمة النشطة:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "typewriter", label: "الآلة الكاتبة", desc: "ظهور كلمة فكلمة مع الصوت" },
                  { id: "shimmer_gold", label: "الوميض الذهبي", desc: "بريق ذهبي متألق لكل كلمة" },
                  { id: "pop_bounce", label: "وثب لطيف", desc: "تكبير خفيف وسلس للكلمة" },
                  { id: "glow_pulse", label: "النبض النوراني", desc: "توهج هادئ مع الحروف" },
                  { id: "fade_slide", label: "انزلاق ناعم", desc: "حركة صعود هادئة وسلسة" },
                  { id: "cinematic_zoom", label: "تقريب سينمائي", desc: "عمق ثلاثي الأبعاد جذاب" },
                ].map((a) => {
                  const active = customization.wordAnimation === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, wordAnimation: a.id as typeof customization.wordAnimation }))}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        textAlign: "right",
                        cursor: "pointer",
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEFDF7" : "#FFFFFF",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                        {a.label}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{a.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glow Accent Color */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                لون التوهج النوراني (Glow):
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { color: "rgba(235, 185, 75, 0.95)", label: "ذهبي ملكي", hex: "#EBB94B" },
                  { color: "rgba(56, 189, 248, 0.95)", label: "سماوي نقي", hex: "#38BDF8" },
                  { color: "rgba(52, 211, 153, 0.95)", label: "زمردي إسلامي", hex: "#34D399" },
                  { color: "rgba(251, 191, 36, 0.95)", label: "كهرماني دافئ", hex: "#FBBF24" },
                  { color: "rgba(192, 132, 252, 0.95)", label: "بنفسجي روحاني", hex: "#C084FC" },
                  { color: "rgba(255, 255, 255, 0.95)", label: "أبيض ناصع", hex: "#FFFFFF" },
                ].map((c) => {
                  const active = customization.glowColor === c.color;
                  return (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setCustomization((prev) => ({ ...prev, glowColor: c.color }))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEF9C3" : "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? "#854D0E" : "#334155",
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: c.hex,
                          boxShadow: "0 0 8px " + c.hex,
                          border: "1px solid rgba(0,0,0,0.1)",
                        }}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "scene":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, direction: "rtl" }}>
            {/* Aspect Ratio */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                أبعاد وقياس الفيديو:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(Object.keys(ASPECTS) as AspectKey[]).map((key) => {
                  const active = customization.aspect === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCustomization((prev) => ({ ...prev, aspect: key }))}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 10,
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEFDF7" : "#FFFFFF",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#854D0E" : "#0F172A", direction: "ltr" }}>
                        {key}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{ASPECTS[key].label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Background Selection */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                المشهد والخلفية:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {/* Original Video (if available) */}
                {uploadedVideoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomization((c) => ({ ...c, bgType: "uploaded_video" }))}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      textAlign: "right",
                      cursor: "pointer",
                      gridColumn: "1 / -1",
                      border: customization.bgType === "uploaded_video" ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                      background: customization.bgType === "uploaded_video" ? "#FEFDF7" : "#FFFFFF",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#854D0E" }}>
                      الفيديو الأصلي المرفوع
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                      عرض نص الآيات فوق مقطع الفيديو الذي قمت برفعه
                    </div>
                  </button>
                )}

                {([
                  { type: "preset_image" as const, preset: "mosque_night" as const, title: "محراب المسجد ليلاً", desc: "أجواء إيمانية هادئة" },
                  { type: "preset_image" as const, preset: "golden_emerald" as const, title: "الزمردي المذهب", desc: "زخارف إسلامية ملكية" },
                  { type: "stars" as const, preset: "space_stars" as const, title: "النجوم والفضاء", desc: "تأمل في خلق الكون" },
                  { type: "custom_color" as const, preset: "dark_onyx" as const, title: "الأسود الملكي", desc: "نقاء وتركيز عالي" },
                  { type: "custom_color" as const, preset: "spiritual_emerald" as const, title: "الأخضر الروحاني", desc: "تدرج هادئ وجميل" },
                  { type: "custom_color" as const, preset: "midnight_blue" as const, title: "الأزرق الداكن", desc: "سكينة ووقار" },
                ] as const).map((bg) => {
                  const active = customization.bgPreset === bg.preset;
                  return (
                    <button
                      key={bg.preset}
                      type="button"
                      onClick={() => setCustomization((c) => ({ ...c, bgType: bg.type, bgPreset: bg.preset }))}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        textAlign: "right",
                        cursor: "pointer",
                        border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                        background: active ? "#FEFDF7" : "#FFFFFF",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                        {bg.title}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{bg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Background Upload */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#854D0E", marginBottom: 8 }}>
                أو ارفع خلفية خاصة (صورة أو فيديو):
              </label>
              <div
                onClick={() => document.getElementById("customBgInput")?.click()}
                style={{
                  border: "2px dashed #CBD5E1",
                  borderRadius: 12,
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#F8FAFC",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  انقر لاختيار صورة أو فيديو كخلفية بديلة
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  صيغ مقبولة: JPG, PNG, WEBP, MP4
                </div>
                <input
                  id="customBgInput"
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      if (file.type.startsWith("video/")) {
                        const vid = document.createElement("video");
                        vid.src = url;
                        vid.muted = true;
                        vid.loop = true;
                        vid.playsInline = true;
                        vid.play().catch(() => undefined);
                        customVideoElRef.current = vid;
                        setCustomization((c) => ({ ...c, bgType: "custom_video", customVideo: url }));
                      } else {
                        const img = new Image();
                        img.src = url;
                        img.onload = () => { customImgRef.current = img; };
                        setCustomization((c) => ({ ...c, bgType: "custom_image", customImage: url }));
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="quran-standalone-app"
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        fontFamily: "'Cairo', 'Amiri', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#0F172A",
        display: "flex",
        flexDirection: "column",
        direction: "rtl",
        position: "relative",
      }}
    >
      {/* 1. Splash Screen on Initial Visit */}
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}

      {/* 2. Global Settings Modal (Paramètres) */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        riwayah={customization.riwayah}
        onRiwayahChange={(r) => handleRiwayahChange(r)}
        fontFamily={customization.fontFamily}
        onFontChange={(f) => setCustomization((c) => ({ ...c, fontFamily: f }))}
        showBismillah={customization.showBismillah}
        onToggleBismillah={(v) => setCustomization((c) => ({ ...c, showBismillah: v }))}
        showWaveform={customization.showWaveform}
        onToggleWaveform={(v) => setCustomization((c) => ({ ...c, showWaveform: v }))}
        exportQuality={exportQuality}
        onExportQualityChange={setExportQuality}
      />

      {/* Hidden audio for preview */}
      {activeAudioUrl ? (
        <audio
          ref={previewAudioRef}
          src={activeAudioUrl}
          preload="auto"
          muted={isMuted}
        />
      ) : null}

      {/* Hidden export canvas */}
      <canvas ref={exportCanvasRef} style={{ display: "none" }} />

      {/* 3. Standalone App Header */}
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
        }}
      >
        {/* Right: App Brand & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)",
              border: "1px solid #FDE047",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#854D0E",
            }}
          >
            <IconQuran size={22} color="#B45309" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.01em" }}>
                رِوَايَة
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 6,
                  background: "#FEF9C3",
                  color: "#854D0E",
                  border: "1px solid #FDE047",
                }}
              >
                مُصمّم الآيات
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
              تصميم ومزامنة مقاطع القرآن الكريم
            </div>
          </div>
        </div>

        {/* Center: Active Riwayah pill & Quick actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => handleRiwayahChange(customization.riwayah === "hafs" ? "warsh" : "hafs")}
            title="انقر للتبديل بين حفص وورش"
            style={{
              ...ghostBtn,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              color: "#92400E",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{customization.riwayah === "warsh" ? "رواية ورش عن نافع" : "رواية حفص عن عاصم"}</span>
            <span style={{ fontSize: 10, color: "#B45309" }}>⇄</span>
          </button>

          {stage !== "idle" && (
            <button
              onClick={() => {
                if (previewAudioRef.current) previewAudioRef.current.pause();
                setStage("idle");
              }}
              style={{
                ...ghostBtn,
                padding: "5px 10px",
                fontSize: 12,
                color: "#475569",
              }}
              title="العودة لاختيار سورة أو آيات أخرى"
            >
              تغيير الآيات
            </button>
          )}
        </div>

        {/* Left: Settings & Top Export */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              ...ghostBtn,
              padding: "7px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
            }}
            title="إعدادات التطبيق"
          >
            <IconSettings size={18} />
          </button>

          {(stage === "detected" || stage === "exporting" || stage === "exported") && (
            <button
              onClick={exportVideo}
              disabled={stage === "exporting"}
              style={{
                ...primaryBtn,
                width: "auto",
                padding: "7px 16px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconExport size={15} color="#1A1300" />
              <span>{stage === "exporting" ? `${exportProgress}%` : "تصدير الفيديو"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "16px 16px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* GLOBAL AYAH SELECTION & SEARCH MODAL */}
        {showEditAyahModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(6px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditAyahModal(false);
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 20,
                padding: "24px 26px",
                direction: "rtl",
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
                maxWidth: 580,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 17, color: "#854D0E", fontWeight: 800 }}>
                  تحديد أو تعديل نطاق الآيات الكريمة:
                </h4>
                <button
                  onClick={() => setShowEditAyahModal(false)}
                  style={{ background: "#F1F5F9", border: "none", color: "#64748B", cursor: "pointer", borderRadius: 8, padding: 6, display: "flex" }}
                  title="إغلاق"
                >
                  <IconX size={18} />
                </button>
              </div>

              <div className="edit-ayah-modal-grid">
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    السورة الكريمة:
                  </label>
                  <select
                    value={editSurah}
                    onChange={(e) => {
                      const sNum = Number(e.target.value);
                      setEditSurah(sNum);
                      setEditFromAyah(1);
                      setEditToAyah(Math.min(7, ALL_SURAHS.find((s) => s.number === sNum)?.ayahCount || 1));
                    }}
                    style={selectStyle}
                  >
                    {ALL_SURAHS.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. سورة {s.nameArabic} ({s.ayahCount} آية)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    من الآية:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={currentSurahMeta.ayahCount}
                    value={editFromAyah}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(currentSurahMeta.ayahCount, Number(e.target.value)));
                      setEditFromAyah(val);
                      if (editToAyah < val) setEditToAyah(val);
                    }}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                    إلى الآية:
                  </label>
                  <input
                    type="number"
                    min={editFromAyah}
                    max={currentSurahMeta.ayahCount}
                    value={editToAyah}
                    onChange={(e) => setEditToAyah(Math.max(editFromAyah, Math.min(currentSurahMeta.ayahCount, Number(e.target.value))))}
                    style={inputStyle}
                  />
                </div>

                <button
                  onClick={() => loadCorrectedAyah(editSurah, editFromAyah, editToAyah)}
                  style={{
                    ...primaryBtn,
                    width: "auto",
                    padding: "10px 20px",
                    fontSize: 14,
                  }}
                >
                  تطبيق الآيات
                </button>
              </div>

              {/* Quick Search by text */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "#854D0E", fontWeight: 700 }}>
                  أو ابحث عن الآية بكتابة أي كلمة من نصها:
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="مثال: الله لا إله إلا هو، أو قل هو الله أحد..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchAyah(searchQuery); }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => handleSearchAyah(searchQuery)}
                    style={{ ...primaryBtn, width: "auto", padding: "10px 18px", fontSize: 13 }}
                  >
                    {isSearching ? "جاري البحث..." : "بحث"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                    {searchResults.map((sr) => (
                      <div
                        key={sr.id}
                        onClick={() => {
                          setEditSurah(sr.surah);
                          setEditFromAyah(sr.ayah);
                          setEditToAyah(sr.ayah);
                          loadCorrectedAyah(sr.surah, sr.ayah, sr.ayah);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          cursor: "pointer",
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "#854D0E", fontWeight: 700 }}>سورة {sr.surahNameArabic} : آية {sr.ayah}</span>
                        <span style={{ color: "#475569", maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sr.uthmani}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= ONBOARDING / SETUP STAGE (RIWAYAH & AYAH FIRST) ================= */}
        {(stage === "idle" || stage === "recording" || stage === "processing") && (
          <div style={{ maxWidth: 840, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Onboarding Header */}
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <span style={goldBadge}>
                تطبيق رِوَايَة الشريف
              </span>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#0F172A", margin: "12px 0 6px" }}>
                إعداد وتصميم المقطع القرآني
              </h2>
              <p style={{ color: "#64748B", fontSize: 14, margin: 0, maxWidth: 560, marginInline: "auto" }}>
                حدّد الرواية الشريفة والآيات الكريمة، ثم اختر طريقة إدراج التلاوة للبدء في الإخراج والتصميم
              </p>
            </div>

            <Card>
              {/* STEP 1: RIWAYAH SELECTION */}
              <div style={{ marginBottom: 28, borderBottom: "1px solid #F1F5F9", paddingBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF9C3", color: "#854D0E", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    1
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                    الرواية الشريفة المعتمدة
                  </h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    {
                      id: "hafs" as Riwayah,
                      title: "رواية حفص عن عاصم",
                      desc: "مصحف مجمع الملك فهد بالمدينة المنورة",
                      badge: "الرسم الأكثر انتشاراً",
                    },
                    {
                      id: "warsh" as Riwayah,
                      title: "رواية ورش عن نافع",
                      desc: "طريق الأزرق · المصحف الجزائري والمغاربي",
                      badge: "قراءة أهل المغرب والجزائر",
                    },
                  ].map((r) => {
                    const isSelected = customization.riwayah === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRiwayahChange(r.id)}
                        style={{
                          padding: "16px 18px",
                          borderRadius: 14,
                          border: isSelected ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                          background: isSelected ? "linear-gradient(135deg, #FEFDF9 0%, #FFF9EB 100%)" : "#FFFFFF",
                          boxShadow: isSelected ? "0 8px 24px -4px rgba(212, 175, 55, 0.22)" : "0 1px 3px rgba(0,0,0,0.02)",
                          textAlign: "right",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? "#854D0E" : "#0F172A" }}>
                            {r.title}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: isSelected ? "#D4AF37" : "#F1F5F9",
                              color: isSelected ? "#1A1300" : "#64748B",
                            }}
                          >
                            {r.badge}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                          {r.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: AYAH SELECTION & LIVE PREVIEW */}
              <div style={{ marginBottom: 28, borderBottom: "1px solid #F1F5F9", paddingBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF9C3", color: "#854D0E", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      2
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                      تحديد الآيات الكريمة
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEditAyahModal(true)}
                    style={{
                      ...ghostBtn,
                      padding: "6px 14px",
                      fontSize: 12,
                      border: "1px solid #D4AF37",
                      color: "#854D0E",
                      background: "#FEFDF7",
                    }}
                  >
                    بحث بالكلمات في المصحف
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                      السورة الكريمة:
                    </label>
                    <select
                      value={editSurah}
                      onChange={(e) => {
                        const sNum = Number(e.target.value);
                        setEditSurah(sNum);
                        setEditFromAyah(1);
                        setEditToAyah(Math.min(7, ALL_SURAHS.find((s) => s.number === sNum)?.ayahCount || 1));
                      }}
                      style={selectStyle}
                    >
                      {ALL_SURAHS.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. سورة {s.nameArabic} ({s.ayahCount} آية)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                      من الآية:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentSurahMeta.ayahCount}
                      value={editFromAyah}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(currentSurahMeta.ayahCount, Number(e.target.value)));
                        setEditFromAyah(v);
                        if (editToAyah < v) setEditToAyah(v);
                      }}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
                      إلى الآية:
                    </label>
                    <input
                      type="number"
                      min={editFromAyah}
                      max={currentSurahMeta.ayahCount}
                      value={editToAyah}
                      onChange={(e) => {
                        const v = Math.max(editFromAyah, Math.min(currentSurahMeta.ayahCount, Number(e.target.value)));
                        setEditToAyah(v);
                      }}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Live Uthmani Verses Preview Card */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #FEFDF9 0%, #FAF6ED 100%)",
                    border: "1.5px solid #EAD8B1",
                    borderRadius: 16,
                    padding: "18px 20px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#854D0E" }}>
                      معاينة الرسم العثماني الشريف ({customization.riwayah === "warsh" ? "رواية ورش" : "رواية حفص"}):
                    </span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>
                      سورة {currentSurahMeta.nameArabic} · الآيات {editFromAyah} إلى {editToAyah}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: "clamp(18px, 2.5vw, 24px)",
                      lineHeight: 2.2,
                      textAlign: "center",
                      color: "#1E293B",
                      direction: "rtl",
                      minHeight: 50,
                    }}
                  >
                    {isLoadingPreview ? (
                      <span style={{ fontSize: 14, color: "#94A3B8" }}>جاري تحميل الرسم العثماني...</span>
                    ) : onboardingVerses.length > 0 ? (
                      onboardingVerses.map((v) => (
                        <span key={v.ayah} style={{ margin: "0 4px" }}>
                          {v.uthmani}
                          <span
                            style={{
                              display: "inline-block",
                              margin: "0 6px",
                              color: "#D4AF37",
                              fontSize: "0.85em",
                            }}
                          >
                            ۝{v.ayah}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 3: AUDIO & VIDEO SOURCE */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF9C3", color: "#854D0E", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    3
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                    مصدر التلاوة الصوتية والمشهد
                  </h3>
                </div>

                {/* 3 Source Options Toggle */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                  {[
                    { id: "instant" as const, title: "تلاوة جاهزة فورية", sub: "الشيخ مشاري راشد" },
                    { id: "upload" as const, title: "رفع تلاوة / فيديو", sub: "MP3, WAV, MP4" },
                    { id: "record" as const, title: "تسجيل بالمايكروفون", sub: "تلاوتك بصوتك" },
                  ].map((opt) => {
                    const active = onboardingAudioSource === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOnboardingAudioSource(opt.id)}
                        style={{
                          padding: "12px 10px",
                          borderRadius: 12,
                          border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                          background: active ? "#FEFDF7" : "#FFFFFF",
                          textAlign: "center",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: active ? "#854D0E" : "#1E293B" }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Option A: Instant reciter info */}
                {onboardingAudioSource === "instant" && (
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#334155", fontWeight: 600 }}>
                      سيتم استخدام تلاوة معتمدة عالية الجودة بصوت الشيخ مشاري راشد العفاسي محاكة ومطابقة لمقطع الآيات المحدد ({currentSurahMeta.nameArabic}: {editFromAyah}-{editToAyah}).
                    </p>
                  </div>
                )}

                {/* Option B: Upload File */}
                {onboardingAudioSource === "upload" && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("onboardingFileInput")?.click()}
                    style={{
                      border: isDragging ? "2px dashed #D4AF37" : "2px dashed #CBD5E1",
                      borderRadius: 14,
                      padding: "28px 16px",
                      background: isDragging ? "#FEFDF7" : "#F8FAFC",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                      انقر لاختيار ملف الصوت أو الفيديو، أو اسحبه وأفلته هنا
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      صيغ مدعومة: MP3, WAV, M4A, MP4, WEBM (يدعم حتى 5 دقائق مع التزامن التجويدي)
                    </div>
                    <input
                      id="onboardingFileInput"
                      type="file"
                      accept="audio/*,video/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </div>
                )}

                {/* Option C: Direct Microphone */}
                {onboardingAudioSource === "record" && (
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
                    {stage === "recording" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#DC2626", animation: "pulse 1.2s infinite" }} />
                          <span style={{ fontSize: 17, fontWeight: 700, color: "#DC2626" }}>
                            جاري تسجيل تلاوتك: {formatTime(recordingSec)}
                          </span>
                        </div>
                        <button onClick={stopRecording} style={{ ...dangerBtn, maxWidth: 220 }}>
                          إيقاف التسجيل والدخول
                        </button>
                      </div>
                    ) : (
                      <button onClick={startRecording} style={{ ...primaryBtn, maxWidth: 240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span>بدء التسجيل بالمايكروفون</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* BIG CALL TO ACTION: ENTER DESIGNER */}
              {stage === "idle" && (
                <div>
                  <button
                    onClick={() => {
                      loadCorrectedAyah(editSurah, editFromAyah, editToAyah, customization.riwayah);
                    }}
                    style={{
                      ...primaryBtn,
                      padding: "16px 24px",
                      fontSize: 16,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <span>بدء تصميم المقطع القرآني</span>
                    <IconChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Processing progress if stage === processing */}
              {stage === "processing" && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <ProgressBar value={progress} />
                  <div style={{ fontSize: 13, color: "#854D0E", marginTop: 8, fontWeight: 700 }}>
                    {statusMessage || "جاري إعداد الآيات والتزامن..."} ({progress}%)
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= DESIGN WORKSPACE (DESKTOP & MOBILE VIEWS) ================= */}
        {(stage === "detected" || stage === "exporting" || stage === "exported") && result && syncedData && (
          <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>

            {/* ---------------- A) DESKTOP WORKSPACE (2-COLUMN GRID) ---------------- */}
            <div className="quran-desktop-workspace">
              {/* Left Column: Preview & Player */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  {/* Card Header: Aspect buttons + speech badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, direction: "rtl" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
                        شاشة المعاينة ({customization.aspect})
                      </h3>
                      <div
                        role="group"
                        aria-label="قياس الفيديو"
                        style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "#F1F5F9" }}
                      >
                        {(Object.keys(ASPECTS) as AspectKey[]).map((key) => {
                          const active = customization.aspect === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={active}
                              title={ASPECTS[key].label}
                              onClick={() => setCustomization((prev) => ({ ...prev, aspect: key }))}
                              className="force-ltr"
                              style={{
                                border: "none",
                                borderRadius: 8,
                                padding: "5px 10px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: active ? "linear-gradient(135deg, #D4AF37, #C59B27)" : "transparent",
                                color: active ? "#1A1300" : "#64748B",
                              }}
                            >
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: isInSpeechNow ? "#DCFCE7" : "#F1F5F9",
                        color: isInSpeechNow ? "#166534" : "#64748B",
                        border: `1px solid ${isInSpeechNow ? "#86EFAC" : "#E2E8F0"}`,
                      }}
                    >
                      {isInSpeechNow ? "تلاوة جارية" : "وقف وسكوت"}
                    </span>
                  </div>

                  {/* Canvas Frame — with pointer drag */}
                  <div
                    className="canvas-frame-container"
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: customization.aspect === "16:9" ? 560 : 380,
                      aspectRatio: customization.aspect.replace(":", "/"),
                      margin: "0 auto",
                      borderRadius: 20,
                      overflow: "hidden",
                      boxShadow: "0 16px 40px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(212, 175, 55, 0.35)",
                      background: "#05070D",
                      cursor: isDraggingCadre ? "grabbing" : "grab",
                    }}
                  >
                    <canvas
                      ref={previewCanvasRef}
                      width={ASPECTS[customization.aspect].w}
                      height={ASPECTS[customization.aspect].h}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        touchAction: "none",
                      }}
                    />

                    {/* Quick Play Overlay if paused */}
                    {!isPlaying && (
                      <div
                        onClick={togglePlayPreview}
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          backdropFilter: "blur(2px)",
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #D4AF37, #F5D77F)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 8px 24px rgba(212,175,55,0.4)",
                          }}
                        >
                          <IconPlay size={26} color="#1A1300" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: "#64748B", textAlign: "center", marginTop: 8, direction: "rtl" }}>
                    اسحب الشاشة بيدك لتحريك موضع الآيات (موضع Y)
                  </div>

                  {/* Player Controls Bar */}
                  <div style={{ marginTop: 12 }}>
                    {/* Time Scrubber */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#854D0E", direction: "ltr", minWidth: 42 }}>
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={syncedData.duration || 10}
                        step="0.01"
                        value={currentTime}
                        onChange={handleSeek}
                        style={{ flex: 1, accentColor: "#D4AF37", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", direction: "ltr", minWidth: 42 }}>
                        {formatTime(syncedData.duration)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={togglePlayPreview}
                          style={{
                            ...primaryBtn,
                            width: "auto",
                            padding: "8px 18px",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {isPlaying ? (
                            <>
                              <IconPause size={14} color="#1A1300" />
                              إيقاف مؤقت
                            </>
                          ) : (
                            <>
                              <IconPlay size={14} color="#1A1300" />
                              تشغيل التلاوة
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
                            setCurrentTime(0);
                          }}
                          style={{
                            ...ghostBtn,
                            padding: "8px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="إعادة من البداية"
                        >
                          <IconRotateCcw size={15} />
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => setIsMuted((m) => !m)}
                          style={{
                            ...ghostBtn,
                            padding: "8px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                        >
                          {isMuted ? <IconVolumeMute size={15} /> : <IconVolume size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Export Button */}
                  <div style={{ marginTop: 16 }}>
                    <button
                      id="exportVideoBtn"
                      onClick={exportVideo}
                      disabled={stage === "exporting"}
                      style={{
                        ...primaryBtn,
                        padding: "14px 20px",
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <IconExport size={18} color="#1A1300" />
                      <span>
                        {stage === "exporting"
                          ? `جاري تصدير الفيديو (${exportProgress}%)...`
                          : `تصدير الفيديو النهائي (${ASPECTS[customization.aspect].w}×${ASPECTS[customization.aspect].h})`}
                      </span>
                    </button>
                  </div>
                </Card>
              </div>

              {/* Right Column: 4-Section Designer Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  {/* 4 Professional Designer Tabs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      background: "#F1F5F9",
                      padding: 5,
                      borderRadius: 14,
                      direction: "rtl",
                      marginBottom: 18,
                    }}
                  >
                    {[
                      { id: "quran", label: "الآيات والرواية", icon: <IconQuran size={16} /> },
                      { id: "cadre", label: "إطار النص", icon: <IconCanvas size={16} /> },
                      { id: "style", label: "الخط والحركة", icon: <IconDesign size={16} /> },
                      { id: "scene", label: "المشهد والخلفية", icon: <IconSparkles size={16} /> },
                    ].map((tab) => {
                      const active = designerTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDesignerTab(tab.id as typeof designerTab)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            padding: "8px 4px",
                            borderRadius: 10,
                            border: active ? "1px solid #D4AF37" : "1px solid transparent",
                            background: active ? "linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)" : "transparent",
                            color: active ? "#854D0E" : "#64748B",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {tab.icon}
                          <span style={{ whiteSpace: "nowrap" }}>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Render Current Tab Controls */}
                  {renderDesignerTabContent(designerTab)}
                </Card>
              </div>
            </div>

            {/* ---------------- B) MOBILE SINGLE-PAGE WORKSPACE ---------------- */}
            <div className="quran-mobile-workspace">
              {/* Pinned Top Preview & Scrubber */}
              <div className="quran-mobile-preview-box">
                <div
                  className="canvas-frame-container"
                  style={{
                    position: "relative",
                    width: "auto",
                    aspectRatio: customization.aspect.replace(":", "/"),
                    margin: "0 auto",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(212, 175, 55, 0.4)",
                    background: "#05070D",
                    cursor: isDraggingCadre ? "grabbing" : "grab",
                  }}
                >
                  <canvas
                    ref={previewCanvasRef}
                    width={ASPECTS[customization.aspect].w}
                    height={ASPECTS[customization.aspect].h}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      touchAction: "none",
                    }}
                  />

                  {/* Quick Play Overlay if paused */}
                  {!isPlaying && (
                    <div
                      onClick={togglePlayPreview}
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #D4AF37, #F5D77F)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconPlay size={22} color="#1A1300" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Compact Player Scrubber Bar */}
                <div style={{ width: "100%", maxWidth: 360, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  <input
                    type="range"
                    min="0"
                    max={syncedData.duration || 10}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    style={{ width: "100%", accentColor: "#D4AF37", cursor: "pointer", height: 4 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={togglePlayPreview}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #D4AF37, #C59B27)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#1A1300",
                          cursor: "pointer",
                        }}
                      >
                        {isPlaying ? <IconPause size={13} /> : <IconPlay size={13} />}
                      </button>
                      <button
                        onClick={() => {
                          if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }}
                        style={{ ...ghostBtn, padding: "4px 8px" }}
                        title="إعادة من البداية"
                      >
                        <IconRotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => setIsMuted((m) => !m)}
                        style={{ ...ghostBtn, padding: "4px 8px" }}
                        title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                      >
                        {isMuted ? <IconVolumeMute size={12} /> : <IconVolume size={12} />}
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#854D0E", direction: "ltr" }}>
                        {formatTime(currentTime)} / {formatTime(syncedData.duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Mobile Controls Drawer */}
              <div className="quran-mobile-drawer">
                {/* 4 Action Buttons Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#FFFFFF",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", gap: 4, flex: 1 }}>
                    {[
                      { id: "cadre" as const, label: "إطار النص", icon: <IconCanvas size={13} /> },
                      { id: "style" as const, label: "الخط والحركة", icon: <IconDesign size={13} /> },
                      { id: "scene" as const, label: "المشهد", icon: <IconSparkles size={13} /> },
                      { id: "quran" as const, label: "الآيات", icon: <IconQuran size={13} /> },
                    ].map((tab) => {
                      const active = designerTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            if (designerTab === tab.id && mobileDrawerOpen) {
                              setMobileDrawerOpen(false);
                            } else {
                              setDesignerTab(tab.id);
                              setMobileDrawerOpen(true);
                            }
                          }}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            padding: "6px 2px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            border: active ? "1px solid #D4AF37" : "1px solid transparent",
                            background: active ? "linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)" : "#F8FAFC",
                            color: active ? "#854D0E" : "#64748B",
                            cursor: "pointer",
                          }}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen((o) => !o)}
                    style={{ background: "none", border: "none", color: "#64748B", padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}
                    title={mobileDrawerOpen ? "تصغير اللوحة" : "فتح اللوحة"}
                  >
                    <IconChevronDown size={16} />
                  </button>
                </div>

                {/* Drawer Body (only visible if open) */}
                {mobileDrawerOpen && (
                  <div className="quran-mobile-drawer-body">
                    {renderDesignerTabContent(designerTab)}
                  </div>
                )}
              </div>
            </div>

            {/* Exporting Overlay */}
            {stage === "exporting" && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(6px)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  direction: "rtl",
                }}
              >
                <Card style={{ maxWidth: 360, width: "90%", textAlign: "center" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: "#854D0E" }}>
                    جاري إخراج وتصدير الفيديو...
                  </h4>
                  <ProgressBar value={exportProgress} />
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: "#64748B" }}>
                    يتم رسم وتنسيق الإطارات بأعلى جودة ({exportProgress}%)
                  </p>
                </Card>
              </div>
            )}

            {/* Exported Video Success Card */}
            {stage === "exported" && exportedVideoUrl && (
              <Card style={{ marginTop: 20 }}>
                <div style={{ textAlign: "center", direction: "rtl" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#166534" }}>
                    تم تصدير الفيديو بنجاح!
                  </h3>
                  <p style={{ color: "#64748B", fontSize: 13, marginBottom: 16 }}>
                    يمكنك الآن معاينة وتحميل الفيديو القرآني المصمم
                  </p>

                  <div style={{ maxWidth: 340, margin: "0 auto 16px", borderRadius: 16, overflow: "hidden", border: "2px solid #D4AF37" }}>
                    <video src={exportedVideoUrl} controls autoPlay style={{ width: "100%", display: "block" }} />
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <a
                      href={exportedVideoUrl}
                      download={`quran_${result.surah}_${result.ayah}.webm`}
                      style={{
                        ...primaryBtn,
                        textDecoration: "none",
                        width: "auto",
                        padding: "10px 24px",
                        fontSize: 14,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <IconExport size={16} color="#1A1300" />
                      <span>تحميل الفيديو النهائي</span>
                    </a>
                    <button
                      onClick={() => setStage("detected")}
                      style={{ ...ghostBtn, width: "auto", padding: "10px 20px", fontSize: 14 }}
                    >
                      تعديل الإعدادات وإعادة التصدير
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ================= ERROR ALERT WITH INSTANT FIX ACTION ================= */}
        {stage === "error" && error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 16,
              padding: "18px 22px",
              direction: "rtl",
              color: "#991B1B",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 15 }}>تنبيه: </strong>
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => { setError(null); setStage("idle"); }}
                style={{ ...primaryBtn, width: "auto", padding: "8px 18px", fontSize: 13 }}
              >
                إعادة المحاولة
              </button>

              <button
                onClick={() => {
                  setError(null);
                  if (!result) {
                    setEditSurah(1);
                    setEditFromAyah(1);
                    setEditToAyah(7);
                  }
                  setShowEditAyahModal(true);
                }}
                style={{
                  ...ghostBtn,
                  width: "auto",
                  padding: "8px 18px",
                  fontSize: 13,
                  border: "1px solid #D4AF37",
                  color: "#854D0E",
                  background: "#FEFDF7",
                }}
              >
                اختيار أو بحث عن الآيات في المصحف والمتابعة
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Global Embedded Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&display=swap');

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        @keyframes splashLoad {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        .quran-desktop-workspace {
          display: grid;
          grid-template-columns: minmax(360px, 440px) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          width: 100%;
        }

        .quran-mobile-workspace {
          display: none;
        }

        .edit-ayah-modal-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }

        @media (max-width: 860px) {
          .quran-standalone-app {
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          .quran-desktop-workspace {
            display: none !important;
          }
          .quran-mobile-workspace {
            display: flex !important;
            flex-direction: column !important;
            height: calc(100dvh - 58px) !important;
            overflow: hidden !important;
            width: 100% !important;
          }
          .quran-mobile-preview-box {
            flex: 0 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 6px 12px 2px !important;
            background: #FFFFFF !important;
            border-bottom: 1px solid #E2E8F0 !important;
          }
          .canvas-frame-container {
            max-height: 42vh !important;
            width: auto !important;
          }
          .canvas-frame-container canvas {
            max-height: 42vh !important;
            width: auto !important;
            margin: 0 auto !important;
          }
          .quran-mobile-drawer {
            flex: 1 1 0% !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            background: #F8FAFC !important;
          }
          .quran-mobile-drawer-body {
            flex: 1 1 0% !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 12px 14px 28px !important;
          }
          .edit-ayah-modal-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .edit-ayah-modal-grid button {
            grid-column: 1 / -1 !important;
            width: 100% !important;
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================================
   CANVAS RENDERING ENGINE (USED FOR BOTH LIVE PREVIEW & EXPORT)
========================================================================= */

function isTimeInSpeech(time: number, speechRuns: { start: number; end: number }[]): boolean {
  if (speechRuns.length === 0) return true;
  return speechRuns.some((r) => time >= r.start && time <= r.end);
}

function drawQuranCanvasFrame(
  canvas: HTMLCanvasElement,
  rawTime: number,
  duration: number,
  result: DetectionResult,
  syncedData: SyncedData,
  custom: Customization,
  assets: {
    mosqueImg: HTMLImageElement | null;
    goldenImg: HTMLImageElement | null;
    customImg: HTMLImageElement | null;
    customVideo: HTMLVideoElement | null;
    uploadedVideo: HTMLVideoElement | null;
  },
  isExport = false,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Apply timing nudge / sync offset
  const time = Math.max(0, rawTime + (custom.syncOffsetSec || 0));

  // 1. Draw Background
  ctx.save();
  drawBackground(ctx, W, H, time, custom, assets);
  ctx.restore();

  // 2. Draw Top Ornaments & Surah Badge
  if (custom.showAyahInfo) {
    drawTopHeader(ctx, W, H, result);
  }

  // 3. Draw Bismillah (if enabled, surah is not At-Tawbah 9, and verse is not already Bismillah)
  if (custom.showBismillah && result.surah !== 9 && !(result.surah === 1 && result.ayah === 1)) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "400 38px 'Amiri', serif";
    ctx.fillStyle = "rgba(235, 185, 75, 0.85)";
    ctx.fillText("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", W / 2, H * 0.285);
    ctx.restore();
  }

  // 4. Calculate Speech & Active Word with Madd (المد) persistence
  const words = syncedData.words;
  const speechRuns = syncedData.speechRuns;
  const isInSpeech = isTimeInSpeech(time, speechRuns);

  let activeWordIdx = -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const nextW = words[i + 1];
    // Check if word has Madd diacritic or prolonged vowel
    const hasMaddChar = /[\u0653\u0670\u0656ٓ]/.test(w.text) || (w.end - w.start >= 1.2);
    // In tajweed recitation, word holds active until next word begins
    const holdEnd = nextW
      ? nextW.start
      : (w.end + (custom.holdMaddVowels || hasMaddChar ? 2.2 : 0.8));

    if (time >= w.start && time < holdEnd) {
      activeWordIdx = i;
      break;
    }
  }

  // Smooth fallback: keep current word active during recitation
  if (activeWordIdx === -1 && words.length > 0) {
    if (time < words[0]!.start) {
      activeWordIdx = 0;
    } else if (time >= words[words.length - 1]!.start) {
      activeWordIdx = words.length - 1;
    } else {
      for (let i = words.length - 1; i >= 0; i--) {
        if (time >= words[i]!.start) {
          activeWordIdx = i;
          break;
        }
      }
    }
  }

  // 5. Render Bounding Box and Words with Y-position
  ctx.save();
  renderWordsAndBox(ctx, W, H, words, activeWordIdx, isInSpeech, speechRuns, time, custom, result, isExport);
  ctx.restore();

  // 6. Draw Live Waveform
  if (custom.showWaveform) {
    drawWaveform(ctx, W / 2, H * 0.77, isInSpeech, time, custom.glowColor);
  }

  // 7. Draw Translation
  if (custom.showTranslation && result.translation) {
    drawTranslation(ctx, W / 2, H * 0.84, W * 0.82, result.translation);
  }

  // 8. Draw Progress Bar
  const progressRatio = Math.max(0, Math.min(1, duration > 0 ? rawTime / duration : 0));
  drawProgressBar(ctx, W * 0.1, H * 0.94, W * 0.8, 8, progressRatio);
}

/* ------------------------------------------------ BACKGROUND DRAWING */

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  time: number,
  custom: Customization,
  assets: {
    mosqueImg: HTMLImageElement | null;
    goldenImg: HTMLImageElement | null;
    customImg: HTMLImageElement | null;
    customVideo: HTMLVideoElement | null;
    uploadedVideo: HTMLVideoElement | null;
  },
) {
  if (custom.bgType === "uploaded_video" && assets.uploadedVideo && assets.uploadedVideo.readyState >= 2) {
    drawImageCover(ctx, assets.uploadedVideo, W, H);
    drawVignette(ctx, W, H, 0.7);
    return;
  }

  if (custom.bgType === "custom_video" && assets.customVideo && assets.customVideo.readyState >= 2) {
    drawImageCover(ctx, assets.customVideo, W, H);
    drawVignette(ctx, W, H, 0.7);
    return;
  }

  if (custom.bgType === "custom_image" && assets.customImg) {
    drawImageCover(ctx, assets.customImg, W, H);
    drawVignette(ctx, W, H, 0.65);
    return;
  }

  if (custom.bgType === "preset_image") {
    if (custom.bgPreset === "mosque_night" && assets.mosqueImg) {
      drawImageCover(ctx, assets.mosqueImg, W, H);
      drawVignette(ctx, W, H, 0.68);
      return;
    }
    if (custom.bgPreset === "golden_emerald" && assets.goldenImg) {
      drawImageCover(ctx, assets.goldenImg, W, H);
      drawVignette(ctx, W, H, 0.65);
      return;
    }
  }

  if (custom.bgType === "stars" || custom.bgPreset === "space_stars") {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#050711");
    grad.addColorStop(0.5, "#0A0E22");
    grad.addColorStop(1, "#04060E");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const star of STARS) {
      const alpha = 0.25 + 0.65 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.fillStyle = `rgba(255, 235, 175, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * W, star.y * H, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const radial = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.75);
    radial.addColorStop(0, "rgba(43, 127, 255, 0.08)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (custom.bgType === "custom_color") {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, custom.customColor1);
    grad.addColorStop(1, custom.customColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    drawVignette(ctx, W, H, 0.4);
    return;
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (custom.bgPreset === "spiritual_emerald") {
    grad.addColorStop(0, "#03150C");
    grad.addColorStop(0.5, "#0A291A");
    grad.addColorStop(1, "#03150C");
  } else if (custom.bgPreset === "midnight_blue") {
    grad.addColorStop(0, "#050D1C");
    grad.addColorStop(0.5, "#0E2140");
    grad.addColorStop(1, "#050D1C");
  } else {
    grad.addColorStop(0, "#05070D");
    grad.addColorStop(0.5, "#0D1322");
    grad.addColorStop(1, "#05070D");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const radial = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.7);
  radial.addColorStop(0, "rgba(43, 127, 255, 0.07)");
  radial.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  W: number,
  H: number,
) {
  const iw = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const ih = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  if (!iw || !ih) return;

  const scale = Math.max(W / iw, H / ih);
  const nw = iw * scale;
  const nh = ih * scale;
  const nx = (W - nw) / 2;
  const ny = (H - nh) / 2;
  ctx.drawImage(img, nx, ny, nw, nh);
}

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(5, 7, 13, ${strength * 0.85})`);
  grad.addColorStop(0.3, `rgba(5, 7, 13, ${strength * 0.5})`);
  grad.addColorStop(0.7, `rgba(5, 7, 13, ${strength * 0.5})`);
  grad.addColorStop(1, `rgba(5, 7, 13, ${strength * 0.95})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------------------------ TOP HEADER DRAWING */

function drawTopHeader(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  result: DetectionResult,
) {
  ctx.save();

  const cx = W / 2;
  const cy = H * 0.11;
  const size = 64;

  ctx.strokeStyle = "rgba(43, 127, 255, 0.45)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? size / 2 : size / 4.2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(235, 185, 75, 0.85)";
  ctx.fill();

  const surahNameResolved = result.surahName || ALL_SURAHS.find((s) => s.number === result.surah)?.nameArabic || "";
  let badgeText = `سُورَةُ ${surahNameResolved}`;
  const from = result.fromAyah || result.ayah;
  const to = result.toAyah || result.ayah;
  if (from === to) {
    if (result.isPartial) {
      badgeText += ` • جزء من الآية ${from}`;
    } else {
      badgeText += ` • الآية ${from}`;
    }
  } else {
    badgeText += ` • الآيات ${from} - ${to}`;
  }
  ctx.font = "600 42px 'Amiri', serif";
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const badgeY = H * 0.185;
  const textWidth = ctx.measureText(badgeText).width;
  const badgePadX = 34;
  const badgePadY = 14;

  ctx.fillStyle = "rgba(235, 185, 75, 0.12)";
  ctx.strokeStyle = "rgba(235, 185, 75, 0.45)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, cx - textWidth / 2 - badgePadX, badgeY - 24 - badgePadY / 2, textWidth + badgePadX * 2, 48 + badgePadY, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFE885";
  ctx.fillText(badgeText, cx, badgeY);

  ctx.strokeStyle = "rgba(235, 185, 75, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.22, H * 0.238);
  ctx.lineTo(W * 0.78, H * 0.238);
  ctx.stroke();

  ctx.restore();
}

/* ----------------------------------- BOUNDING BOX & WORDS RENDERING */

function renderWordsAndBox(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  words: { text: string; ayah?: number; start: number; end: number }[],
  activeIdx: number,
  isInSpeech: boolean,
  speechRuns: { start: number; end: number }[],
  time: number,
  custom: Customization,
  result?: DetectionResult,
  isExport = false,
) {
  const centerY = H * (custom.wordPosY / 100);
  const fontSize = custom.fontSize;
  const glowColor = custom.glowColor;
  const fontName =
    custom.fontFamily === "cairo"
      ? "'Cairo', sans-serif"
      : custom.fontFamily === "uthmani"
        ? "'Amiri Quran', 'Amiri', serif"
        : "'Amiri', serif";
  const speedMult = custom.animationSpeed === "fast" ? 1.45 : custom.animationSpeed === "smooth" ? 0.8 : 1.0;

  const boxW = W * custom.boxWidthRatio;
  let estimatedHeight = fontSize * 1.5;
  if (custom.wordMode === "phrase" || custom.wordMode === "full_ayah") {
    estimatedHeight = fontSize * 2.8;
  }
  const boxH = estimatedHeight + custom.boxPaddingY * 2;
  const boxX = (W - boxW) / 2;
  const boxY = centerY - boxH / 2;

  // Draw Bounding Box
  if (custom.boxStyle !== "none" && (isInSpeech || !custom.hideOnSilence)) {
    ctx.save();
    if (custom.boxStyle === "glass") {
      ctx.fillStyle = `rgba(10, 15, 28, ${custom.boxOpacity})`;
      ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, boxX, boxY, boxW, boxH, custom.boxBorderRadius);
      ctx.fill();
      ctx.stroke();
    } else if (custom.boxStyle === "gold_frame") {
      ctx.fillStyle = `rgba(7, 10, 18, ${custom.boxOpacity * 0.9})`;
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 2;
      roundRect(ctx, boxX, boxY, boxW, boxH, custom.boxBorderRadius);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
      ctx.lineWidth = 1;
      roundRect(ctx, boxX + 6, boxY + 6, boxW - 12, boxH - 12, Math.max(4, custom.boxBorderRadius - 6));
      ctx.stroke();
    } else if (custom.boxStyle === "dark_cinematic") {
      const radial = ctx.createRadialGradient(W / 2, centerY, 0, W / 2, centerY, boxW / 2);
      radial.addColorStop(0, `rgba(5, 7, 13, ${custom.boxOpacity})`);
      radial.addColorStop(0.7, `rgba(5, 7, 13, ${custom.boxOpacity * 0.65})`);
      radial.addColorStop(1, "rgba(5, 7, 13, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(boxX - 20, boxY - 20, boxW + 40, boxH + 40);
    }
    ctx.restore();
  }

  // Draw tactile corner framing brackets in live preview to make the cadre clearly visible
  if (!isExport) {
    ctx.save();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
    ctx.lineWidth = 1.5;
    const bl = 16;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + bl);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + bl, boxY);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bl, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + bl);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - bl);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + bl, boxY + boxH);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bl, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - bl);
    ctx.stroke();
    ctx.restore();
  }

  // Silence Gating
  if (custom.hideOnSilence && !isInSpeech) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 38px ${fontName}`;
    ctx.fillStyle = "rgba(43, 127, 255, 0.3)";
    ctx.fillText("۞", W / 2, centerY);
    ctx.restore();
    return;
  }

  /* MODE 1: ONE WORD BY ONE WORD */
  if (custom.wordMode === "one_by_one") {
    const activeWord = words[activeIdx];
    if (!activeWord) return;

    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const wordElapsed = Math.max(0, time - activeWord.start);
    const wordDuration = Math.max(0.08, activeWord.end - activeWord.start);
    const progress = Math.min(1, (wordElapsed / wordDuration) * speedMult);

    // Check if this word was recited previously (repetition detection)
    const isRepeated = words.slice(0, activeIdx).some((w) => w.text === activeWord.text);
    if (isRepeated && custom.showRepetitionBadge) {
      ctx.save();
      ctx.font = `600 24px ${fontName}`;
      ctx.fillStyle = "rgba(255, 232, 133, 0.9)";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.fillText("إعادة تلاوة", W / 2, boxY - 16);
      ctx.restore();
    }

    ctx.save();

    let textToDraw = activeWord.text;
    let currentScale = 1.18;
    let currentOffsetY = 0;
    let currentAlpha = 1.0;
    let currentShadowBlur = 38;

    if (custom.wordAnimation === "typewriter") {
      const charCount = Math.max(1, Math.ceil(progress * activeWord.text.length));
      textToDraw = activeWord.text.slice(0, charCount);
    } else if (custom.wordAnimation === "pop_bounce") {
      const spring = progress < 0.35
        ? 0.7 + 0.65 * (progress / 0.35)
        : 1.35 - 0.2 * ((progress - 0.35) / 0.65);
      currentScale *= spring;
      currentShadowBlur = 48;
      if (progress < 0.55) {
        ctx.save();
        const r = 50 + 90 * (progress / 0.55);
        ctx.strokeStyle = `rgba(43, 127, 255, ${0.45 * (1 - progress / 0.55)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(W / 2, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else if (custom.wordAnimation === "shimmer_gold") {
      const shimmerOffset = (progress * 2 - 1) * 160;
      const grad = ctx.createLinearGradient(W / 2 + shimmerOffset - 100, centerY, W / 2 + shimmerOffset + 100, centerY);
      grad.addColorStop(0, "#FFE97A");
      grad.addColorStop(0.5, "#FFFFFF");
      grad.addColorStop(1, "#FFE97A");
      ctx.fillStyle = grad;
      currentShadowBlur = 36 + 22 * Math.sin(progress * Math.PI);
    } else if (custom.wordAnimation === "flip_reveal") {
      const flipPhase = Math.min(1, progress * 1.6);
      const scaleY = flipPhase < 0.5 ? 1 - flipPhase * 2 : (flipPhase - 0.5) * 2;
      ctx.translate(W / 2, centerY);
      ctx.scale(1, Math.max(0.08, scaleY));
      ctx.translate(-W / 2, -centerY);
      currentShadowBlur = 42;
    } else if (custom.wordAnimation === "glow_pulse") {
      currentShadowBlur = 24 + 36 * Math.sin(progress * Math.PI);
    } else if (custom.wordAnimation === "fade_slide_up") {
      currentOffsetY = (1 - Math.min(1, progress * 2.2)) * 26;
      currentAlpha = Math.min(1, progress * 2.8);
    } else if (custom.wordAnimation === "cinematic_zoom") {
      currentScale *= (0.92 + 0.16 * progress);
    }

    ctx.globalAlpha = currentAlpha;
    ctx.font = `700 ${fontSize * currentScale}px ${fontName}`;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = currentShadowBlur;
    if (custom.wordAnimation !== "shimmer_gold") {
      ctx.fillStyle = "#FFE97A";
    }
    ctx.fillText(textToDraw, W / 2, centerY + currentOffsetY);

    // Cursor for typewriter
    if (custom.wordAnimation === "typewriter" && progress < 0.98 && custom.cursorStyle !== "none") {
      const typedWidth = ctx.measureText(textToDraw).width;
      const cursorX = W / 2 - typedWidth / 2 - 10;
      const cursorY = centerY + currentOffsetY;
      ctx.save();
      if (custom.cursorStyle === "golden_dot") {
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFE885";
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.fill();
      } else if (custom.cursorStyle === "sparkle_star") {
        ctx.font = "26px serif";
        ctx.fillStyle = "#FFE885";
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14;
        ctx.fillText("✦", cursorX, cursorY + 8);
      } else if (custom.cursorStyle === "pulsing_ring") {
        const ringR = 4 + 4 * Math.abs(Math.sin(time * 9));
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = "#FFE885";
        ctx.lineWidth = 2;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    ctx.save();
    ctx.font = `400 ${fontSize * 0.72}px ${fontName}`;
    ctx.fillStyle = "rgba(43, 127, 255, 0.65)";
    const wordWidth = ctx.measureText(activeWord.text).width;
    ctx.fillText("﴿", W / 2 + wordWidth / 2 + 42, centerY);
    ctx.fillText("﴾", W / 2 - wordWidth / 2 - 42, centerY);
    ctx.restore();

    if (activeIdx > 0 && words[activeIdx - 1]) {
      ctx.save();
      ctx.font = `400 ${fontSize * 0.44}px ${fontName}`;
      ctx.fillStyle = "rgba(230, 220, 200, 0.35)";
      ctx.fillText(words[activeIdx - 1]!.text, W / 2 + wordWidth / 2 + 120, centerY);
      ctx.restore();
    }
    if (activeIdx < words.length - 1 && words[activeIdx + 1]) {
      ctx.save();
      ctx.font = `400 ${fontSize * 0.44}px ${fontName}`;
      ctx.fillStyle = "rgba(230, 220, 200, 0.35)";
      ctx.fillText(words[activeIdx + 1]!.text, W / 2 - wordWidth / 2 - 120, centerY);
      ctx.restore();
    }
    return;
  }

  /* MODE 2: TWO BY TWO */
  if (custom.wordMode === "two_by_two") {
    const pairStartIdx = Math.floor(Math.max(0, activeIdx) / 2) * 2;
    const w1 = words[pairStartIdx];
    const w2 = words[pairStartIdx + 1];
    if (!w1) return;

    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pairText = w2 ? `${w1.text} ${w2.text}` : w1.text;
    const activeWord = words[activeIdx] || w1;
    const wordElapsed = Math.max(0, time - activeWord.start);
    const wordDuration = Math.max(0.08, activeWord.end - activeWord.start);
    const progress = Math.min(1, (wordElapsed / wordDuration) * speedMult);

    const isRepeated = words.slice(0, activeIdx).some((w) => w.text === activeWord.text);
    if (isRepeated && custom.showRepetitionBadge) {
      ctx.save();
      ctx.font = `600 24px ${fontName}`;
      ctx.fillStyle = "rgba(255, 232, 133, 0.9)";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.fillText("إعادة تلاوة", W / 2, boxY - 16);
      ctx.restore();
    }

    ctx.save();

    let textToDraw = pairText;
    let currentScale = 1.04;
    let currentOffsetY = 0;
    let currentAlpha = 1.0;
    let currentShadowBlur = 34;

    if (custom.wordAnimation === "typewriter") {
      if (activeIdx === pairStartIdx) {
        const charCount = Math.max(1, Math.ceil(progress * w1.text.length));
        textToDraw = w1.text.slice(0, charCount);
      } else if (w2) {
        const charCount = Math.max(1, Math.ceil(progress * w2.text.length));
        textToDraw = `${w1.text} ${w2.text.slice(0, charCount)}`;
      }
    } else if (custom.wordAnimation === "pop_bounce") {
      const spring = progress < 0.35
        ? 0.8 + 0.45 * (progress / 0.35)
        : 1.25 - 0.2 * ((progress - 0.35) / 0.65);
      currentScale *= spring;
      currentShadowBlur = 44;
    } else if (custom.wordAnimation === "shimmer_gold") {
      const shimmerOffset = (progress * 2 - 1) * 160;
      const grad = ctx.createLinearGradient(W / 2 + shimmerOffset - 100, centerY, W / 2 + shimmerOffset + 100, centerY);
      grad.addColorStop(0, "#FFE97A");
      grad.addColorStop(0.5, "#FFFFFF");
      grad.addColorStop(1, "#FFE97A");
      ctx.fillStyle = grad;
      currentShadowBlur = 36 + 22 * Math.sin(progress * Math.PI);
    } else if (custom.wordAnimation === "flip_reveal") {
      const flipPhase = Math.min(1, progress * 1.6);
      const scaleY = flipPhase < 0.5 ? 1 - flipPhase * 2 : (flipPhase - 0.5) * 2;
      ctx.translate(W / 2, centerY);
      ctx.scale(1, Math.max(0.08, scaleY));
      ctx.translate(-W / 2, -centerY);
      currentShadowBlur = 40;
    } else if (custom.wordAnimation === "glow_pulse") {
      currentShadowBlur = 20 + 32 * Math.sin(progress * Math.PI);
    } else if (custom.wordAnimation === "fade_slide_up") {
      currentOffsetY = (1 - Math.min(1, progress * 2.2)) * 22;
      currentAlpha = Math.min(1, progress * 2.8);
    } else if (custom.wordAnimation === "cinematic_zoom") {
      currentScale *= (0.94 + 0.12 * progress);
    }

    ctx.globalAlpha = currentAlpha;
    ctx.font = `700 ${fontSize * currentScale}px ${fontName}`;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = currentShadowBlur;
    if (custom.wordAnimation !== "shimmer_gold") {
      ctx.fillStyle = "#FFE97A";
    }
    ctx.fillText(textToDraw, W / 2, centerY + currentOffsetY);

    if (custom.wordAnimation === "typewriter" && progress < 0.98 && custom.cursorStyle !== "none") {
      const typedWidth = ctx.measureText(textToDraw).width;
      const curX = W / 2 - typedWidth / 2 - 8;
      ctx.beginPath();
      ctx.arc(curX, centerY + currentOffsetY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFE885";
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.font = `400 ${fontSize * 0.68}px ${fontName}`;
    ctx.fillStyle = "rgba(235, 185, 75, 0.75)";
    const pairWidth = ctx.measureText(pairText).width;
    ctx.fillText("﴿", W / 2 + pairWidth / 2 + 42, centerY);
    ctx.fillText("﴾", W / 2 - pairWidth / 2 - 42, centerY);
    ctx.restore();
    return;
  }

  /* MODE 3: PHRASE (Rhythmic Stanzas per Ayah / Breath) */
  if (custom.wordMode === "phrase") {
    const activeWord = words[activeIdx];
    let phraseWords = words;
    if (activeWord && activeWord.ayah) {
      phraseWords = words.filter((w) => w.ayah === activeWord.ayah);
    } else {
      const curRun = speechRuns.find((r) => time >= r.start && time <= r.end);
      if (curRun) {
        phraseWords = words.filter((w) => w.end >= curRun.start && w.start <= curRun.end);
      }
    }
    if (phraseWords.length === 0) phraseWords = words;

    // Rhythmic stanza chunking for long verses / passages
    const stanzaSize = Math.max(5, Math.min(10, custom.wordsPerStanza || 7));
    let displayWords: { text: string; start: number; end: number; origIdx: number }[];

    if (phraseWords.length > stanzaSize + 1) {
      let localIdx = phraseWords.findIndex((pw) => pw === activeWord);
      if (localIdx === -1) localIdx = 0;
      const stanzaIdx = Math.floor(Math.max(0, localIdx) / stanzaSize);
      const start = stanzaIdx * stanzaSize;
      const end = Math.min(phraseWords.length, start + stanzaSize);
      displayWords = phraseWords.slice(start, end).map((w) => ({
        ...w,
        origIdx: words.indexOf(w),
      }));
    } else {
      displayWords = phraseWords.map((w) => ({
        ...w,
        origIdx: words.indexOf(w),
      }));
    }

    renderTextLinesCentered(
      ctx,
      displayWords,
      activeIdx,
      isInSpeech,
      W / 2,
      centerY,
      boxW * 0.9,
      fontSize,
      fontSize * 1.5,
      glowColor,
      time,
      custom,
      result,
    );
    return;
  }

  /* MODE 4: FULL AYAH (Rhythmic Stanza Sliding Window) */
  const stanzaSize = Math.max(5, Math.min(10, custom.wordsPerStanza || 7));
  let displayWords: { text: string; start: number; end: number; origIdx: number }[];

  if (words.length > stanzaSize + 1) {
    const safeIdx = Math.max(0, activeIdx);
    const stanzaIdx = Math.floor(safeIdx / stanzaSize);
    const start = stanzaIdx * stanzaSize;
    const end = Math.min(words.length, start + stanzaSize);
    displayWords = words.slice(start, end).map((w) => ({
      ...w,
      origIdx: words.indexOf(w),
    }));
  } else {
    displayWords = words.map((w, idx) => ({
      ...w,
      origIdx: idx,
    }));
  }

  renderTextLinesCentered(
    ctx,
    displayWords,
    activeIdx,
    isInSpeech,
    W / 2,
    centerY,
    boxW * 0.9,
    fontSize,
    fontSize * 1.45,
    glowColor,
    time,
    custom,
    result,
  );
}

function renderTextLinesCentered(
  ctx: CanvasRenderingContext2D,
  words: { text: string; start: number; end: number; origIdx?: number }[],
  activeIdx: number,
  isInSpeech: boolean,
  cx: number,
  cy: number,
  maxW: number,
  fontSize: number,
  lineHeight: number,
  glowColor: string,
  time: number,
  custom: Customization,
  _result?: DetectionResult,
) {
  const fontName =
    custom.fontFamily === "cairo"
      ? "'Cairo', sans-serif"
      : custom.fontFamily === "uthmani"
        ? "'Amiri Quran', 'Amiri', serif"
        : "'Amiri', serif";
  const speedMult = custom.animationSpeed === "fast" ? 1.45 : custom.animationSpeed === "smooth" ? 0.8 : 1.0;

  ctx.save();
  ctx.font = `700 ${fontSize}px ${fontName}`;
  ctx.direction = "rtl";

  const lines: { wordIdx: number; text: string; start: number; end: number }[][] = [];
  let curLine: { wordIdx: number; text: string; start: number; end: number }[] = [];
  let curW = 0;
  const spaceW = ctx.measureText(" ").width;

  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const wIdx = typeof w.origIdx === "number" ? w.origIdx : i;
    const wWidth = ctx.measureText(w.text).width;
    if (curW + wWidth > maxW && curLine.length > 0) {
      lines.push(curLine);
      curLine = [{ wordIdx: wIdx, text: w.text, start: w.start, end: w.end }];
      curW = wWidth + spaceW;
    } else {
      curLine.push({ wordIdx: wIdx, text: w.text, start: w.start, end: w.end });
      curW += wWidth + spaceW;
    }
  }
  if (curLine.length > 0) lines.push(curLine);

  const totalH = lines.length * lineHeight;
  const startY = cy - totalH / 2 + lineHeight / 2;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    const lineY = startY + li * lineHeight;

    let lineTotalW = 0;
    const widths: number[] = [];
    for (let wi = 0; wi < line.length; wi++) {
      const w = ctx.measureText(line[wi]!.text).width;
      widths.push(w);
      lineTotalW += w + (wi < line.length - 1 ? spaceW : 0);
    }

    let cursorX = cx + lineTotalW / 2;

    for (let wi = 0; wi < line.length; wi++) {
      const item = line[wi]!;
      const itemW = widths[wi]!;
      const isActive = item.wordIdx === activeIdx && isInSpeech;

      ctx.save();
      ctx.textAlign = "right";

      if (isActive) {
        const wordElapsed = Math.max(0, time - item.start);
        const wordDuration = Math.max(0.08, item.end - item.start);
        const progress = Math.min(1, (wordElapsed / wordDuration) * speedMult);

        let textToDraw = item.text;
        if (custom.wordAnimation === "typewriter") {
          const charCount = Math.max(1, Math.ceil(progress * item.text.length));
          textToDraw = item.text.slice(0, charCount);
        }

        let scale = 1.08;
        let slideY = lineY;
        let blur = 34;

        if (custom.wordAnimation === "pop_bounce") {
          const spring = progress < 0.35 ? 0.85 + 0.4 * (progress / 0.35) : 1.25 - 0.17 * ((progress - 0.35) / 0.65);
          scale = 1.0 * spring;
          blur = 46;
        } else if (custom.wordAnimation === "shimmer_gold") {
          const grad = ctx.createLinearGradient(cursorX - itemW, slideY, cursorX, slideY);
          grad.addColorStop(0, "#EBB94B");
          grad.addColorStop(0.5, "#FFF7D6");
          grad.addColorStop(1, "#EBB94B");
          ctx.fillStyle = grad;
          blur = 38;
        } else if (custom.wordAnimation === "flip_reveal") {
          const flipPhase = Math.min(1, progress * 1.6);
          const scaleY = flipPhase < 0.5 ? 1 - flipPhase * 2 : (flipPhase - 0.5) * 2;
          ctx.translate(cursorX - itemW / 2, slideY);
          ctx.scale(1, Math.max(0.08, scaleY));
          ctx.translate(-(cursorX - itemW / 2), -slideY);
          blur = 42;
        } else if (custom.wordAnimation === "glow_pulse") {
          blur = 20 + 34 * Math.sin(progress * Math.PI);
        } else if (custom.wordAnimation === "fade_slide_up") {
          slideY = lineY + (1 - Math.min(1, progress * 2.2)) * 14;
        } else if (custom.wordAnimation === "cinematic_zoom") {
          scale = 0.96 + 0.14 * progress;
        }

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = blur;
        if (custom.wordAnimation !== "shimmer_gold") {
          ctx.fillStyle = "#FFE885";
        }
        ctx.font = `700 ${fontSize * scale}px ${fontName}`;
        ctx.fillText(textToDraw, cursorX, slideY);

        if (custom.wordAnimation === "typewriter" && progress < 0.96 && custom.cursorStyle !== "none") {
          const typedW = ctx.measureText(textToDraw).width;
          const curX = cursorX - typedW - 5;
          const curY = slideY - 4;
          if (custom.cursorStyle === "golden_dot") {
            ctx.beginPath();
            ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#FFE885";
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 10;
            ctx.fill();
          } else if (custom.cursorStyle === "sparkle_star") {
            ctx.font = "20px serif";
            ctx.fillStyle = "#FFE885";
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 10;
            ctx.fillText("✦", curX, curY + 6);
          } else if (custom.cursorStyle === "pulsing_ring") {
            const r = 3 + 3 * Math.abs(Math.sin(time * 8));
            ctx.beginPath();
            ctx.arc(curX, curY, r, 0, Math.PI * 2);
            ctx.strokeStyle = "#FFE885";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }
      } else {
        const isPast = activeIdx !== -1 && item.wordIdx < activeIdx;
        ctx.shadowBlur = 0;
        ctx.fillStyle = isPast ? "rgba(255, 245, 220, 0.85)" : "rgba(230, 220, 200, 0.45)";
        ctx.font = `700 ${fontSize}px ${fontName}`;
        ctx.fillText(item.text, cursorX, lineY);
      }

      ctx.restore();
      cursorX -= itemW + spaceW;
    }
  }

  ctx.restore();
}

/* ------------------------------------------------ WAVEFORM VISUALIZER */

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isInSpeech: boolean,
  time: number,
  glowColor: string,
) {
  const bars = 30;
  const barW = 6;
  const gap = 8;
  const totalW = bars * (barW + gap) - gap;
  const startX = cx - totalW / 2;

  ctx.save();

  for (let i = 0; i < bars; i++) {
    const x = startX + i * (barW + gap);
    const distFromCenter = 1 - Math.abs((i - (bars - 1) / 2) / ((bars - 1) / 2));

    let barH = 6;
    if (isInSpeech) {
      const wave = Math.sin(time * 8.5 + i * 0.45) * 0.35 + 0.65;
      barH = Math.max(6, Math.min(84, 90 * distFromCenter * wave));
    } else {
      barH = 4 + Math.sin(time * 2 + i * 0.3) * 1.8;
    }

    const y = cy - barH / 2;
    ctx.fillStyle = isInSpeech ? "rgba(43, 127, 255, 0.85)" : "rgba(43, 127, 255, 0.22)";

    if (isInSpeech && distFromCenter > 0.3) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    roundRect(ctx, x, y, barW, barH, 3);
    ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------ TRANSLATION */

function drawTranslation(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxW: number,
  text: string,
) {
  ctx.save();
  ctx.font = "400 28px 'Inter', sans-serif";
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(210, 220, 240, 0.65)";

  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);

  const lineHeight = 38;
  const startY = cy - (lines.length * lineHeight) / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, cx, startY + i * lineHeight);
  }

  ctx.restore();
}

/* ------------------------------------------------ PROGRESS BAR */

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (progress > 0) {
    ctx.fillStyle = "rgba(43, 127, 255, 0.85)";
    roundRect(ctx, x, y, w * progress, h, h / 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------ UI SUB-COMPONENTS */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 20,
        padding: "22px 24px",
        boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      style={{
        background: "#E2E8F0",
        borderRadius: 8,
        height: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: "linear-gradient(90deg, #D4AF37, #F59E0B)",
          borderRadius: 8,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "radial-gradient(circle at center, #FFFFFF 0%, #FAF8F5 55%, #F1EBDD 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        direction: "rtl",
        fontFamily: "'Cairo', 'Amiri', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", padding: "28px 24px", maxWidth: 440 }}>
        {/* Golden Rosette SVG */}
        <div style={{ width: 88, height: 88, margin: "0 auto 20px" }}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
            <circle cx="50" cy="50" r="46" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            <circle cx="50" cy="50" r="38" stroke="#B8860B" strokeWidth="1" opacity="0.4" />
            <rect x="25" y="25" width="50" height="50" rx="8" transform="rotate(45 50 50)" fill="rgba(212,175,55,0.08)" stroke="#D4AF37" strokeWidth="2" />
            <rect x="25" y="25" width="50" height="50" rx="8" fill="rgba(212,175,55,0.08)" stroke="#D4AF37" strokeWidth="2" />
            <circle cx="50" cy="50" r="16" fill="#D4AF37" />
            <circle cx="50" cy="50" r="13" fill="#FFFDF7" />
            <circle cx="50" cy="50" r="8" fill="#B8860B" />
          </svg>
        </div>

        <div style={{ fontSize: 24, color: "#854D0E", fontFamily: "'Amiri', serif", marginBottom: 12, fontWeight: 700, letterSpacing: "0.02em" }}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>

        <h1 style={{ fontSize: 34, fontWeight: 900, color: "#0F172A", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          رِوَايَة
        </h1>
        <p style={{ fontSize: 15, color: "#64748B", margin: "0 0 24px", fontWeight: 600 }}>
          مُصمّم مقاطع وتلاوات القرآن الكريم
        </p>

        {/* Golden loading bar */}
        <div style={{ width: 140, height: 5, background: "#E2E8F0", borderRadius: 99, margin: "0 auto", overflow: "hidden" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(90deg, #D4AF37, #F59E0B)",
              borderRadius: 99,
              animation: "splashLoad 1.2s ease-in-out infinite",
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 16 }}>
          انقر للمتابعة الفورية
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  show,
  onClose,
  riwayah,
  onRiwayahChange,
  fontFamily,
  onFontChange,
  showBismillah,
  onToggleBismillah,
  showWaveform,
  onToggleWaveform,
  exportQuality,
  onExportQualityChange,
}: {
  show: boolean;
  onClose: () => void;
  riwayah: Riwayah;
  onRiwayahChange: (r: Riwayah) => void;
  fontFamily: string;
  onFontChange: (f: "uthmani" | "amiri" | "cairo") => void;
  showBismillah: boolean;
  onToggleBismillah: (v: boolean) => void;
  showWaveform: boolean;
  onToggleWaveform: (v: boolean) => void;
  exportQuality: "1080p" | "720p";
  onExportQualityChange: (q: "1080p" | "720p") => void;
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: "24px 26px",
          direction: "rtl",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'Cairo', 'Amiri', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #F1F5F9", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEF9C3", color: "#854D0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconSettings size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0F172A" }}>
                إعدادات التطبيق (Paramètres)
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>
                تخصيص الرواية، الجودة، والمظهر الافتراضي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F1F5F9", border: "none", color: "#64748B", cursor: "pointer", borderRadius: 8, padding: 6, display: "flex" }}
          >
            <IconX size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Default Riwayah */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
              الرواية الشريفة المعتمدة:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "hafs" as Riwayah, label: "حفص عن عاصم", desc: "مصحف المدينة" },
                { id: "warsh" as Riwayah, label: "ورش عن نافع", desc: "المصحف المغاربي" },
              ].map((r) => {
                const active = riwayah === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRiwayahChange(r.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                      background: active ? "#FEFDF7" : "#FFFFFF",
                      textAlign: "right",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Quality */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
              دقة تصدير الفيديو:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "1080p" as const, label: "1080p Full HD", desc: "جودة احترافية كاملة" },
                { id: "720p" as const, label: "720p HD", desc: "تصدير سريع خفيف" },
              ].map((q) => {
                const active = exportQuality === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onExportQualityChange(q.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                      background: active ? "#FEFDF7" : "#FFFFFF",
                      textAlign: "right",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#854D0E" : "#1E293B" }}>
                      {q.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{q.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Quranic Font */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
              نوع الخط القرآني الافتراضي:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                { id: "uthmani" as const, label: "مصحف المدينة" },
                { id: "amiri" as const, label: "الخط الأميري" },
                { id: "cairo" as const, label: "خط كايرو" },
              ].map((f) => {
                const active = fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFontChange(f.id)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 10,
                      border: active ? "2px solid #D4AF37" : "1px solid #E2E8F0",
                      background: active ? "#FEFDF7" : "#FFFFFF",
                      fontSize: 12,
                      fontWeight: 700,
                      color: active ? "#854D0E" : "#334155",
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                إظهار البسملة الشريفة في مطلع المقاطع
              </span>
              <input
                type="checkbox"
                checked={showBismillah}
                onChange={(e) => onToggleBismillah(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#D4AF37", cursor: "pointer" }}
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                إظهار رسم الموجة الصوتية الحية
              </span>
              <input
                type="checkbox"
                checked={showWaveform}
                onChange={(e) => onToggleWaveform(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#D4AF37", cursor: "pointer" }}
              />
            </label>
          </div>

          {/* App Info Card */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px", marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
              تطبيق رِوَايَة لمقاطع القرآن الكريم v2.5
            </div>
            <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.6 }}>
              محرك صوتي مستقل تماماً يعمل داخل المتصفح بنسبة 100% لمطابقة التلاوة التجويدية دون حفظ أو إرسال الصوت لأي جهة خارجية.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={onClose} style={primaryBtn}>
            حفظ وإغلاق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ STYLES */

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "12px 20px",
  background: "linear-gradient(135deg, #D4AF37 0%, #C59B27 100%)",
  border: "none",
  borderRadius: 12,
  color: "#1A1300",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  direction: "rtl",
  transition: "all 0.15s ease",
  boxShadow: "0 4px 14px rgba(212, 175, 55, 0.28)",
  fontFamily: "'Cairo', sans-serif",
};

const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
  color: "#FFFFFF",
  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  color: "#1E293B",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  direction: "rtl",
  transition: "all 0.15s ease",
  fontFamily: "'Cairo', sans-serif",
};

const goldBadge: React.CSSProperties = {
  background: "#FEF9C3",
  border: "1px solid #FDE047",
  color: "#854D0E",
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  direction: "rtl",
  fontFamily: "'Cairo', sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  color: "#0F172A",
  fontSize: 14,
  outline: "none",
  direction: "rtl",
  fontFamily: "'Cairo', sans-serif",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};
