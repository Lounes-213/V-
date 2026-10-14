import { describe, expect, it } from "vitest";
import { needsRetime, retimeProject } from "./retime";
import { createDemoProject, createEmptyProject } from "./project-factory";
import type { Project } from "./types";

const base = createDemoProject({ id: "demo-retime" });

describe("retimeProject", () => {
  it("scales the whole timeline to the real media duration", () => {
    const shorter = retimeProject(base, 10);
    expect(shorter.durationSec).toBe(10);
    // The offset before the first word shrinks by the same ratio as everything else.
    expect(shorter.words[0]?.start).toBeCloseTo((base.words[0]?.start ?? 0) * (10 / base.durationSec), 3);

    const lastWord = shorter.words[shorter.words.length - 1];
    // Everything now lives inside the real media window.
    expect(lastWord?.end).toBeLessThanOrEqual(10.001);
    expect(lastWord?.end).toBeGreaterThan(9);
  });

  it("keeps every relative gap between words intact", () => {
    const before = base.words.slice(1).map((word, index) => word.start - (base.words[index]?.start ?? 0));
    const after = retimeProject(base, 10);
    const scaled = after.words.slice(1).map((word, index) => word.start - (after.words[index]?.start ?? 0));

    before.forEach((gap, index) => {
      const ratio = (scaled[index] ?? 0) / 10;
      expect(ratio).toBeCloseTo(gap / base.durationSec, 2);
    });
  });

  it("keeps words monotonic and non-negative", () => {
    const out = retimeProject(base, 7.5);
    out.words.forEach((word, index) => {
      expect(word.start).toBeGreaterThanOrEqual(0);
      expect(word.end).toBeGreaterThanOrEqual(word.start);
      if (index > 0) expect(word.start).toBeGreaterThanOrEqual(out.words[index - 1]?.start ?? 0);
    });
  });

  it("keeps clips ordered and inside the media", () => {
    const out = retimeProject(base, 10);
    out.clips.forEach((clip) => {
      expect(clip.sourceIn).toBeGreaterThanOrEqual(0);
      expect(clip.sourceOut).toBeLessThanOrEqual(10);
      expect(clip.sourceOut).toBeGreaterThanOrEqual(clip.sourceIn);
    });
  });

  it("rescales Quran matches with their words", () => {
    const project: Project = {
      ...base,
      quran: [
        {
          id: "q1",
          surah: 112,
          surahName: "الإخلاص",
          ayah: 1,
          uthmani: "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
          confidence: 0.94,
          start: base.durationSec / 2,
          end: base.durationSec,
          reviewed: true,
        },
      ],
    };

    const out = retimeProject(project, 10);
    expect(out.quran[0]?.start).toBeCloseTo(5, 2);
    expect(out.quran[0]?.end).toBeCloseTo(10, 2);
    expect(out.quran[0]?.uthmani).toBe("قُلْ هُوَ ٱللَّهُ أَحَدٌ");
  });

  it("leaves the project alone when durations already agree", () => {
    expect(retimeProject(base, base.durationSec)).toBe(base);
  });

  it("ignores nonsense durations instead of corrupting the timeline", () => {
    expect(retimeProject(base, 0)).toBe(base);
    expect(retimeProject(base, -4)).toBe(base);
    expect(retimeProject(base, Number.NaN)).toBe(base);
  });

  it("adopts a real duration for a project that has none yet", () => {
    const empty = createEmptyProject("new-project");
    const out = retimeProject(empty, 12.5);
    expect(out.durationSec).toBe(12.5);
    expect(out.clips[0]?.sourceOut).toBe(0);
    expect(out.words).toEqual([]);
  });
});

describe("needsRetime", () => {
  it("is false when the media matches the edit", () => {
    expect(needsRetime(base, base.durationSec + 0.2)).toBe(false);
  });

  it("is true when the edit drifts more than 5%", () => {
    expect(needsRetime(base, base.durationSec * 0.5)).toBe(true);
  });

  it("is true when nothing is timed yet", () => {
    expect(needsRetime(createEmptyProject("new-project"), 30)).toBe(true);
  });

  it("is false without a usable media duration", () => {
    expect(needsRetime(base, 0)).toBe(false);
    expect(needsRetime(base, Number.NaN)).toBe(false);
  });
});
