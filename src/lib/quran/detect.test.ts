import { describe, expect, it } from "vitest";
import { detectAyahs, groupDetections, type TimedWord } from "./detect";
import { indexAyahs } from "./normalize";
import fixture from "./fixture.json";

type Fixture = {
  chapters: {
    number: number;
    nameArabic: string;
    ayahs: { ayah: number; uthmani: string; translation: string }[];
  }[];
};

const data = fixture as Fixture;
const ikhlas = data.chapters.find((chapter) => chapter.number === 112)!;
const falaq = data.chapters.find((chapter) => chapter.number === 113)!;

const index = indexAyahs(
  data.chapters.flatMap((chapter) =>
    chapter.ayahs.map((ayah) => ({ surah: chapter.number, ayah: ayah.ayah, text: ayah.uthmani })),
  ),
);

/** Lays words out at a steady 0.4s each so timings are predictable in assertions. */
function timeline(texts: string[], startAt = 0, per = 0.4): TimedWord[] {
  return texts.map((text, index) => ({
    id: `w${String(index).padStart(3, "0")}`,
    text,
    start: Number((startAt + index * per).toFixed(3)),
    end: Number((startAt + (index + 1) * per).toFixed(3)),
  }));
}

/** Strips diacritics the way a transcriber would hear the words. */
const plain = (text: string) => text.replace(/[\u064B-\u0652\u0670\u06D6-\u06ED\u0640]/g, "").replace(/\u0671/g, "ا");

describe("detectAyahs", () => {
  it("finds a recited surah and reports the canonical reference", () => {
    const words = timeline(ikhlas.ayahs.flatMap((ayah) => plain(ayah.uthmani).split(/\s+/)));
    const found = detectAyahs(words, index);

    expect(found.length).toBe(4);
    expect(found.map((item) => item.surah)).toEqual([112, 112, 112, 112]);
    expect(found.map((item) => item.ayah)).toEqual([1, 2, 3, 4]);
  });

  it("times each verse against the words it was found in", () => {
    const words = timeline(ikhlas.ayahs.flatMap((ayah) => plain(ayah.uthmani).split(/\s+/)));
    const [first] = detectAyahs(words, index);

    expect(first?.wordIds.length).toBe(4);
    expect(first?.start).toBe(0);
    expect(first?.end).toBeCloseTo(1.6, 2);
  });

  it("separates two different surahs in one recording", () => {
    const recited = [
      ...ikhlas.ayahs.map((ayah) => plain(ayah.uthmani)),
      ...falaq.ayahs.map((ayah) => plain(ayah.uthmani)),
    ];
    const words = timeline(recited.flatMap((ayah) => ayah.split(/\s+/)));
    const found = detectAyahs(words, index);

    const surahs = [...new Set(found.map((item) => item.surah))];
    expect(surahs).toContain(112);
    expect(surahs).toContain(113);
  });

  it("finds nothing in ordinary speech", () => {
    const words = timeline(
      "اليوم نشرحو كيفاش تقص فيديو بكلمة وحدة بلا ما تكون مونتير محترف".split(" "),
    );
    expect(detectAyahs(words, index)).toEqual([]);
  });

  it("flags anything below the high band as needing a human", () => {
    const words = timeline(plain(ikhlas.ayahs[0]!.uthmani).split(/\s+/));
    const [found] = detectAyahs(words, index);
    expect(found?.reviewRequired).toBe(found!.score < 0.82);
  });

  it("returns nothing for empty input", () => {
    expect(detectAyahs([], index)).toEqual([]);
    expect(detectAyahs(timeline(["الله"]), [])).toEqual([]);
  });

  it("keeps detections non-overlapping and in order", () => {
    const words = timeline(
      [...ikhlas.ayahs, ...ikhlas.ayahs].flatMap((ayah) => plain(ayah.uthmani).split(/\s+/)),
    );
    const found = detectAyahs(words, index);
    for (let index = 1; index < found.length; index += 1) {
      expect(found[index]!.start).toBeGreaterThanOrEqual(found[index - 1]!.end);
    }
    const ids = found.flatMap((item) => item.wordIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects the detection limit", () => {
    const words = timeline(ikhlas.ayahs.flatMap((ayah) => plain(ayah.uthmani).split(/\s+/)));
    expect(detectAyahs(words, index, { limit: 2 })).toHaveLength(2);
  });
});

describe("groupDetections", () => {
  it("groups consecutive verses of one recitation run", () => {
    const words = timeline(ikhlas.ayahs.flatMap((ayah) => plain(ayah.uthmani).split(/\s+/)));
    const groups = groupDetections(detectAyahs(words, index));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("keeps distant verses in separate runs", () => {
    const words = timeline([
      ...plain(ikhlas.ayahs[0]!.uthmani).split(/\s+/),
      ...Array.from({ length: 40 }, () => "يعني"),
      ...plain(ikhlas.ayahs[1]!.uthmani).split(/\s+/),
    ]);
    const groups = groupDetections(detectAyahs(words, index));
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });
});
