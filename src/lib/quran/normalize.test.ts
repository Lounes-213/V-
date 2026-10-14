import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_THRESHOLDS,
  bigrams,
  confidenceBand,
  indexAyahs,
  matchAyah,
  normalizeArabic,
  requiresReview,
  similarity,
  stripDiacritics,
  tokenize,
  trigrams,
  wordOverlap,
} from "./normalize";

// Canonical Uthmani text, copied from the Quran Foundation fixture (Al-Ikhlas).
const IKHLAS = [
  { surah: 112, ayah: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
  { surah: 112, ayah: 2, text: "ٱللَّهُ ٱلصَّمَدُ" },
  { surah: 112, ayah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
  { surah: 112, ayah: 4, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ" },
];

describe("normalisation", () => {
  it("removes diacritics", () => {
    expect(stripDiacritics("قُلْ هُوَ")).toBe("قل هو");
  });

  it("folds alef variants", () => {
    expect(normalizeArabic("أَحَد")).toBe("احد");
    expect(normalizeArabic("إله")).toBe("اله");
    expect(normalizeArabic("ٱللَّه")).toBe("الله");
  });

  it("folds ya, ta marbuta and waw hamza", () => {
    expect(normalizeArabic("مُوسَى")).toBe("موسي");
    expect(normalizeArabic("سُورَة")).toBe("سوره");
    expect(normalizeArabic("مُؤْمِن")).toBe("مومن");
  });

  it("removes tatweel and waqf marks", () => {
    expect(normalizeArabic("قـــال")).toBe("قال");
    expect(normalizeArabic("ۛ")).toBe("");
  });

  it("converts both Arabic digit sets", () => {
    expect(normalizeArabic("١٢٣")).toBe("123");
    expect(normalizeArabic("۱۲۳")).toBe("123");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeArabic("قُلْ، هُوَ!")).toBe("قل هو");
  });

  it("is idempotent", () => {
    const once = normalizeArabic(IKHLAS[0]!.text);
    expect(normalizeArabic(once)).toBe(once);
  });
});

describe("n-grams", () => {
  it("builds character bigrams ignoring spaces", () => {
    expect(bigrams("الله")).toHaveLength(3);
  });

  it("handles single-character and empty input", () => {
    expect(bigrams("ا")).toEqual(["ا"]);
    expect(bigrams("")).toEqual([]);
    expect(trigrams("ا")).toEqual([]);
  });

  it("builds trigrams", () => {
    expect(trigrams("الله")).toHaveLength(2);
  });
});

describe("tokenize", () => {
  it("splits normalised words", () => {
    expect(tokenize("قُلْ هُوَ ٱللَّهُ")).toEqual(["قل", "هو", "الله"]);
  });

  it("returns nothing for empty text", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("word overlap", () => {
  it("scores identical sequences as 1", () => {
    expect(wordOverlap(["a", "b", "c"], ["a", "b", "c"])).toBeCloseTo(1);
  });

  it("tolerates insertions", () => {
    expect(wordOverlap(["a", "b", "c"], ["a", "x", "b", "c"])).toBeGreaterThan(0.7);
  });

  it("is zero when nothing is shared", () => {
    expect(wordOverlap(["a", "b"], ["x", "y"])).toBe(0);
  });

  it("is zero for empty input", () => {
    expect(wordOverlap([], ["a"])).toBe(0);
    expect(wordOverlap(["a"], [])).toBe(0);
  });
});

describe("similarity", () => {
  it("scores an exact match highest", () => {
    const exact = similarity(IKHLAS[1]!.text, IKHLAS[1]!.text).score;
    expect(exact).toBeCloseTo(1);
  });

  it("scores a diacritic-free recitation very high", () => {
    const { score } = similarity("الله الصمد", IKHLAS[1]!.text);
    expect(score).toBeGreaterThan(CONFIDENCE_THRESHOLDS.high);
  });

  it("scores an unrelated verse low", () => {
    const { score } = similarity("اليوم نشرحو كيفاش نقصو فيديو", IKHLAS[1]!.text);
    expect(score).toBeLessThan(CONFIDENCE_THRESHOLDS.medium);
  });

  it("weights words more heavily for long text", () => {
    const { charScore, wordScore } = similarity(
      "لم يلد ولم يولد ولم يكن له كفوا احد",
      IKHLAS[2]!.text,
    );
    expect(charScore).toBeGreaterThan(0);
    expect(wordScore).toBeGreaterThan(0.5);
  });
});

describe("index and matching", () => {
  const index = indexAyahs(IKHLAS);

  it("indexes every verse", () => {
    expect(index).toHaveLength(4);
    expect(index[0]!.id).toBe("112:1");
  });

  it("finds the right verse for a clean recitation", () => {
    const matches = matchAyah("قل هو الله احد", index);
    expect(matches[0]?.id).toBe("112:1");
    expect(matches[0]!.score).toBeGreaterThan(CONFIDENCE_THRESHOLDS.high);
  });

  it("finds the right verse when the reciter repeats words", () => {
    const matches = matchAyah("لم يلد لم يلد ولم يولد", index);
    expect(matches[0]?.id).toBe("112:3");
  });

  it("returns nothing for unrelated speech", () => {
    expect(matchAyah("اليوم نشرحو كيفاش نقصو فيديو بكلمة وحدة", index)).toHaveLength(0);
  });

  it("respects the limit", () => {
    expect(matchAyah("قل هو الله احد الله الصمد", index, { limit: 1 })).toHaveLength(1);
  });

  it("reports coverage so the UI can explain a partial match", () => {
    const [first] = matchAyah("قل هو الله احد", index, { limit: 1 });
    expect(first!.coverage).toBeGreaterThan(0.9);
  });
});

describe("confidence bands", () => {
  it("classifies high, medium and low", () => {
    expect(confidenceBand(0.95)).toBe("high");
    expect(confidenceBand(0.7)).toBe("medium");
    expect(confidenceBand(0.3)).toBe("low");
  });

  it("demands review for everything but high confidence", () => {
    expect(requiresReview(0.95)).toBe(false);
    expect(requiresReview(0.7)).toBe(true);
    expect(requiresReview(0.2)).toBe(true);
  });
});
