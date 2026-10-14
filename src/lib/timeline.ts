import type { Clip, Word } from "./types";

export const MIN_CLIP_SEC = 0.2;

/* --------------------------------------------------------------- ranges -- */

export type Range = { start: number; end: number };

export function clipDuration(clip: Clip): number {
  return Math.max(0, clip.sourceOut - clip.sourceIn);
}

export function totalDuration(clips: Clip[]): number {
  return clips.reduce((sum, clip) => sum + clipDuration(clip), 0);
}

export function orderedClips(clips: Clip[]): Clip[] {
  return [...clips].sort((a, b) => a.order - b.order);
}

/** Output time → source time. Returns null when the position was cut away. */
export function outputToSource(time: number, clips: Clip[]): number | null {
  let cursor = 0;
  for (const clip of orderedClips(clips)) {
    const length = clipDuration(clip);
    if (time >= cursor && time <= cursor + length) {
      return clip.sourceIn + (time - cursor);
    }
    cursor += length;
  }
  return null;
}

/** Source time → output time. Returns null when that moment is no longer in the cut. */
export function sourceToOutput(time: number, clips: Clip[]): number | null {
  let cursor = 0;
  for (const clip of orderedClips(clips)) {
    if (time >= clip.sourceIn && time <= clip.sourceOut) {
      return cursor + (time - clip.sourceIn);
    }
    cursor += clipDuration(clip);
  }
  return null;
}

/**
 * Nearest kept output position for a source time.
 *
 * Scrubbing and trims land inside cut regions all the time; snapping to the
 * closest surviving edge is what keeps the playhead somewhere real.
 */
export function nearestOutputTime(sourceTime: number, clips: Clip[]): number {
  let cursor = 0;
  for (const clip of orderedClips(clips)) {
    if (sourceTime < clip.sourceIn) return cursor;
    if (sourceTime <= clip.sourceOut) return cursor + (sourceTime - clip.sourceIn);
    cursor += clipDuration(clip);
  }
  return cursor;
}

/** True when a source range survives in at least one clip. */
export function isRangeKept(range: Range, clips: Clip[]): boolean {
  return clips.some((clip) => clip.sourceIn < range.end && clip.sourceOut > range.start);
}

export function wordsInClips(words: Word[], clips: Clip[]): Word[] {
  return words.filter((word) => !word.deleted && isRangeKept(word, clips));
}

/* ---------------------------------------------------------------- edits -- */

/**
 * Splits whichever clip contains `sourceTime` into two clips at that point.
 * Returns the same array (no split) when the playhead sits on a boundary or
 * outside every clip.
 */
export function splitClipAt(clips: Clip[], sourceTime: number, label = "Clip"): Clip[] {
  const target = orderedClips(clips).find(
    (clip) => sourceTime > clip.sourceIn + MIN_CLIP_SEC && sourceTime < clip.sourceOut - MIN_CLIP_SEC,
  );
  if (!target) return clips;

  const left: Clip = { ...target, sourceOut: sourceTime, label: `${label} A` };
  const right: Clip = { ...target, id: `${target.id}-b`, sourceIn: sourceTime, label: `${label} B` };

  const next = clips.map((clip) => (clip.id === target.id ? left : clip));
  next.push(right);
  return normalizeOrder(next);
}

export function trimClip(
  clips: Clip[],
  clipId: string,
  side: "start" | "end",
  sourceTime: number,
): Clip[] {
  return clips.map((clip) => {
    if (clip.id !== clipId) return clip;
    if (side === "start") {
      const next = Math.min(Math.max(sourceTime, 0), clip.sourceOut - MIN_CLIP_SEC);
      return { ...clip, sourceIn: next };
    }
    const next = Math.max(sourceTime, clip.sourceIn + MIN_CLIP_SEC);
    return { ...clip, sourceOut: next };
  });
}

export function removeClip(clips: Clip[], clipId: string): Clip[] {
  if (clips.length <= 1) return clips;
  return normalizeOrder(clips.filter((clip) => clip.id !== clipId));
}

