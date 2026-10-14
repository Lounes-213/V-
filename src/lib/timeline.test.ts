import { describe, expect, it } from "vitest";
import {
  MIN_CLIP_SEC,
  withOrder,
  buildTicks,
  clampViewport,
  clipDuration,
  cutWordsFromClips,
  formatTimecode,
  isRangeKept,
  mergeRanges,
  moveClip,
  outputToSource,
  parseTimecode,
  reorderClips,
  restoreRanges,
  snapTime,
  sourceToOutput,
  splitClipAt,
  timeToX,
  totalDuration,
  trimClip,
  windowRange,
  wordsInClips,
  xToTime,
  zoomAt,
} from "./timeline";
import type { Clip, Word } from "./types";

const clip = (id: string, order: number, sourceIn: number, sourceOut: number): Clip => ({
  id,
  order,
  sourceIn,
  sourceOut,
  label: id,
});

const word = (id: string, start: number, end: number, deleted = false): Word => ({
  id,
  text: id,
  start,
  end,
  deleted,
});

describe("durations", () => {
  it("measures a single clip", () => {
    expect(clipDuration(clip("a", 0, 2, 6.5))).toBeCloseTo(4.5);
  });

  it("sums clips in order", () => {
    expect(totalDuration([clip("b", 1, 10, 12), clip("a", 0, 0, 5)])).toBeCloseTo(7);
  });
});

describe("time mapping", () => {
  const clips = [clip("a", 0, 0, 4), clip("b", 1, 10, 13)];

  it("maps output time into the source", () => {
    expect(outputToSource(1, clips)).toBeCloseTo(1);
    expect(outputToSource(5, clips)).toBeCloseTo(11);
  });

  it("returns null outside the programme", () => {
    expect(outputToSource(20, clips)).toBeNull();
  });

  it("maps source time back into the output", () => {
    expect(sourceToOutput(1, clips)).toBeCloseTo(1);
    expect(sourceToOutput(11, clips)).toBeCloseTo(5);
  });

  it("returns null for source time that was cut away", () => {
    expect(sourceToOutput(7, clips)).toBeNull();
  });

  it("is a round trip for kept material", () => {
    for (const time of [0, 1.5, 3.9]) {
      const source = outputToSource(time, clips);
      expect(source).not.toBeNull();
      expect(sourceToOutput(source!, clips)).toBeCloseTo(time);
    }
  });
});

describe("splitClipAt", () => {
  it("splits the clip under the playhead", () => {
    const split = splitClipAt([clip("a", 0, 0, 10)], 4);
    expect(split).toHaveLength(2);
    expect(split[0]!.sourceOut).toBeCloseTo(4);
    expect(split[1]!.sourceIn).toBeCloseTo(4);
    expect(split.map((item) => item.order)).toEqual([0, 1]);
  });

  it("refuses to split on a boundary", () => {
    const clips = [clip("a", 0, 0, 10)];
    expect(splitClipAt(clips, 0)).toBe(clips);
    expect(splitClipAt(clips, 10)).toBe(clips);
  });

  it("refuses to split outside every clip", () => {
    const clips = [clip("a", 0, 5, 10)];
    expect(splitClipAt(clips, 2)).toBe(clips);
  });

  it("keeps exactly one clip when the split point is too close to the edge", () => {
    const clips = [clip("a", 0, 0, 10)];
    const split = splitClipAt(clips, MIN_CLIP_SEC / 2);
    expect(split).toHaveLength(1);
  });
});

describe("trimClip", () => {
  it("trims the start without inverting the clip", () => {
    const [next] = trimClip([clip("a", 0, 0, 10)], "a", "start", 3);
    expect(next!.sourceIn).toBeCloseTo(3);
  });

  it("clamps a start trim that would pass the end", () => {
    const [next] = trimClip([clip("a", 0, 0, 10)], "a", "start", 12);
    expect(next!.sourceIn).toBeCloseTo(10 - MIN_CLIP_SEC);
  });

  it("clamps an end trim that would pass the start", () => {
    const [next] = trimClip([clip("a", 0, 4, 10)], "a", "end", 4);
    expect(next!.sourceOut).toBeCloseTo(4 + MIN_CLIP_SEC);
  });

  it("ignores unknown clips", () => {
    const clips = [clip("a", 0, 0, 10)];
    expect(trimClip(clips, "zzz", "start", 2)).toEqual(clips);
  });
});

