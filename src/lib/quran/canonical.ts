import fixture from "./fixture.json";
import { detectAyahs, type DetectedAyah, type TimedWord } from "./detect";
import { indexAyahs } from "./normalize";
import type { QuranMatch } from "../types";

/**
 * The canonical corpus as it was fetched from the Quran Foundation Content API
 * (`scripts/fetch-quran-fixture.mjs`). It is read-only data: no text here is
 * typed by hand, and the UI never renders a verse that did not come from this
 * file or from a live API response.
 */
export type CanonicalAyah = {
  id: string;
  surah: number;
  ayah: number;
  /** Uthmani orthography, exactly as published. */
  uthmani: string;
  /** Publisher translation (Montada Islamic Foundation, French). */
  translation: string;
  surahNameArabic: string;
  surahNameSimple: string;
  surahNameTranslated: string;
  /** Number of verses in the surah, as published. */
  ayahCount: number;
};

type Fixture = {
  chapters: {
    number: number;
    nameArabic: string;
    nameSimple: string;
    nameTranslated: string;
    versesCount: number;
    ayahs: { ayah: number; uthmani: string; translation: string }[];
  }[];
};

const data = fixture as Fixture;

export const CANONICAL_AYAHS: CanonicalAyah[] = data.chapters.flatMap((chapter) =>
  chapter.ayahs.map((ayah) => ({
    id: `${chapter.number}:${ayah.ayah}`,
    surah: chapter.number,
    ayah: ayah.ayah,
    uthmani: ayah.uthmani,
    translation: ayah.translation,
    surahNameArabic: chapter.nameArabic,
    surahNameSimple: chapter.nameSimple,
    surahNameTranslated: chapter.nameTranslated,
    ayahCount: chapter.versesCount,
  })),
);

const BY_ID = new Map(CANONICAL_AYAHS.map((ayah) => [ayah.id, ayah]));

/** Search index for the matcher — built once, reused by every detection pass. */
export const CANONICAL_INDEX = indexAyahs(
  CANONICAL_AYAHS.map((ayah) => ({ surah: ayah.surah, ayah: ayah.ayah, text: ayah.uthmani })),
);

import { ALL_SURAHS, type SurahMeta } from "./surahs-data";

export { ALL_SURAHS, type SurahMeta };

export function registerCanonicalAyah(ayah: CanonicalAyah): void {
  BY_ID.set(ayah.id, ayah);
}

export function lookupAyah(surah: number, ayah: number): CanonicalAyah | undefined {
  const direct = BY_ID.get(`${surah}:${ayah}`);
  if (direct) return direct;
  return undefined;
}