export function moveClip(clips: Clip[], clipId: string, direction: -1 | 1): Clip[] {
  const list = orderedClips(clips);
  const index = list.findIndex((clip) => clip.id === clipId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return clips;
  const a = list[index];
  const b = list[target];
  if (!a || !b) return clips;
  // Swap positions *and* renumber, otherwise `order` still describes the old sequence.
  list[index] = b;
  list[target] = a;
  return withOrder(list);
}

/** Replaces a clip order list with a full new ordering (drag and drop). */
export function reorderClips(clips: Clip[], orderedIds: string[]): Clip[] {
  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  const next: Clip[] = [];
  for (const id of orderedIds) {
    const clip = byId.get(id);
    if (clip) {
      next.push(clip);
      byId.delete(id);
    }
  }
  for (const clip of clips) if (byId.has(clip.id)) next.push(clip);
  return withOrder(next);
}

/** Renumbers clips to match the array sequence they are given in. */
export function withOrder(clips: Clip[]): Clip[] {
  return clips.map((clip, index) => ({ ...clip, order: index }));
}

/** Sorts by the stored `order` field and renumbers any gaps. */
export function normalizeOrder(clips: Clip[]): Clip[] {
  return withOrder([...clips].sort((a, b) => a.order - b.order));
}

/**
 * The heart of text-based editing: deleting words cuts the matching video.
 * Adjacent cut ranges are merged so we never produce 4 ms fragments, and any
 * clip that would fall below MIN_CLIP_SEC is dropped entirely.
 */
export function cutWordsFromClips(clips: Clip[], words: Word[], deletedIds: Set<string>): Clip[] {
  const cuts = mergeRanges(
    words
      .filter((word) => deletedIds.has(word.id))
      .map((word) => ({ start: word.start, end: word.end })),
  );
  if (cuts.length === 0) return clips;

  let result = clips;

  for (const cut of cuts) {
    const next: Clip[] = [];
    for (const clip of orderedClips(result)) {
      // No overlap: keep as is.
      if (cut.end <= clip.sourceIn || cut.start >= clip.sourceOut) {
        next.push(clip);
        continue;
      }

      const headEnd = Math.max(clip.sourceIn, cut.start);
      const tailStart = Math.min(clip.sourceOut, cut.end);

      if (headEnd - clip.sourceIn >= MIN_CLIP_SEC) {
        next.push({ ...clip, sourceOut: headEnd });
      }
      if (clip.sourceOut - tailStart >= MIN_CLIP_SEC) {
        next.push({
          ...clip,
          id: `${clip.id}-${Math.round(tailStart * 1000)}`,
          sourceIn: tailStart,
          label: `${clip.label} (cut)`,
        });
      }
    }
    result = next.length > 0 ? next : result;
  }

  return normalizeOrder(result);
}

/**
 * Puts media back into the programme after a cut is undone.
 *
 * Restoring is not the inverse of slicing: the range has to be *joined* to the
 * clips it touches. When it exactly fills the gap between two clips they merge
 * into one, which is what the user sees as "that word came back".
 */
export function restoreRanges(clips: Clip[], ranges: Range[], gap = 0.12): Clip[] {
  let result = orderedClips(clips);

  // Sub-millisecond slack for "already inside": this must not inherit the join
  // tolerance, or a range filling a narrow seam would look like a no-op.
  const epsilon = 0.001;

  for (const range of mergeRanges(ranges)) {
    // 1. The range is already inside a clip — nothing to put back.
    const covered = result.some(
      (clip) => range.start >= clip.sourceIn - epsilon && range.end <= clip.sourceOut + epsilon,
    );
    if (covered) continue;

    // Adjacency means the clip edge is within `gap` of the range edge, not merely
    // on the correct side of it — otherwise unrelated media would get swallowed.
    const headIndex = result.findIndex((clip) => Math.abs(clip.sourceOut - range.start) <= gap);
    const tailIndex = result.findIndex((clip) => Math.abs(clip.sourceIn - range.end) <= gap);

    // 2. The range exactly fills the seam between neighbours: fuse them.
    if (headIndex >= 0 && tailIndex === headIndex + 1) {
      const head = result[headIndex]!;
      const tail = result[tailIndex]!;
      result = withOrder(
        result
          .filter((_, index) => index !== headIndex && index !== tailIndex)
          .concat({ ...head, sourceOut: tail.sourceOut }),
      );
      continue;
    }

    // 3. Join the front of the next clip.
    if (headIndex >= 0) {
      result = result.map((clip, index) =>
        index === headIndex ? { ...clip, sourceOut: Math.max(clip.sourceOut, range.end) } : clip,
      );
      continue;
    }

    // 4. Join the back of the previous clip.
    if (tailIndex >= 0) {
      result = result.map((clip, index) =>
        index === tailIndex ? { ...clip, sourceIn: Math.min(clip.sourceIn, range.start) } : clip,
      );
      continue;
    }

    // 5. Nothing adjacent: a genuinely new piece of programme, inserted in source order.
    const insertAt = result.filter((clip) => clip.sourceIn < range.start).length;
    result = withOrder([
      ...result.slice(0, insertAt),
      {
        id: `restored_${Math.round(range.start * 1000)}`,
        order: insertAt,
        sourceIn: range.start,
        sourceOut: range.end,
        label: "Restored",
      },
      ...result.slice(insertAt),
    ]);
  }

  return result;
}

export function mergeRanges(ranges: Range[], gap = 0.08): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  let current = { ...sorted[0]! };

  for (let index = 1; index < sorted.length; index += 1) {
    const range = sorted[index]!;
    if (range.start <= current.end + gap) {
      current.end = Math.max(current.end, range.end);
    } else {
      merged.push(current);
      current = { ...range };
    }
  }
  merged.push(current);
  return merged;
}

