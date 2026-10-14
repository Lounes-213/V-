import { describe, expect, it } from "vitest";
import { computeTajweedWordWeight, alignWordsAcoustically } from "./tajweed-aligner";

describe("computeTajweedWordWeight", () => {
  it("assigns highest weight and 6 harakat to Madd Lazim words (الضَّالِّينَ)", () => {
    // Ad-Dallin has Madd Lazim (marked by maddah before shaddah) + Arid lis-sukoon at end
    const result = computeTajweedWordWeight("الضَّآلِّينَ", true);
    expect(result.hasMadd).toBe(true);
    expect(result.maddHarakat).toBe(6);
    expect(result.totalWeight).toBeGreaterThan(10);
  });

  it("detects Madd Muttasil/Munfasil (4-5 harakat) before Hamza (جَاءَ)", () => {
    const result = computeTajweedWordWeight("جَآءَ", false);
    expect(result.hasMadd).toBe(true);
    expect(result.maddHarakat).toBeGreaterThanOrEqual(4);
    expect(result.totalWeight).toBeGreaterThanOrEqual(5.0);
  });

  it("detects Dagger Alif (2 harakat) in words like الرَّحْمَٰنِ", () => {
    const result = computeTajweedWordWeight("الرَّحْمَٰنِ", false);
    expect(result.hasMadd).toBe(true);
    expect(result.maddHarakat).toBe(2);
  });

  it("detects Ghunnah on Noon/Meem Mushaddadah (إِنَّا)", () => {
    const result = computeTajweedWordWeight("إِنَّا", false);
    expect(result.hasGhunnah).toBe(true);
    expect(result.totalWeight).toBeGreaterThan(3.5);
  });

  it("assigns short weight to simple particles (وَ)", () => {
    const result = computeTajweedWordWeight("وَ", false);
    expect(result.hasMadd).toBe(false);
    expect(result.totalWeight).toBeLessThan(2.0);
  });

  it("boosts end-of-ayah words for Madd Arid Lis-Sukoon", () => {
    const midVerse = computeTajweedWordWeight("الرَّحِيمِ", false);
    const endVerse = computeTajweedWordWeight("الرَّحِيمِ", true);
    expect(endVerse.totalWeight).toBeGreaterThan(midVerse.totalWeight);
    expect(endVerse.hasMadd).toBe(true);
  });
});

describe("alignWordsAcoustically", () => {
  it("distributes words proportionally to Tajweed weights within speech runs", () => {
    const words = [
      { text: "وَ", ayah: 1 },
      { text: "الضَّآلِّينَ", ayah: 1 },
    ];
    const speechRuns = [{ start: 1.0, end: 5.0, durationSec: 4.0, meanRms: 0.1 }];

    const aligned = alignWordsAcoustically({
      words,
      speechRuns,
      durationSec: 6.0,
    });

    expect(aligned.length).toBe(2);
    expect(aligned[0]!.text).toBe("وَ");
    expect(aligned[1]!.text).toBe("الضَّآلِّينَ");

    const w1Duration = aligned[0]!.end - aligned[0]!.start;
    const w2Duration = aligned[1]!.end - aligned[1]!.start;

    // Madd Lazim word must get much more time than single particle "وَ"
    expect(w2Duration).toBeGreaterThan(w1Duration * 2);
    expect(aligned[1]!.hasMadd).toBe(true);
    expect(aligned[1]!.maddHarakat).toBe(6);
  });

  it("respects silence gaps between speech runs", () => {
    const words = [
      { text: "الْحَمْدُ", ayah: 1 },
      { text: "لِلَّهِ", ayah: 1 },
    ];
    // Speech from 0.5s to 1.5s, then silence from 1.5s to 2.5s, then speech from 2.5s to 3.5s
    const speechRuns = [
      { start: 0.5, end: 1.5, durationSec: 1.0, meanRms: 0.1 },
      { start: 2.5, end: 3.5, durationSec: 1.0, meanRms: 0.1 },
    ];
    const silences = [{ start: 1.5, end: 2.5, durationSec: 1.0, meanRms: 0.001 }];

    const aligned = alignWordsAcoustically({
      words,
      speechRuns,
      silences,
      durationSec: 4.0,
    });

    expect(aligned.length).toBe(2);
    // Word 1 should end by the end of run 1
    expect(aligned[0]!.end).toBeLessThanOrEqual(1.6);
    // Word 2 should start around run 2 start (not in silence)
    expect(aligned[1]!.start).toBeGreaterThanOrEqual(2.4);
  });

  it("preserves monotonicity and non-negative durations", () => {
    const words = [
      { text: "قُلْ", ayah: 1 },
      { text: "هُوَ", ayah: 1 },
      { text: "اللَّهُ", ayah: 1 },
      { text: "أَحَدٌ", ayah: 1 },
    ];
    const aligned = alignWordsAcoustically({
      words,
      speechRuns: [],
      durationSec: 3.0,
    });

    expect(aligned.length).toBe(4);
    for (let i = 0; i < aligned.length; i++) {
      expect(aligned[i]!.end).toBeGreaterThan(aligned[i]!.start);
      if (i > 0) {
        expect(aligned[i]!.start).toBeGreaterThanOrEqual(aligned[i - 1]!.start);
      }
    }
  });
});