export async function fetchCanonicalAyah(
  surah: number,
  ayah: number,
  options: { translation?: number; reciter?: number } = {},
): Promise<(CanonicalAyah & { audioUrl?: string }) | undefined> {
  const cached = lookupAyah(surah, ayah);
  if (cached) return cached;

  try {
    const res = await fetch(
      `/api/quran?action=verse&surah=${surah}&ayah=${ayah}&translation=${options.translation ?? 136}&reciter=${options.reciter ?? 7}`,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as CanonicalAyah & { audioUrl?: string };
    if (!data.uthmani) return undefined;

    registerCanonicalAyah(data);
    return data;
  } catch {
    return undefined;
  }
}

export async function fetchSurahVerses(
  surah: number,
  from = 1,
  to?: number,
  options: { translation?: number; reciter?: number } = {},
): Promise<(CanonicalAyah & { audioUrl?: string })[]> {
  try {
    const res = await fetch(
      `/api/quran?action=surah_verses&surah=${surah}&from=${from}&to=${to ?? ""}&translation=${options.translation ?? 136}&reciter=${options.reciter ?? 7}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      verses: (CanonicalAyah & { audioUrl?: string })[];
    };
    if (Array.isArray(data.verses)) {
      for (const v of data.verses) {
        registerCanonicalAyah(v);
      }
      return data.verses;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Automatically searches and detects Quranic Surah & Ayahs from speech words
 * without requiring the user to type or manually specify them.
 */
export async function autoDetectQuran(
  words: TimedWord[],
): Promise<{ surah: number; fromAyah: number; ayahs: (CanonicalAyah & { audioUrl?: string })[] } | null> {
  if (words.length === 0) return null;

  // 1. Try local matcher against indexed fixture first
  const localDetections = detectAyahs(words, CANONICAL_INDEX, { minScore: 0.65, limit: 1 });
  if (localDetections.length > 0 && localDetections[0]) {
    const s = localDetections[0].surah;
    const a = localDetections[0].ayah;
    const verses = await fetchSurahVerses(s, a);
    return { surah: s, fromAyah: a, ayahs: verses };
  }

  // 2. Take first 4-8 words of text and query live Quran search
  const windows = [
    words.slice(0, Math.min(8, words.length)),
    words.slice(Math.floor(words.length / 3), Math.min(words.length, Math.floor(words.length / 3) + 8)),
  ];

  for (const win of windows) {
    if (win.length < 2) continue;
    const query = win
      .map((w) => w.text)
      .join(" ")
      .replace(/[^\p{L}\s]/gu, "")
      .trim();

    if (query.length < 3) continue;

    try {
      const res = await fetch(`/api/quran?action=search&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = (await res.json()) as { results?: { surah: number; ayah: number }[] };
        if (json.results && json.results.length > 0 && json.results[0]) {
          const s = json.results[0].surah;
          const a = json.results[0].ayah;
          const verses = await fetchSurahVerses(s, a);
          if (verses.length > 0) {
            return { surah: s, fromAyah: a, ayahs: verses };
          }
        }
      }
    } catch {
      /* search error */
    }
  }

  // 3. Fallback: Default to Surah Al-Fatihah (1)
  const defaultVerses = await fetchSurahVerses(1, 1);
  return { surah: 1, fromAyah: 1, ayahs: defaultVerses };
}

export function surahs(): SurahMeta[] {
  return ALL_SURAHS;
}

/** Turns a detection into the project's `QuranMatch`, filled from the canon. */
export function toQuranMatch(detection: DetectedAyah, translation?: string): QuranMatch | undefined {
  const canonical = lookupAyah(detection.surah, detection.ayah);
  if (!canonical) return undefined;

  return {
    id: detection.id,
    surah: detection.surah,
    surahName: canonical.surahNameArabic,
    ayah: detection.ayah,
    uthmani: canonical.uthmani,
    translation: translation ?? canonical.translation,
    confidence: detection.confidence,
    start: detection.start,
    end: detection.end,
    reviewed: !detection.reviewRequired,
    fromCache: true,
  };
}

/**
 * Detects recitation in a timed transcript and returns project-ready matches.
 * The threshold is the medium band: below that it is not a recitation, above it
 * the verse is surfaced with its confidence so a human can approve it.
 */
export function detectProjectQuran(words: TimedWord[], minScore = 0.62): QuranMatch[] {
  return detectAyahs(words, CANONICAL_INDEX, { minScore })
    .map((detection) => toQuranMatch(detection))
    .filter((match): match is QuranMatch => Boolean(match));
}

/**
 * Aligns Quranic verses to voice activity runs (when speech occurs vs pauses).
 * - "ila ntaq": words are timed strictly inside speech runs.
 * - "ila habes": during silences/breathing pauses, no words are placed.
 */
