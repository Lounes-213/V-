import type { Suggestion, Word } from "./types";

export type SuggestionFactor =
  | "opensWithQuestion"
  | "opensWithHook"
  | "completeThought"
  | "unfinishedEnding"
  | "tightLength"
  | "longForShortForm"
  | "calmPace"
  | "fastPace"
  | "noDeadAir"
  | "containsDeadAir";

/**
 * Deliberately measurable reasons, in the order they should be shown. The UI
 * localises these; `reason` is only a compact fallback for logs and exports.
 */
export type { Suggestion as ClipSuggestion };

export type SuggestOptions = {
  /** Ideal short-form length in seconds. */
  idealSeconds?: number;
  /** Windows shorter than this are not worth suggesting. */
  minSeconds?: number;
  /** Windows longer than this are split at the best sentence boundary. */
  maxSeconds?: number;
  /** How many suggestions to return. */
  count?: number;
  /** Gaps this long (seconds) count as dead air / a break between ideas. */
  pauseSeconds?: number;
};

const DEFAULTS: Required<SuggestOptions> = {
  idealSeconds: 24,
  minSeconds: 7,
  maxSeconds: 48,
  count: 4,
  pauseSeconds: 0.55,
};

/** Darja/arabic openings that actually stop a scroll when they come first. */
const HOOK_WORDS = new Set([
  "كيفاش",
  "علاش",
  "واش",
  "وين",
  "شحال",
  "شكون",
  "قداش",
  "ليش",
  "كيف",
  "هل",
  "شنو",
  "أول",
]);

