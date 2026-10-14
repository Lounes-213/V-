/**
 * Arabic normalisation + fuzzy matching for Quran Mode.
 *
 * Two jobs:
 *  1. make recitation text and canonical Uthmani text comparable (diacritics,
 *     alef/ya/ta-marbuta variants, tatweel, waqf marks);
 *  2. score how confident a match is, so the UI can demand human review below
 *     a threshold instead of guessing.
 */

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08E1]/g;
const TATWEEL = /\u0640/g;
// Digits are allowed through because numeral conversion runs first; keeping them
// out of the strip set is what makes "١٢٣" survive as "123".
const NON_ARABIC = /[^\u0621-\u064A0-9 ]/g;

export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, "").replace(TATWEEL, "");
}

export function normalizeArabic(text: string): string {
  return stripDiacritics(text)
    .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, "\u0627") // آ أ إ ا ٱ → ا
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0626/g, "\u064A") // ئ → ي
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)) // ٠-٩ → 0-9
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .replace(NON_ARABIC, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeArabic(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

export function bigrams(text: string): string[] {
  const normalized = normalizeArabic(text).replace(/ /g, "");
  if (normalized.length < 2) return normalized.length === 1 ? [normalized] : [];
  const result: string[] = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

export function trigrams(text: string): string[] {
  const normalized = normalizeArabic(text).replace(/ /g, "");
  const result: string[] = [];
  for (let index = 0; index < normalized.length - 2; index += 1) {
    result.push(normalized.slice(index, index + 3));
  }
  return result;
}

function diceCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return a.length === b.length ? 1 : 0;
  const counts = new Map<string, number>();
  for (const gram of a) counts.set(gram, (counts.get(gram) ?? 0) + 1);

  let overlap = 0;
  for (const gram of b) {
    const remaining = counts.get(gram) ?? 0;
    if (remaining > 0) {
      overlap += 1;
      counts.set(gram, remaining - 1);
    }
  }
  return (2 * overlap) / (a.length + b.length);
}

/**
 * Word-level F1 over the longest common subsequence. Recitation adds and drops
 * words (basmala, repeats, hesitations) so order matters more than exact length.
 */
export function wordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const row = table[i]!;
      const prevRow = table[i - 1]!;
      row[j] =
        a[i - 1] === b[j - 1]
          ? (prevRow[j - 1] ?? 0) + 1
          : Math.max(prevRow[j] ?? 0, row[j - 1] ?? 0);
    }
  }

  const lcs = table[a.length]?.[b.length] ?? 0;
  const precision = lcs / a.length;
  const recall = lcs / b.length;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

export type Similarity = {
  score: number;
  charScore: number;
  wordScore: number;
};

/** Blended similarity: character shape carries short verses, words carry long ones. */
export function similarity(a: string, b: string): Similarity {
  const charScore = 0.6 * diceCoefficient(trigrams(a), trigrams(b)) + 0.4 * diceCoefficient(bigrams(a), bigrams(b));
  const wordScore = wordOverlap(tokenize(a), tokenize(b));
  const tokens = Math.max(tokenize(a).length, tokenize(b).length);
  const weight = tokens <= 3 ? 0.35 : 0.55;
  return { score: (1 - weight) * charScore + weight * wordScore, charScore, wordScore };
}

/* ------------------------------------------------------------- indexing -- */

export type IndexedAyah = {
  id: string;
  surah: number;
  ayah: number;
  text: string;
  tokens: string[];
  grams: Set<string>;
};

export function indexAyahs(ayahs: { surah: number; ayah: number; text: string }[]): IndexedAyah[] {
  return ayahs.map((ayah) => ({
    id: `${ayah.surah}:${ayah.ayah}`,
    surah: ayah.surah,
    ayah: ayah.ayah,
    text: ayah.text,
    tokens: tokenize(ayah.text),
    grams: new Set(trigrams(ayah.text)),
  }));
}

export type MatchCandidate = {
  id: string;
  score: number;
  /** Fraction of the candidate's tokens present in the recitation. */
  coverage: number;
};

/**
 * Candidate retrieval by trigram overlap, then precise scoring.
 * Retrieval is what keeps a 6,236-verse corpus cheap to search on the client.
 */
export function matchAyah(
  recitation: string,
  index: IndexedAyah[],
  options: { limit?: number; minScore?: number } = {},
): MatchCandidate[] {
  const { limit = 5, minScore = 0.35 } = options;
  const probe = trigrams(recitation);
  const probeSet = new Set(probe);
  const recitationTokens = new Set(tokenize(recitation));

  const scored: MatchCandidate[] = [];
  for (const ayah of index) {
    let shared = 0;
    for (const gram of probeSet) if (ayah.grams.has(gram)) shared += 1;
    const retrieval = probeSet.size === 0 ? 0 : shared / probeSet.size;
    if (retrieval < 0.15) continue;

    const { score } = similarity(recitation, ayah.text);
    if (score < minScore) continue;

    const present = ayah.tokens.filter((token) => recitationTokens.has(token)).length;
    const coverage = ayah.tokens.length === 0 ? 0 : present / ayah.tokens.length;
    scored.push({ id: ayah.id, score, coverage });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type ConfidenceBand = "high" | "medium" | "low";

export const CONFIDENCE_THRESHOLDS = { high: 0.82, medium: 0.62 } as const;

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

/** Below this the UI refuses to export without an explicit human confirmation. */
export function requiresReview(score: number): boolean {
  return confidenceBand(score) !== "high";
}