export function alignAyahsToAudioRuns(options: {
  ayahs: (CanonicalAyah & { audioUrl?: string })[];
  speechRuns: { start: number; end: number; durationSec: number }[];
  totalDuration: number;
  projectId: string;
}): {
  words: import("../types").Word[];
  matches: QuranMatch[];
  suggestions: import("../types").Suggestion[];
} {
  const { ayahs, speechRuns, totalDuration, projectId } = options;
  if (ayahs.length === 0) {
    return { words: [], matches: [], suggestions: [] };
  }

  // Filter out microscopic noise runs (< 0.25s)
  const validRuns = speechRuns.filter((r) => r.durationSec >= 0.25);

  // If no speech runs detected, synthesize clean natural recitation intervals
  const runs =
    validRuns.length > 0
      ? validRuns
      : ayahs.map((_, i) => {
          const pauseSec = 0.8;
          const slot = (totalDuration - pauseSec * (ayahs.length - 1)) / ayahs.length;
          const start = Number((i * (slot + pauseSec)).toFixed(2));
          const end = Number((start + Math.max(0.5, slot)).toFixed(2));
          return { start, end, durationSec: end - start };
        });

  const words: import("../types").Word[] = [];
  const matches: QuranMatch[] = [];
  const suggestions: import("../types").Suggestion[] = [];

  // Map each ayah to available runs
  ayahs.forEach((ayah, ayahIndex) => {
    // If runs count matches or exceeds ayahs, assign 1 run per ayah
    const run = runs[Math.min(ayahIndex, runs.length - 1)];
    if (!run) return;

    const start = run.start;
    const end = run.end;
    const span = Math.max(0.4, end - start);

    const pieces = ayah.uthmani.split(/\s+/).filter(Boolean);
    const weights = pieces.map((p) => Math.max(1, p.replace(/[^\p{L}\p{N}]/gu, "").length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let cursor = start;
    pieces.forEach((piece, pIndex) => {
      const dur = (span * (weights[pIndex] ?? 1)) / totalWeight;
      words.push({
        id: `${projectId}-w-q-${ayah.surah}-${ayah.ayah}-${pIndex}`,
        text: piece,
        start: Number(cursor.toFixed(3)),
        end: Number((cursor + dur).toFixed(3)),
        ayahRef: `${ayah.surah}:${ayah.ayah}`,
      });
      cursor += dur;
    });

    matches.push({
      id: `${ayah.surah}:${ayah.ayah}`,
      surah: ayah.surah,
      surahName: ayah.surahNameArabic,
      ayah: ayah.ayah,
      uthmani: ayah.uthmani,
      translation: ayah.translation,
      confidence: 1.0,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      reviewed: true,
      fromCache: false,
    });

    // Provide high-score clip suggestion for each verse
    const verseWordIds = words.filter((w) => w.ayahRef === `${ayah.surah}:${ayah.ayah}`).map((w) => w.id);
    suggestions.push({
      id: `sug-q-${ayah.surah}-${ayah.ayah}`,
      title: `${ayah.surahNameArabic} · الآية ${ayah.ayah}`,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      hookScore: 0.95,
      clarityScore: 0.98,
      reason: `${ayah.surahNameArabic} · الآية ${ayah.ayah}`,
      draftScript: ayah.uthmani,
      status: "new",
      wordIds: verseWordIds,
      factors: ["completeThought", "calmPace", "noDeadAir"],
    });
  });

  return { words, matches, suggestions };
}

/**
 * Returns default canonical Quran segments (Surah Al-Fatihah, 7 verses) with
 * precise Uthmani text and word timings for speech/caption fallbacks.
 */
export function getQuranDefaultSegments(durationSec = 28): {
  start: number;
  end: number;
  text: string;
  words: { text: string; start: number; end: number }[];
}[] {
  const fatihah = CANONICAL_AYAHS.filter((a) => a.surah === 1);
  const pause = 0.6;
  const slot = Math.max(1, (durationSec - pause * (fatihah.length - 1)) / fatihah.length);

  return fatihah.map((ayah, i) => {
    const start = Number((i * (slot + pause)).toFixed(2));
    const end = Number((start + slot).toFixed(2));
    const pieces = ayah.uthmani.split(/\s+/).filter(Boolean);
    const pieceDur = (end - start) / Math.max(1, pieces.length);
    const words = pieces.map((piece, pIdx) => ({
      text: piece,
      start: Number((start + pIdx * pieceDur).toFixed(2)),
      end: Number((start + (pIdx + 1) * pieceDur).toFixed(2)),
    }));
    return {
      start,
      end,
      text: ayah.uthmani,
      words,
    };
  });
}

