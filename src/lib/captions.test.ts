import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  buildCueText,
  cuesToSrt,
  cuesToVtt,
  detectDirection,
  enforceMinimumDurations,
  formatSrtTime,
  formatVttTime,
  groupWordsIntoCues,
  isFiller,
  stripPunctuation,
} from "./captions";
import type { Word } from "./types";

function wordsFrom(script: [string, number, number][], deleted: string[] = []): Word[] {
  return script.map(([text, start, end], index) => ({
    id: `w${index}`,
    text,
    start,
    end,
    deleted: deleted.includes(text),
  }));
}

const darja: [string, number, number][] = [
  ["الحمد", 0.4, 0.9],
  ["لله،", 0.95, 1.4],
  ["اليوم", 1.45, 2.0],
  ["نشرحو", 2.05, 2.7],
  ["كيفاش", 2.75, 3.3],
  ["نقصّو", 3.35, 3.9],
  ["فيديو", 3.95, 4.5],
  ["بكلمة", 4.55, 5.1],
  ["وحدة.", 5.15, 5.7],
];

describe("filler detection", () => {
  it("recognises Darja, French and English fillers", () => {
    expect(isFiller("يعني")).toBe(true);
    expect(isFiller("euh")).toBe(true);
    expect(isFiller("um")).toBe(true);
  });

  it("ignores real words", () => {
    expect(isFiller("نشرحو")).toBe(false);
    expect(isFiller("video")).toBe(false);
  });

  it("strips punctuation before testing", () => {
    expect(isFiller("يعني،")).toBe(true);
  });
});

describe("stripPunctuation", () => {
  it("handles Arabic and Latin marks", () => {
    expect(stripPunctuation("وحدة.")).toBe("وحدة");
    expect(stripPunctuation("«Bonjour» !")).toBe("Bonjour");
  });
});

describe("cue grouping", () => {
  it("groups words into cues bounded by the line budget", () => {
    const cues = groupWordsIntoCues(wordsFrom(darja), DEFAULT_RULES);
    expect(cues.length).toBeGreaterThan(1);
    for (const cue of cues) {
      expect(cue.words.length).toBeLessThanOrEqual(
        DEFAULT_RULES.maxWordsPerLine * DEFAULT_RULES.maxLines,
      );
    }
  });

  it("ignores deleted words", () => {
    const cues = groupWordsIntoCues(wordsFrom(darja, ["نشرحو"]), DEFAULT_RULES);
    const flat = cues.flatMap((cue) => cue.words.map((word) => word.text));
    expect(flat).not.toContain("نشرحو");
  });

  it("breaks on long pauses when asked", () => {
    const words = wordsFrom([
      ["un", 0, 0.4],
      ["deux", 0.45, 0.8],
      ["trois", 2.6, 3.0],
    ]);
    const cues = groupWordsIntoCues(words, { ...DEFAULT_RULES, respectPauses: true });
    expect(cues).toHaveLength(2);
  });

  it("keeps a single cue when pauses are ignored", () => {
    const words = wordsFrom([
      ["un", 0, 0.4],
      ["deux", 0.45, 0.8],
      ["trois", 2.6, 3.0],
    ]);
    const cues = groupWordsIntoCues(words, { ...DEFAULT_RULES, respectPauses: false, maxDurationMs: 10_000 });
    expect(cues).toHaveLength(1);
  });

  it("breaks when a cue would run too long", () => {
    const words = wordsFrom([
      ["a", 0, 1],
      ["b", 1.1, 2.2],
      ["c", 2.3, 3.4],
      ["d", 3.5, 4.6],
    ]);
    const cues = groupWordsIntoCues(words, {
      ...DEFAULT_RULES,
      respectPauses: false,
      maxDurationMs: 2300,
      maxWordsPerLine: 4,
      maxLines: 2,
    });
    expect(cues.length).toBeGreaterThan(1);
  });

  it("preserves chronological order", () => {
    const cues = groupWordsIntoCues(wordsFrom(darja), DEFAULT_RULES);
    for (let index = 1; index < cues.length; index += 1) {
      expect(cues[index]!.start).toBeGreaterThanOrEqual(cues[index - 1]!.end - 0.001);
    }
  });

  it("handles an empty transcript", () => {
    expect(groupWordsIntoCues([], DEFAULT_RULES)).toEqual([]);
  });

  it("drops zero-length words", () => {
    const cues = groupWordsIntoCues([{ id: "z", text: "x", start: 1, end: 1 }], DEFAULT_RULES);
    expect(cues).toEqual([]);
  });
});

