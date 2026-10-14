import { matchAyah, requiresReview, type IndexedAyah } from "./normalize";

export type TimedWord = { id: string; text: string; start: number; end: number };

export type DetectedAyah = {
  /** `surah:ayah`, stable across runs. */
  id: string;
  surah: number;
  ayah: number;
  /** Dice/LCS similarity against the canonical text, 0–1. */
  score: number;
  /** Fraction of the ayah's own tokens that the recitation actually contains. */
  coverage: number;
  confidence: number;
  reviewRequired: boolean;
  wordIds: string[];
  words: number;
  start: number;
  end: number;
  /** The transcript text that produced this match, for the review UI. */
  heard: string;
};

export type DetectOptions = {
  /** Shortest transcript window to test, in words. */
  minWords?: number;
  /** Longest transcript window to test, in words (longest ayah is 128 words). */
  maxWords?: number;
  /** Below this, a window is not considered a recitation at all. */
  minScore?: number;
  /** Stop after this many detections. */
  limit?: number;
};

/**
 * Finds Quran recitation inside a timed transcript.
 *
 * A recitation is not a fixed-length pattern, so we slide a growing window over
 * the words and ask the canonical matcher which ayah — if any — the window
 * sounds like. Windows never overlap in the result: a verse is reported once,
 * at the position where it scored best.
 *
 * This is deliberately the *only* way Quran text enters a project. Nothing is
 * spliced in from a hand-written list, so a low-confidence band means exactly
 * what it says: the transcript and the mushaf disagree and a human must look.
 */
export function detectAyahs(
  words: TimedWord[],
  index: IndexedAyah[],
  options: DetectOptions = {},
): DetectedAyah[] {
  const { minWords = 3, maxWords = 12, minScore = 0.7, limit = 200 } = options;
  if (words.length === 0 || index.length === 0) return [];

  const found: DetectedAyah[] = [];
  let cursor = 0;

  while (cursor < words.length && found.length < limit) {
    let best: DetectedAyah | undefined;

    for (let size = minWords; size <= maxWords && cursor + size <= words.length; size += 1) {
      const window = words.slice(cursor, cursor + size);
      const text = window.map((word) => word.text).join(" ");
      const [candidate] = matchAyah(text, index, { limit: 1, minScore });
      if (!candidate) continue;

      // A longer window is only accepted when it is at least as good: that is
      // what lets a multi-verse stretch resolve to the verse it belongs to.
      if (best && candidate.score < best.score - 0.0001) continue;

      const last = window[window.length - 1];
      const first = window[0];
      best = {
        id: candidate.id,
        surah: Number(candidate.id.split(":")[0]),
        ayah: Number(candidate.id.split(":")[1]),
        score: candidate.score,
        coverage: candidate.coverage,
        confidence: candidate.score,
        reviewRequired: requiresReview(candidate.score),
        wordIds: window.map((word) => word.id),
        words: size,
        start: first?.start ?? 0,
        end: last?.end ?? 0,
        heard: text,
      };
    }

    if (best) {
      found.push(best);
      cursor += best.words;
    } else {
      cursor += 1;
    }
  }

  return found;
}

/**
 * Groups detections into contiguous recitation runs so the UI can show "a
 * tilawa from 0:12 to 0:48" instead of only isolated verses.
 */
export function groupDetections(detections: DetectedAyah[]): DetectedAyah[][] {
  const groups: DetectedAyah[][] = [];
  for (const detection of detections) {
    const last = groups[groups.length - 1];
    const previous = last?.[last.length - 1];
    // Same surah and the next verse, with less than a two-second gap: one run.
    if (last && previous && previous.surah === detection.surah && detection.ayah === previous.ayah + 1 && detection.start - previous.end < 2) {
      last.push(detection);
    } else {
      groups.push([detection]);
    }
  }
  return groups;
}
