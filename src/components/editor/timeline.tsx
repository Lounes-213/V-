"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { GripVertical, Scissors, Trash2 } from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { usePeaks } from "@/lib/peaks";
import {
  buildTicks,
  nearestOutputTime,
  orderedClips,
  outputToSource,
  snapTime,
  timeToX,
  totalDuration,
  xToTime,
  type SnapTarget,
  type Viewport,
} from "@/lib/timeline";
import { cn } from "@/lib/cn";
import { WaveformCanvas } from "./waveform-canvas";

const RULER_HEIGHT = 26;
const TRACK_HEIGHT = 96;
const HANDLE_WIDTH = 14;

type DragKind =
  | { kind: "scrub" }
  | { kind: "pan"; startX: number; startScroll: number }
  | { kind: "trim"; clipId: string; side: "start" | "end" }
  | { kind: "move"; clipId: string; startX: number; originalId: string };

export function Timeline({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("editor");
  const a11y = useTranslations("a11y");
  const { tc } = useFormat();

  const {
    project,
    playhead,
    pxPerSec,
    scrollSec,
    timelineWidth,
    snapping,
    selectedClipId,
    activeWordId,
    playing,
  } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      playhead: state.playhead,
      pxPerSec: state.pxPerSec,
      scrollSec: state.scrollSec,
      timelineWidth: state.timelineWidth,
      snapping: state.snapping,
      selectedClipId: state.selectedClipId,
      activeWordId: state.activeWordId,
      playing: state.playing,
    })),
  );

  const setView = useEditor((state) => state.setView);
  const setPlayhead = useEditor((state) => state.setPlayhead);
  const selectClip = useEditor((state) => state.selectClip);
  const trim = useEditor((state) => state.trim);
  const reorder = useEditor((state) => state.reorder);
  const pause = useEditor((state) => state.pause);
  const split = useEditor((state) => state.splitAtPlayhead);
  const deleteClip = useEditor((state) => state.deleteClip);

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragKind | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const [dropping, setDropping] = useState<{ id: string; at: number } | null>(null);

  const clips = useMemo(() => orderedClips(project.clips), [project.clips]);
  const duration = useMemo(() => totalDuration(clips), [clips]);
  const peaks = usePeaks(project.id, Math.max(1, project.durationSec || duration));
  const peaksDuration = Math.max(1, project.durationSec || duration);

  const view: Viewport = { pxPerSec, scrollSec, width: timelineWidth };
  const trackHeight = compact ? 64 : TRACK_HEIGHT;

  /* ------------------------------------------------------------ sizing -- */
  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0 && Math.abs(width - timelineWidth) > 1) setView({ width });
    });
    observer.observe(element);
    setView({ width: element.clientWidth });
    return () => observer.disconnect();
  }, [setView, timelineWidth]);

  /* ------------------------------------------------------- interactions -- */
  /** Coalesces pointer updates to one store write per frame (60fps drags). */
  const scheduleFrame = useCallback((work: () => void) => {
    pendingRef.current = work;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const run = pendingRef.current;
      pendingRef.current = null;
      run?.();
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const snapTargets = useMemo<SnapTarget[]>(() => {
    const targets: SnapTarget[] = [{ time: playhead, kind: "playhead" }];
    for (const clip of clips) {
      targets.push({ time: clip.sourceIn, kind: "clip" });
      targets.push({ time: clip.sourceOut, kind: "clip" });
    }
    return targets;
  }, [clips, playhead]);

  const pointerToSourceTime = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left;
    const time = xToTime(x, view);
    return snapping ? snapTime(time, snapTargets, 8 / pxPerSec) : time;
  };

  const onPointerDownScrub = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = { kind: "scrub" };
    pause();
    setPlayhead(nearestOutputTime(pointerToSourceTime(event.clientX), clips));
  };

  const onPointerDownPan = (event: React.PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = { kind: "pan", startX: event.clientX, startScroll: scrollSec };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === "scrub") {
      const source = pointerToSourceTime(event.clientX);
      scheduleFrame(() => setPlayhead(nearestOutputTime(source, clips)));
      return;
    }

    if (drag.kind === "pan") {
      const delta = event.clientX - drag.startX;
      scheduleFrame(() => setView({ scrollSec: drag.startScroll - delta / pxPerSec }));
      return;
    }

    if (drag.kind === "trim") {
      const time = pointerToSourceTime(event.clientX);
      scheduleFrame(() => trim(drag.clipId, drag.side, time));
      return;
    }

    if (drag.kind === "move") {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const index = clips.findIndex((clip) => x < timeToX((clip.sourceIn + clip.sourceOut) / 2, view));
      const at = index === -1 ? clips.length - 1 : Math.max(0, index);
      setDropping({ id: drag.clipId, at });
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (drag?.kind === "move" && dropping) {
      const ids = clips.map((clip) => clip.id).filter((id) => id !== drag.clipId);
      ids.splice(dropping.at, 0, drag.clipId);
      reorder(ids);
    }
    setDropping(null);
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      pendingRef.current?.();
    }
  };

  const onWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      const rect = trackRef.current?.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      useEditor.getState().zoom(factor, rect ? event.clientX - rect.left : undefined);
      return;
    }
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    setView({ scrollSec: scrollSec + delta / pxPerSec });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 1 : 1 / 30;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setPlayhead(playhead + (event.key === "ArrowRight" ? step : -step));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setPlayhead(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setPlayhead(duration);
    }
    if (event.key === "=" || event.key === "+") {
      event.preventDefault();
      useEditor.getState().zoom(1.2);
    }
    if (event.key === "-") {
      event.preventDefault();
      useEditor.getState().zoom(1 / 1.2);
    }
    if (event.key === "s" || event.key === "S") {
      event.preventDefault();
      split();
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedClipId) {
      event.preventDefault();
      deleteClip(selectedClipId);
    }
  };

  /* ----------------------------------------------------------- painting -- */
  const ticks = useMemo(() => buildTicks(duration, pxPerSec), [duration, pxPerSec]);

  const keptRanges = useMemo(
    () => clips.map((clip) => ({ start: clip.sourceIn, end: clip.sourceOut })),
    [clips],
  );

  const cutRanges = useMemo(() => {
    const ranges: { start: number; end: number }[] = [];
    let cursor = 0;
    for (const clip of keptRanges) {
      if (clip.start - cursor > 0.01) ranges.push({ start: cursor, end: clip.start });
      cursor = Math.max(cursor, clip.end);
    }
    return ranges;
  }, [keptRanges]);

  const playheadX = timeToX(outputToSource(playhead, clips) ?? clips[0]?.sourceIn ?? 0, view);

  const activeWord = project.words.find((word) => word.id === activeWordId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative flex-1 overflow-hidden rounded-lg border border-border bg-ink"
        data-timeline
      >
        {/* ruler */}
        <div
          className="relative cursor-ew-resize overflow-hidden border-b border-hairline bg-surface/60"
          style={{ height: RULER_HEIGHT }}
          onPointerDown={onPointerDownScrub}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="num-tabular absolute top-0 flex h-full flex-col justify-center font-mono text-[10px] text-subtle"
                style={{ left: timeToX(tick, view) + 3, direction: "ltr" }}
              >
                {tc(tick)}
              </span>
            ))}
          </div>
        </div>

        {/* scrollable track surface */}
        <div
          className="relative touch-pan-x select-none overflow-hidden"
          style={{ height: trackHeight }}
        >
          <WaveformCanvas
            peaks={peaks}
            duration={peaksDuration}
            fromSec={scrollSec}
            toSec={scrollSec + timelineWidth / pxPerSec}
            cutRanges={cutRanges}
            keptRanges={keptRanges}
            clipToKept
            height={trackHeight}
            className="absolute inset-0"
          />

          {/* word markers */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3">
            {project.words
              .filter(
                (word) =>
                  !word.deleted &&
                  word.start >= scrollSec - 1 &&
                  word.end <= scrollSec + timelineWidth / pxPerSec + 1,
              )
              .map((word) => (
                <span
                  key={word.id}
                  className={cn(
                    "absolute bottom-0 w-px",
                    word.id === activeWordId ? "h-3 bg-primary" : "h-1.5 bg-border-strong",
                  )}
                  style={{ left: timeToX(word.start, view) }}
                />
              ))}
          </div>

          {/* clips */}
          <div
            className="absolute inset-0"
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={onWheel}
          >
            {clips.map((clip, index) => {
              const left = timeToX(clip.sourceIn, view);
              const width = Math.max(12, (clip.sourceOut - clip.sourceIn) * pxPerSec);
              const selected = clip.id === selectedClipId;
              const isDropping = dropping?.id === clip.id;

              return (
                <div
                  key={clip.id}
                  role="button"
                  tabIndex={0}
                  aria-label={a11y("clipLabel", {
                    index: index + 1,
                    total: clips.length,
                    start: tc(clip.sourceIn),
                    end: tc(clip.sourceOut),
                  })}
                  // A clip block is a toggle, not a listbox option: `aria-pressed`
                  // is the attribute that carries "this one is selected" here.
                  aria-pressed={selected}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectClip(clip.id);
                    }
                    if (event.altKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
                      event.preventDefault();
                      useEditor.getState().reorder(
                        (() => {
                          const ids = clips.map((item) => item.id);
                          const from = ids.indexOf(clip.id);
                          const to = Math.min(
                            ids.length - 1,
                            Math.max(0, from + (event.key === "ArrowRight" ? 1 : -1)),
                          );
                          if (from === to) return ids;
                          ids.splice(to, 0, ids.splice(from, 1)[0]!);
                          return ids;
                        })(),
                      );
                    }
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    selectClip(clip.id);
                  }}
                  className={cn(
                    "group absolute top-0 cursor-grab rounded-md border transition-colors",
                    selected
                      ? "border-primary/70 bg-primary-soft/40"
                      : "border-border-strong bg-raised/45 hover:border-primary/45",
                    isDropping && "opacity-60",
                  )}
                  style={{ left, width, height: trackHeight }}
                >
                  <span className="pointer-events-none absolute inset-x-2 top-1.5 truncate text-[10px] font-medium text-fg/80">
                    {clip.label}
                  </span>

                  <Tooltip content={t("timelineReorder")}>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-hidden
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
                        dragRef.current = { kind: "move", clipId: clip.id, startX: event.clientX, originalId: clip.id };
                      }}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 cursor-grab text-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </Tooltip>

                  {/* trim handles: 44px touch target, thin visual */}
                  {(["start", "end"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      aria-label={t(side === "start" ? "trimStart" : "trimEnd")}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
                        dragRef.current = { kind: "trim", clipId: clip.id, side };
                      }}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onKeyDown={(event) => {
                        const step = event.shiftKey ? 1 : 0.1;
                        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                        event.preventDefault();
                        const direction = event.key === "ArrowRight" ? 1 : -1;
                        const current = side === "start" ? clip.sourceIn : clip.sourceOut;
                        trim(clip.id, side, current + direction * step);
                      }}
                      className={cn(
                        "absolute top-0 bottom-0 z-10 flex cursor-ew-resize items-center justify-center touch:w-11",
                        side === "start" ? "left-0" : "right-0",
                      )}
                      style={{ width: HANDLE_WIDTH }}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-8 w-1 rounded-full transition-colors",
                          selected ? "bg-primary" : "bg-border-strong group-hover:bg-primary/70",
                        )}
                      />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* playhead */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-gold"
            style={{ left: playheadX }}
          >
            <span className="absolute -top-1 -translate-x-1/2 rounded-sm bg-gold px-1 py-px font-mono text-[9px] font-semibold text-gold-fg">
              {tc(playhead)}
            </span>
          </div>
        </div>

        {/* keyboard surface: the whole timeline is one slider to assistive tech */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={a11y("timelineRole", { count: clips.length })}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round(playhead * 10) / 10}
          aria-valuetext={a11y("timelinePlayheadAt", { time: tc(playhead) })}
          aria-describedby="timeline-help"
          onKeyDown={onKeyDown}
          className="absolute inset-x-0 bottom-0 h-0"
        />
      </div>

      <p id="timeline-help" className="sr-only">
        {a11y("navigateWords")}
      </p>

      {/* quick actions sit under the thumb on touch devices */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            label={t("timelineSplit")}
            tooltip={t("timelineSplit")}
            shortcut="S"
            size="sm"
            onClick={() => (playing ? (pause(), split()) : split())}
          >
            <Scissors />
          </IconButton>
          <IconButton
            label={t("timelineDelete")}
            tooltip={t("timelineDelete")}
            shortcut="Del"
            size="sm"
            disabled={!selectedClipId || clips.length <= 1}
            onClick={() => selectedClipId && deleteClip(selectedClipId)}
          >
            <Trash2 />
          </IconButton>
        </div>
        <span className="num-tabular truncate font-mono text-[11px] text-muted">
          {activeWord ? `${tc(activeWord.start)} · ${activeWord.text}` : t("clipCount", { count: clips.length })}
        </span>
      </div>
    </div>
  );
}