describe("minimum cue duration", () => {
  it("extends a too-short cue but never past the next one", () => {
    const cues = enforceMinimumDurations(
      [
        { id: "a", start: 0, end: 0.2, words: [], text: "a" },
        { id: "b", start: 0.5, end: 1.4, words: [], text: "b" },
      ],
      700,
    );
    expect(cues[0]!.end).toBeCloseTo(0.5);
  });

  it("leaves long enough cues alone", () => {
    const cues = enforceMinimumDurations([{ id: "a", start: 0, end: 2, words: [], text: "a" }], 700);
    expect(cues[0]!.end).toBe(2);
  });
});

describe("cue text", () => {
  it("wraps on the words-per-line budget", () => {
    const text = buildCueText(wordsFrom(darja).slice(0, 6), {
      ...DEFAULT_RULES,
      maxWordsPerLine: 3,
    });
    expect(text.split("\n")).toHaveLength(2);
  });

  it("removes fillers without emptying the cue", () => {
    const words = wordsFrom([["يعني", 0, 0.3], ["هذا", 0.35, 0.8]]);
    expect(buildCueText(words, { ...DEFAULT_RULES, removeFillers: true })).toBe("هذا");
  });

  it("keeps the raw text when every word is a filler", () => {
    const words = wordsFrom([["يعني", 0, 0.3]]);
    expect(buildCueText(words, { ...DEFAULT_RULES, removeFillers: true })).toBe("يعني");
  });

  it("adds punctuation stripping when disabled", () => {
    const text = buildCueText(wordsFrom([["وحدة.", 0, 0.5]]), {
      ...DEFAULT_RULES,
      punctuation: false,
    });
    expect(text).toBe("وحدة");
  });

  it("capitalises Latin text on request", () => {
    const text = buildCueText(wordsFrom([["bonjour", 0, 0.5]]), {
      ...DEFAULT_RULES,
      capitalize: true,
    });
    expect(text).toBe("Bonjour");
  });
});

describe("serialisers", () => {
  const cues = groupWordsIntoCues(wordsFrom(darja), DEFAULT_RULES);

  it("formats SRT timestamps with a comma", () => {
    expect(formatSrtTime(3725.456)).toBe("01:02:05,456");
    expect(formatVttTime(3725.456)).toBe("01:02:05.456");
  });

  it("writes a numbered SRT block per cue", () => {
    const srt = cuesToSrt(cues);
    expect(srt.startsWith("1\n")).toBe(true);
    expect(srt).toContain("-->");
    expect(srt.match(/-->/g)?.length).toBe(cues.length);
  });

  it("writes a VTT header and RTL settings", () => {
    const vtt = cuesToVtt(cues, { direction: "rtl" });
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("direction:rtl");
  });

  it("omits RTL settings for Latin cues", () => {
    const vtt = cuesToVtt(cues, { direction: "ltr" });
    expect(vtt).not.toContain("direction:rtl");
  });
});

describe("direction detection", () => {
  it("detects Arabic", () => {
    expect(detectDirection("الحمد لله")).toBe("rtl");
  });

  it("detects Latin", () => {
    expect(detectDirection("Bonjour tout le monde")).toBe("ltr");
  });

  it("handles mixed text by majority", () => {
    expect(detectDirection("الحمد لله رب العالمين okay")).toBe("rtl");
    expect(detectDirection("today we cut a video الحمد")).toBe("ltr");
  });

  it("defaults to LTR for empty text", () => {
    expect(detectDirection("")).toBe("ltr");
  });
});
