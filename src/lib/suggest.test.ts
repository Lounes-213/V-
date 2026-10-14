import { describe, expect, it } from "vitest";
import { ideaUnits, measureWindow, suggestClips } from "./suggest";
import type { Word } from "./types";

/** Builds words at a given pace with optional pauses, mirroring real transcripts. */
function makeWords(
  specs: { text: string; duration?: number; pauseAfter?: number }[],
  startAt = 0,
): Word[] {
  const words: Word[] = [];
  let cursor = startAt;
  specs.forEach((spec, index) => {
    const duration = spec.duration ?? 0.4;
    words.push({
      id: `w${index}`,
      text: spec.text,
      start: Number(cursor.toFixed(3)),
      end: Number((cursor + duration).toFixed(3)),
    });
    cursor += duration + (spec.pauseAfter ?? 0.06);
  });
  return words;
}

const sentence = (text: string, count = 8): { text: string; pauseAfter?: number }[] => {
  const chunk = text.split(" ").slice(0, count);
  return chunk.map((word, index) => ({
    text: index === chunk.length - 1 ? `${word}.` : word,
  }));
};

describe("ideaUnits", () => {
  it("breaks at sentence endings", () => {
    const words = makeWords([
      ...sentence("اليوم نشرحو كيفاش"),
      ...sentence("واش راك داير"),
    ]);
    expect(ideaUnits(words).length).toBe(2);
  });

  it("breaks at pauses long enough to hear", () => {
    const words = makeWords([
      { text: "بسم" },
      { text: "الله", pauseAfter: 1.2 },
      { text: "نبداو" },
    ]);
    expect(ideaUnits(words).length).toBe(2);
  });

  it("always covers the whole transcript", () => {
    const words = makeWords(sentence("كيفاش نقص فيديو بكلمة وحدة").map((entry) => ({ ...entry })));
    const units = ideaUnits(words);
    expect(units[0]?.[0]).toBe(0);
    expect(units[units.length - 1]?.[1]).toBe(words.length - 1);
  });

  it("handles an empty transcript", () => {
    expect(ideaUnits([])).toEqual([]);
  });
});

describe("measureWindow", () => {
  it("scores a direct question higher on hook than a flat statement", () => {
    const question = makeWords(sentence("كيفاش نقص فيديو بكلمة وحدة بلا مونتير"));
    const statement = makeWords(sentence("اليوم رحت للسوق وشريت خضرة وشحال"));

    const a = measureWindow(question, [0, question.length - 1]);
    const b = measureWindow(statement, [0, statement.length - 1]);
    expect(a!.hookScore).toBeGreaterThan(b!.hookScore);
  });

  it("penalises dead air in clarity", () => {
    const tight = makeWords(sentence("هذي جملة كاملة بلا توقف نهائيا هكا"));
    const gappy = makeWords([
      { text: "هذي" },
      { text: "جملة", pauseAfter: 2.4 },
      { text: "كاملة" },
      { text: "بلا" },
      { text: "توقف." },
    ]);

    const a = measureWindow(tight, [0, tight.length - 1]);
    const b = measureWindow(gappy, [0, gappy.length - 1]);
    expect(a!.clarityScore).toBeGreaterThan(b!.clarityScore);
    expect(b!.factors).toContain("containsDeadAir");
  });

  it("reports a stable pace metric", () => {
    const words = makeWords(
      Array.from({ length: 10 }, (_, index) => ({ text: index === 9 ? "خاطرة." : "كلمة" })),
    );
    const metrics = measureWindow(words, [0, words.length - 1]);
    expect(metrics!.wordCount).toBe(10);
    expect(metrics!.wordsPerSecond).toBeGreaterThan(1.5);
    expect(metrics!.wordsPerSecond).toBeLessThan(3.5);
  });

  it("returns nothing for an impossible window", () => {
    const words = makeWords(sentence("كلمة وحدة هنا"));
    expect(measureWindow(words, [3, 1])).toBeUndefined();
    expect(measureWindow([], [0, 0])).toBeUndefined();
  });
});

describe("suggestClips", () => {
  const transcript = makeWords([
    ...sentence("كيفاش تقص فيديو بكلمة وحدة بلا مونتير"),
    { text: "خاطرة", pauseAfter: 1.1 },
    ...sentence("اليوم نحكيو على التجربة تاعنا في الصورة"),
    { text: "خاطرة", pauseAfter: 1.1 },
    ...sentence("واش راك تستنى باش تبدا المشروع تاعك"),
  ]);

  it("returns suggestions ordered by time", () => {
    const suggestions = suggestClips(transcript);
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.slice(1).forEach((item, index) => {
      expect(item.start).toBeGreaterThanOrEqual(suggestions[index]!.start);
    });
  });

  it("never overlaps its own suggestions", () => {
    const suggestions = suggestClips(transcript, { count: 5 });
    for (let index = 1; index < suggestions.length; index += 1) {
      expect(suggestions[index]!.start).toBeGreaterThanOrEqual(suggestions[index - 1]!.end);
    }
  });

  it("quotes the real words as the draft script and links them by id", () => {
    const [first] = suggestClips(transcript);
    const slice = transcript.filter((word) => first!.wordIds.includes(word.id));
    expect(first!.draftScript).toBe(slice.map((word) => word.text).join(" "));
  });

  it("keeps scores inside 0–100 and rebuilds titles from the transcript", () => {
    for (const suggestion of suggestClips(transcript)) {
      expect(suggestion.hookScore).toBeGreaterThanOrEqual(0);
      expect(suggestion.hookScore).toBeLessThanOrEqual(100);
      expect(suggestion.clarityScore).toBeGreaterThanOrEqual(0);
      expect(suggestion.clarityScore).toBeLessThanOrEqual(100);
      expect(suggestion.title.length).toBeGreaterThan(0);
      expect(suggestion.factors?.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    expect(suggestClips(transcript)).toEqual(suggestClips(transcript));
  });

  it("tightens or widens windows with the minimum length", () => {
    const few = suggestClips(transcript, { minSeconds: 30, count: 12 });
    const many = suggestClips(transcript, { minSeconds: 1, count: 12 });
    expect(many.length).toBeGreaterThanOrEqual(few.length);
    expect(suggestClips(transcript, { count: 2 }).length).toBeLessThanOrEqual(2);
  });

  it("offers the whole transcript when nothing is long enough to stand alone", () => {
    const suggestions = suggestClips(transcript, { minSeconds: 600 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.wordIds.length).toBe(transcript.length);
  });

  it("ignores deleted words", () => {
    const withCut = transcript.map((word, index) => (index < 4 ? { ...word, deleted: true } : word));
    const suggestions = suggestClips(withCut);
    for (const suggestion of suggestions) {
      const first = withCut.find((word) => word.id === suggestion.wordIds[0]);
      expect(first?.deleted).not.toBe(true);
    }
  });

  it("returns nothing for an empty transcript", () => {
    expect(suggestClips([])).toEqual([]);
  });
});