const SENTENCE_END = /[.؟!?…؛:]["»)]?$/;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stripPunctuation(text: string): string {
  return text.replace(/^[«"'([]+/, "").replace(/[»"')،,.؟!?؛:…]+$/, "");
}

/**
 * Breaks a transcript into idea units at real boundaries: a sentence-ending mark
 * or a pause long enough to hear. Returns half-open index ranges.
 */
export function ideaUnits(words: Word[], pauseSeconds = DEFAULTS.pauseSeconds): [number, number][] {
  const units: [number, number][] = [];
  let start = 0;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if (!word) continue;
    const endsSentence = SENTENCE_END.test(word.text.trim());
    const longPause = next ? next.start - word.end >= pauseSeconds : true;
    if (endsSentence || longPause) {
      units.push([start, index]);
      start = index + 1;
    }
  }

  if (start < words.length) units.push([start, words.length - 1]);
  return units.filter(([from, to]) => to >= from);
}

/** Merges adjacent units until each window is long enough to be a clip. */
function windowUnits(
  words: Word[],
  units: [number, number][],
  minSeconds: number,
): [number, number][] {
  const windows: [number, number][] = [];
  let current: [number, number] | undefined;

  for (const unit of units) {
    current = current ? [current[0], unit[1]] : unit;
    const from = words[current[0]];
    const to = words[current[1]];
    const length = (to?.end ?? 0) - (from?.start ?? 0);
    if (length >= minSeconds) {
      windows.push(current);
      current = undefined;
    }
  }

  if (current) windows.push(current);

  // Nothing long enough to stand alone: the whole transcript is the only clip
  // there is, and offering it beats offering nothing.
  if (windows.length === 0 && units.length > 0) windows.push([units[0]![0], units[units.length - 1]![1]]);

  return windows;
}

/** Splits an over-long window at its most even sentence boundary. */
function splitLong(
  words: Word[],
  window: [number, number],
  units: [number, number][],
  maxSeconds: number,
): [number, number][] {
  const from = words[window[0]];
  const to = words[window[1]];
  if ((to?.end ?? 0) - (from?.start ?? 0) <= maxSeconds) return [window];

  const inner = units.filter((unit) => unit[0] > window[0] && unit[1] < window[1]);
  if (inner.length === 0) return [window];

  const midpoint = (((from?.start ?? 0) + (to?.end ?? 0)) / 2) as number;
  let best = inner[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const unit of inner) {
    const end = words[unit[1]]?.end ?? 0;
    const distance = Math.abs(end - midpoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = unit;
    }
  }

  return [
    ...splitLong(words, [window[0], best[1]], units, maxSeconds),
    ...splitLong(words, [best[1] + 1, window[1]], units, maxSeconds),
  ];
}

export type WindowMetrics = {
  start: number;
  end: number;
  durationSec: number;
  wordCount: number;
  wordsPerSecond: number;
  speechRatio: number;
  longestPause: number;
  hookScore: number;
  clarityScore: number;
  factors: SuggestionFactor[];
};

export function measureWindow(
  words: Word[],
  window: [number, number],
  options: SuggestOptions = {},
): WindowMetrics | undefined {
  const { idealSeconds, pauseSeconds } = { ...DEFAULTS, ...options };
  const slice = words.slice(window[0], window[1] + 1).filter((word) => !word.deleted);
  const first = slice[0];
  const last = slice[slice.length - 1];
  if (!first || !last) return undefined;

  const durationSec = Math.max(0, last.end - first.start);
  if (durationSec <= 0) return undefined;

  let speech = 0;
  let longestPause = 0;
  slice.forEach((word, index) => {
    const next = slice[index + 1];
    speech += Math.max(0, word.end - word.start);
    if (next) longestPause = Math.max(longestPause, next.start - word.end);
  });
  const speechRatio = clamp01(speech / durationSec);

  const wordCount = slice.length;
  const wordsPerSecond = wordCount / durationSec;

  const opening = stripPunctuation(first.text);
  const opensWithQuestion = /[؟?]$/.test(first.text.trim()) || slice.some((word) => /[؟?]$/.test(word.text.trim()));
  const opensWithHook = HOOK_WORDS.has(opening);
  const completeThought = SENTENCE_END.test(last.text.trim());

  const lengthFit = clamp01(1 - Math.abs(durationSec - idealSeconds) / idealSeconds);
  const paceFit = clamp01(1 - Math.abs(wordsPerSecond - 2.4) / 1.8);

  const hookScore = Math.round(
    100 *
      clamp01(
        0.42 * (opensWithQuestion ? 1 : opensWithHook ? 0.85 : 0.2) +
          0.34 * lengthFit +
          0.24 * (completeThought ? 1 : 0.35),
      ),
  );

  const clarityScore = Math.round(
    100 * clamp01(0.46 * lengthFit + 0.3 * speechRatio + 0.24 * paceFit),
  );

  const factors: SuggestionFactor[] = [];
  if (opensWithQuestion) factors.push("opensWithQuestion");
  else if (opensWithHook) factors.push("opensWithHook");
  factors.push(completeThought ? "completeThought" : "unfinishedEnding");
  if (durationSec <= idealSeconds * 1.35) factors.push("tightLength");
  else factors.push("longForShortForm");
  if (wordsPerSecond <= 2.9) factors.push("calmPace");
  else factors.push("fastPace");
  if (longestPause <= pauseSeconds) factors.push("noDeadAir");
  else factors.push("containsDeadAir");

  return {
    start: first.start,
    end: last.end,
    durationSec,
    wordCount,
    wordsPerSecond,
    speechRatio,
    longestPause,
    hookScore,
    clarityScore,
    factors,
  };
}

function titleFrom(words: Word[], window: [number, number]): string {
  const slice = words.slice(window[0], window[1] + 1);
  const text = slice
    .slice(0, 7)
    .map((word) => stripPunctuation(word.text))
    .filter(Boolean)
    .join(" ");
  return text || (slice[0]?.text ?? "");
}

/**
 * Suggests short-form clips from a transcript by measuring it — length, pace,
 * pauses and how the thought opens and closes. No model involved, so the same
 * transcript always yields the same candidate list, which is what makes the
 * feature testable and reviewable.
 */
export function suggestClips(words: Word[], options: SuggestOptions = {}): Suggestion[] {
  const settings = { ...DEFAULTS, ...options };
  const usable = words.filter((word) => !word.deleted);
  if (usable.length === 0) return [];

  const units = ideaUnits(usable, settings.pauseSeconds);
  const windows = windowUnits(usable, units, settings.minSeconds).flatMap((window) =>
    splitLong(usable, window, units, settings.maxSeconds),
  );

  const measured = windows
    .map((window) => ({ window, metrics: measureWindow(usable, window, settings) }))
    .filter((entry): entry is { window: [number, number]; metrics: WindowMetrics } => Boolean(entry.metrics));

  // Rank by combined quality, then take the best ones in time order.
  const ranked = [...measured].sort(
    (a, b) =>
      b.metrics.hookScore + b.metrics.clarityScore - (a.metrics.hookScore + a.metrics.clarityScore) ||
      b.metrics.durationSec - a.metrics.durationSec,
  );

  const selected: typeof ranked = [];
  for (const entry of ranked) {
    if (selected.length >= settings.count) break;
    const overlaps = selected.some(
      (other) => entry.metrics.start < other.metrics.end && other.metrics.start < entry.metrics.end,
    );
    if (!overlaps) selected.push(entry);
  }

  return selected
    .sort((a, b) => a.metrics.start - b.metrics.start)
    .map((entry, index) => {
      const slice = usable.slice(entry.window[0], entry.window[1] + 1);
      return {
        id: `sug-${index + 1}`,
        title: titleFrom(usable, entry.window),
        start: Number(entry.metrics.start.toFixed(3)),
        end: Number(entry.metrics.end.toFixed(3)),
        hookScore: entry.metrics.hookScore,
        clarityScore: entry.metrics.clarityScore,
        reason: `${entry.metrics.factors.join(" · ")}`,
        draftScript: slice.map((word) => word.text).join(" "),
        status: "new" as const,
        wordIds: slice.map((word) => word.id),
        factors: entry.metrics.factors,
      };
    });
}