/* ---------------------------------------------------------- interaction -- */

export type Viewport = { pxPerSec: number; scrollSec: number; width: number };

export function timeToX(time: number, view: Viewport): number {
  // The timeline is always LTR, even in Arabic — time never mirrors.
  return (time - view.scrollSec) * view.pxPerSec;
}

export function xToTime(x: number, view: Viewport): number {
  return x / view.pxPerSec + view.scrollSec;
}

export function visibleRange(view: Viewport): Range {
  return { start: view.scrollSec, end: view.scrollSec + view.width / view.pxPerSec };
}

/** Keeps a viewport inside the media and inside sane zoom limits. */
export function clampViewport(view: Viewport, duration: number, minPxPerSec = 6, maxPxPerSec = 900): Viewport {
  const pxPerSec = Math.min(maxPxPerSec, Math.max(minPxPerSec, view.pxPerSec));
  const visible = view.width / pxPerSec;
  const maxScroll = Math.max(0, duration - visible);
  return { ...view, pxPerSec, scrollSec: Math.min(Math.max(0, view.scrollSec), maxScroll) };
}

export function zoomAt(view: Viewport, nextPxPerSec: number, anchorX: number, duration: number): Viewport {
  const anchorTime = xToTime(anchorX, view);
  const zoomed = clampViewport({ ...view, pxPerSec: nextPxPerSec }, duration);
  return clampViewport({ ...zoomed, scrollSec: anchorTime - anchorX / zoomed.pxPerSec }, duration);
}

export type SnapTarget = { time: number; kind: "clip" | "word" | "playhead" };

export function snapTime(time: number, targets: SnapTarget[], toleranceSec: number): number {
  let best = time;
  let bestDelta = toleranceSec;
  for (const target of targets) {
    const delta = Math.abs(target.time - time);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = target.time;
    }
  }
  return best;
}

/** Ruler ticks that stay legible at any zoom level. */
export function buildTicks(duration: number, pxPerSec: number, minSpacingPx = 64): number[] {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  const step = steps.find((candidate) => candidate * pxPerSec >= minSpacingPx) ?? 900;
  const ticks: number[] = [];
  for (let time = 0; time <= duration + 1e-6; time += step) {
    ticks.push(Number(time.toFixed(4)));
  }
  return ticks;
}

/* ------------------------------------------------------- virtualisation -- */

/** Windowed slice for long transcripts: returns the indices to render. */
export function windowRange(
  itemCount: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan = 6,
): Range {
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const last = Math.min(itemCount, first + visibleCount);
  return { start: first, end: Math.max(first, last) };
}

/* ------------------------------------------------------------- helpers -- */

export function formatTimecode(seconds: number, withHours = false): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const whole = Math.floor(safe);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const parts = withHours || hours > 0 ? [hours, minutes, secs] : [minutes, secs];
  return parts.map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0"))).join(":");
}

export function parseTimecode(value: string): number | null {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return null;
}

export function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