describe("clip ordering", () => {
  it("moves a clip one slot and renumbers", () => {
    const moved = moveClip([clip("a", 0, 0, 1), clip("b", 1, 1, 2), clip("c", 2, 2, 3)], "a", 1);
    expect(moved.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moved.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it("does nothing at the edges", () => {
    const clips = [clip("a", 0, 0, 1), clip("b", 1, 1, 2)];
    expect(moveClip(clips, "a", -1)).toBe(clips);
    expect(moveClip(clips, "b", 1)).toBe(clips);
  });

  it("renumbers clips from an explicit sequence", () => {
    const renumbered = withOrder([clip("a", 9, 0, 1), clip("b", 4, 1, 2)]);
    expect(renumbered.map((item) => item.order)).toEqual([0, 1]);
  });

  it("reorders from an explicit id list and keeps stragglers", () => {
    const reordered = reorderClips([clip("a", 0, 0, 1), clip("b", 1, 1, 2), clip("c", 2, 2, 3)], [
      "c",
      "a",
    ]);
    expect(reordered.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});

describe("cutting words out of the video", () => {
  const words = [word("w1", 1, 1.4), word("w2", 1.5, 1.9), word("w3", 6, 6.5)];

  it("splits a clip around a removed word", () => {
    const clips = [clip("a", 0, 0, 10)];
    const next = cutWordsFromClips(clips, words, new Set(["w2"]));
    expect(next).toHaveLength(2);
    expect(next[0]!.sourceOut).toBeCloseTo(1.5);
    expect(next[1]!.sourceIn).toBeCloseTo(1.9);
    expect(totalDuration(next)).toBeCloseTo(10 - 0.4);
  });

  it("merges adjacent cuts into one", () => {
    const clips = [clip("a", 0, 0, 10)];
    const next = cutWordsFromClips(clips, words, new Set(["w1", "w2"]));
    expect(next).toHaveLength(2);
    expect(next[0]!.sourceOut).toBeCloseTo(1);
    expect(next[1]!.sourceIn).toBeCloseTo(1.9);
  });

  it("drops the leading fragment when the cut starts at zero", () => {
    const clips = [clip("a", 0, 0, 10)];
    const next = cutWordsFromClips(clips, [word("w1", 0, 2)], new Set(["w1"]));
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceIn).toBeCloseTo(2);
  });

  it("leaves a clip untouched when the cut happens outside it", () => {
    const clips = [clip("a", 0, 0, 4)];
    const next = cutWordsFromClips(clips, [word("w9", 20, 21)], new Set(["w9"]));
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceIn).toBeCloseTo(0);
    expect(next[0]!.sourceOut).toBeCloseTo(4);
  });

  it("returns the same clips when nothing is deleted", () => {
    const clips = [clip("a", 0, 0, 4)];
    expect(cutWordsFromClips(clips, words, new Set())).toBe(clips);
  });

  it("cuts across clip boundaries", () => {
    const clips = [clip("a", 0, 0, 5), clip("b", 1, 5, 10)];
    const next = cutWordsFromClips(clips, [word("w", 4.5, 5.5)], new Set(["w"]));
    expect(next.length).toBeGreaterThanOrEqual(2);
    expect(next.some((item) => item.sourceIn >= 5.5)).toBe(true);
    expect(next.some((item) => item.sourceOut <= 4.5)).toBe(true);
  });
});

describe("reading words against clips", () => {
  const clips = [clip("a", 0, 0, 5)];
  const words = [word("w1", 1, 2), word("w2", 6, 7), word("w3", 2, 3, true)];

  it("detects whether a range survives", () => {
    expect(isRangeKept({ start: 1, end: 2 }, clips)).toBe(true);
    expect(isRangeKept({ start: 7, end: 8 }, clips)).toBe(false);
  });

  it("filters deleted and cut words", () => {
    expect(wordsInClips(words, clips).map((item) => item.id)).toEqual(["w1"]);
  });
});

describe("restoring ranges after undo", () => {
  it("fuses two clips when the word fills the whole gap between them", () => {
    const clips = [clip("a", 0, 0, 5), clip("b", 1, 6, 10)];
    const next = restoreRanges(clips, [{ start: 5, end: 6 }]);
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceIn).toBeCloseTo(0);
    expect(next[0]!.sourceOut).toBeCloseTo(10);
  });

  it("extends the clip the word was cut from when the seam stays open", () => {
    const clips = [clip("a", 0, 0, 5), clip("b", 1, 8, 10)];
    const next = restoreRanges(clips, [{ start: 5, end: 6 }]);
    expect(next).toHaveLength(2);
    expect(next[0]!.sourceOut).toBeCloseTo(6);
    expect(next[1]!.sourceIn).toBeCloseTo(8);
  });

  it("fuses two clips when the word fills the seam", () => {
    const clips = [clip("a", 0, 0, 4), clip("b", 1, 4.05, 9)];
    const next = restoreRanges(clips, [{ start: 4, end: 4.05 }], 0.12);
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceOut).toBeCloseTo(9);
  });

  it("ignores a range that is already inside a clip", () => {
    const clips = [clip("a", 0, 0, 10)];
    expect(restoreRanges(clips, [{ start: 3, end: 4 }])).toEqual(clips);
  });

  it("joins the back of the following clip", () => {
    const clips = [clip("a", 0, 5, 10)];
    const next = restoreRanges(clips, [{ start: 4.5, end: 5 }]);
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceIn).toBeCloseTo(4.5);
  });

  it("adds a new clip when nothing is adjacent", () => {
    const clips = [clip("a", 0, 0, 4), clip("b", 1, 20, 24)];
    const next = restoreRanges(clips, [{ start: 10, end: 12 }]);
    expect(next).toHaveLength(3);
    const inserted = next.find((item) => item.label === "Restored");
    expect(inserted?.sourceIn).toBeCloseTo(10);
    expect(next.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it("puts a run of adjacent words back as one seam", () => {
    const clips = [clip("a", 0, 0, 5), clip("b", 1, 7, 10)];
    const next = restoreRanges(clips, [
      { start: 5, end: 6 },
      { start: 6, end: 7 },
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]!.sourceIn).toBeCloseTo(0);
    expect(next[0]!.sourceOut).toBeCloseTo(10);
  });

  it("extends the head and keeps the rest of the gap", () => {
    const clips = [clip("a", 0, 0, 5), clip("b", 1, 7, 10)];
    const next = restoreRanges(clips, [{ start: 5, end: 5.4 }]);
    expect(next).toHaveLength(2);
    expect(next[0]!.sourceOut).toBeCloseTo(5.4);
  });

  it("round-trips a cut", () => {
    const original = [clip("a", 0, 0, 12)];
    const words = [word("w", 4, 5)];
    const cut = cutWordsFromClips(original, words, new Set(["w"]));
    const restored = restoreRanges(cut, [{ start: 4, end: 5 }]);
    expect(totalDuration(restored)).toBeCloseTo(12, 2);
  });
});

describe("mergeRanges", () => {
  it("handles an empty list", () => {
    expect(mergeRanges([])).toEqual([]);
  });

  it("merges overlapping and near-adjacent ranges", () => {
    expect(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 0.9, end: 2 },
        { start: 5, end: 6 },
      ]),
    ).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 6 },
    ]);
  });

  it("keeps genuinely separate ranges apart", () => {
    expect(
      mergeRanges([
        { start: 0, end: 1 },
        { start: 1.5, end: 2 },
      ]),
    ).toHaveLength(2);
  });
});

