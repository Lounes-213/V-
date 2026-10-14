"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type WaveformProps = {
  peaks: Float32Array;
  /** Media duration the peaks were computed over. */
  duration: number;
  /** Visible window in seconds (the timeline viewport). */
  fromSec: number;
  toSec: number;
  /** Ranges that have been cut out of the programme. */
  cutRanges?: { start: number; end: number }[];
  /** Kept ranges — everything outside them is dimmed. */
  keptRanges?: { start: number; end: number }[];
  className?: string;
  height?: number;
  barGap?: number;
  tone?: "primary" | "muted";
  /** Draws only what is inside `keptRanges`, as in the export preview. */
  clipToKept?: boolean;
};

/**
 * Canvas waveform. Drawing happens on a single canvas sized to the viewport and
 * the device pixel ratio; the caller owns zoom and scroll, so this stays a pure
 * render of (peaks, window) and never re-renders React on scroll.
 */
export function WaveformCanvas({
  peaks,
  duration,
  fromSec,
  toSec,
  cutRanges = [],
  keptRanges = [],
  className,
  height = 96,
  barGap = 0.28,
  tone = "primary",
  clipToKept = false,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const span = Math.max(0.001, toSec - fromSec);
    const barWidth = 3;
    const step = barWidth + barGap * barWidth;
    const bars = Math.ceil(width / step);
    const mid = height / 2;

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim() || "#19C37D";
    const muted = styles.getPropertyValue("--muted").trim() || "#8B97A8";
    const border = styles.getPropertyValue("--border-strong").trim() || "#33415A";

    const inRange = (time: number, ranges: { start: number; end: number }[]) =>
      ranges.length === 0 || ranges.some((range) => time >= range.start && time <= range.end);

    for (let index = 0; index < bars; index += 1) {
      const time = fromSec + (index / bars) * span;
      if (time > duration) break;

      const peakIndex = Math.min(peaks.length - 1, Math.max(0, Math.floor((time / duration) * peaks.length)));
      const value = peaks[peakIndex] ?? 0;
      const amplitude = Math.max(1.5, value * (height * 0.46));
      const x = index * step;

      const cut = inRange(time, cutRanges);
      const kept = keptRanges.length === 0 || inRange(time, keptRanges);

      if (clipToKept && !kept) {
        // Outside the programme: draw a hairline so the shape is still readable.
        context.fillStyle = border;
        context.globalAlpha = 0.5;
        context.fillRect(x, mid - 0.5, barWidth, 1);
        context.globalAlpha = 1;
        continue;
      }

      context.fillStyle = cut ? muted : tone === "primary" ? primary : muted;
      context.globalAlpha = cut ? 0.22 : 0.9;
      context.fillRect(x, mid - amplitude, barWidth, amplitude * 2);
      context.globalAlpha = 1;
    }
  }, [peaks, duration, fromSec, toSec, cutRanges, keptRanges, height, barGap, tone, clipToKept]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block w-full", className)}
      style={{ height }}
    />
  );
}
