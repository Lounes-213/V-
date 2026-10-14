import type { CaptionRules, Word } from "./types";

export type Cue = {
  id: string;
  start: number;
  end: number;
  words: Word[];
  text: string;
  /** Set when the cue spans a speaker change. */
  speaker?: number;
};

export const DEFAULT_RULES: CaptionRules = {
  maxWordsPerLine: 3,
  maxLines: 2,
  minDurationMs: 700,
  maxDurationMs: 3200,
  autoSplit: true,
  removeFillers: true,
  respectPauses: true,
  punctuation: true,
  capitalize: false,
  displayMode: "sentence",
};

/** Fillers that survive transcription and hurt retention. Arabic, Darja, French, English. */
export const FILLER_WORDS = new Set([
  "اه",
  "ايه",
  "امم",
  "اممم",
  "يعني",
  "زعما",
  "كيما",
  "وكيما",
  "euh",
  "ben",
  "bah",
  "um",
  "uh",
  "erm",
  "like",
  "voilà",
]);

export function isFiller(text: string): boolean {
  return FILLER_WORDS.has(stripPunctuation(text).trim().toLowerCase());
}

export function stripPunctuation(text: string): string {
  return text.replace(/[.,!?;:،؛؟…"'«»()\[\]{}—–-]+/g, "").trim();
}

const SENTENCE_END = /[.!?…؟،:;؛]$/;

/**
 * Groups words into caption cues.
 *
 * Reads left-to-right in *time*, not in text direction: the grouping rules are
 * script-agnostic, which is what keeps Arabic cues as tight as Latin ones.
 */
export function groupWordsIntoCues(
  words: Word[],
  rules: CaptionRules,
  pauseThresholdSec = 0.45,
): Cue[] {
  const usable = words
    .filter((word) => !word.deleted && word.end > word.start)
    .sort((a, b) => a.start - b.start);

  if (rules.displayMode === "word") {
    return usable.map((word) => ({
      id: `cue_${Math.round(word.start * 1000)}`,
      start: word.start,
      end: word.end,
      words: [word],
      text: rules.punctuation ? word.text : stripPunctuation(word.text),
      ...(word.speaker !== undefined ? { speaker: word.speaker } : {}),
    }));
  }

  const perCue = Math.max(1, rules.maxWordsPerLine * rules.maxLines);
  const cues: Cue[] = [];
  let bucket: Word[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    const first = bucket[0]!;
    const last = bucket[bucket.length - 1]!;
    const text = buildCueText(bucket, rules);
    const speaker = bucket[0]?.speaker;
    cues.push({
      id: `cue_${Math.round(first.start * 1000)}`,
      start: first.start,
      end: last.end,
      words: bucket,
      text,
      ...(speaker === undefined ? {} : { speaker }),
    });
    bucket = [];
  };

  for (const word of usable) {
    const previous = bucket[bucket.length - 1];

    if (previous) {
      const gap = word.start - previous.end;
      const projectedDuration = word.end - bucket[0]!.start;
      const breakOnPause = rules.respectPauses && gap >= pauseThresholdSec;
      const speakerChange = word.speaker !== previous.speaker;
      const breakOnLength = bucket.length >= perCue && rules.autoSplit;
      const breakOnSentence = rules.punctuation && SENTENCE_END.test(previous.text) && bucket.length >= 3;
      const breakOnDuration = rules.autoSplit && projectedDuration * 1000 > rules.maxDurationMs;

      if (breakOnPause || speakerChange || breakOnLength || breakOnSentence || breakOnDuration) {
        flush();
      }
    }

    bucket.push(word);
  }
  flush();

  return enforceMinimumDurations(cues, rules.minDurationMs);
}

/** Extends very short cues so a single word is still readable on screen. */
export function enforceMinimumDurations(cues: Cue[], minDurationMs: number): Cue[] {
  const min = minDurationMs / 1000;
  return cues.map((cue, index) => {
    if (cue.end - cue.start >= min) return cue;
    const next = cues[index + 1];
    const limit = next ? next.start : Number.POSITIVE_INFINITY;
    return { ...cue, end: Math.min(cue.start + min, limit) };
  });
}

export function buildCueText(words: Word[], rules: CaptionRules): string {
  const visible = rules.removeFillers ? words.filter((word) => !isFiller(word.text)) : words;
  const source = visible.length > 0 ? visible : words;
  const segments: string[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const raw = source[index]?.text ?? "";
    const text = rules.punctuation ? raw : stripPunctuation(raw);
    const isLineStart = index % rules.maxWordsPerLine === 0;
    const needsCasing = rules.capitalize && isLineStart && index === 0;
    const cased = needsCasing ? text.charAt(0).toUpperCase() + text.slice(1) : text;

    if (index > 0 && isLineStart) {
      // New line inside the same cue.
      segments.push("\n" + cased);
    } else {
      segments.push(index === 0 ? cased : ` ${cased}`);
    }
  }

  return segments.join("").trim();
}

/* ---------------------------------------------------------- serialisers -- */

function pad(value: number, size: number): string {
  return String(Math.floor(value)).padStart(size, "0");
}

/** SRT needs a comma before the milliseconds; the timeline never uses this format. */
export function formatSrtTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

export function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(",", ".");
}

export function cuesToSrt(cues: Cue[]): string {
  return cues
    .map((cue, index) => {
      const lines = cue.text.split("\n").join("\n");
      return `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${lines}\n`;
    })
    .join("\n");
}

export function cuesToVtt(cues: Cue[], options?: { direction?: "rtl" | "ltr"; align?: string }): string {
  const settings = [
    options?.direction === "rtl" ? "direction:rtl" : null,
    options?.align ?? "align:center",
    "line:82%",
  ]
    .filter(Boolean)
    .join(" ");
  const body = cues
    .map((cue, index) => {
      return `${index + 1}\n${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)} ${settings}\n${cue.text}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

/** Rough script detection so each caption block can carry its own direction. */
export function detectDirection(text: string): "rtl" | "ltr" {
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) ?? []).length;
  const latin = (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  return arabic > latin ? "rtl" : "ltr";
}

export function cueWordRanges(cues: Cue[]) {
  return cues.map((cue) => ({ id: cue.id, start: cue.start, end: cue.end }));
}