describe("viewport maths", () => {
  const view = { pxPerSec: 50, scrollSec: 2, width: 500 };

  it("converts time to pixels and back", () => {
    expect(timeToX(4, view)).toBeCloseTo(100);
    expect(xToTime(100, view)).toBeCloseTo(4);
  });

  it("clamps zoom and scroll", () => {
    const clamped = clampViewport({ pxPerSec: 10_000, scrollSec: 999, width: 500 }, 60);
    expect(clamped.pxPerSec).toBe(900);
    expect(clamped.scrollSec).toBeLessThanOrEqual(60);
  });

  it("zooms around an anchor so the time under the cursor stays put", () => {
    const zoomed = zoomAt(view, 100, 250, 60);
    expect(xToTime(250, zoomed)).toBeCloseTo(xToTime(250, view));
  });
});

describe("snapping", () => {
  it("snaps to the nearest target within tolerance", () => {
    const targets = [
      { time: 1, kind: "clip" as const },
      { time: 5, kind: "word" as const },
    ];
    expect(snapTime(1.04, targets, 0.1)).toBeCloseTo(1);
    expect(snapTime(3, targets, 0.1)).toBeCloseTo(3);
  });
});

describe("ruler ticks", () => {
  it("produces legible spacing at any zoom", () => {
    for (const pxPerSec of [8, 46, 220]) {
      const ticks = buildTicks(60, pxPerSec);
      expect(ticks.length).toBeGreaterThan(1);
      const spacing = (ticks[1] ?? 0) - (ticks[0] ?? 0);
      expect(spacing * pxPerSec).toBeGreaterThanOrEqual(60);
    }
  });
});

describe("virtualisation window", () => {
  it("returns a bounded window with overscan", () => {
    const range = windowRange(1000, 4000, 600, 40, 6);
    expect(range.start).toBeLessThanOrEqual(100);
    expect(range.end - range.start).toBeLessThan(40);
    expect(range.start).toBeGreaterThanOrEqual(0);
  });

  it("never exceeds the item count", () => {
    const range = windowRange(10, 0, 600, 40);
    expect(range.end).toBeLessThanOrEqual(10);
  });
});

describe("timecode formatting", () => {
  it("formats without hours by default", () => {
    expect(formatTimecode(75)).toBe("1:15");
    expect(formatTimecode(0)).toBe("0:00");
  });

  it("adds hours when asked or when needed", () => {
    expect(formatTimecode(3725)).toBe("1:02:05");
    expect(formatTimecode(65, true)).toBe("0:01:05");
  });

  it("survives nonsense input", () => {
    expect(formatTimecode(Number.NaN)).toBe("0:00");
    expect(formatTimecode(-5)).toBe("0:00");
  });

  it("parses both shapes", () => {
    expect(parseTimecode("1:15")).toBe(75);
    expect(parseTimecode("1:02:05")).toBe(3725);
    expect(parseTimecode("abc")).toBeNull();
  });
});
