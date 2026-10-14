"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type VirtualRange = { start: number; end: number };

/**
 * Measured virtual list.
 *
 * A 40-minute podcast is ~6,000 words; rendering them all costs seconds of
 * layout on every keystroke. Rows report their real height, offsets are cached,
 * and only the rows inside the viewport (plus overscan) are mounted.
 */
export function VirtualList<T>({
  items,
  estimateHeight,
  overscan = 8,
  className,
  renderItem,
  getKey,
  onRangeChange,
  scrollToIndex,
}: {
  items: T[];
  estimateHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  onRangeChange?: (range: VirtualRange) => void;
  scrollToIndex?: number | null;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Measured heights live in state, not a ref: the offsets are computed during
  // render, and render must not read a mutable ref.
  const [heights, setHeights] = React.useState<ReadonlyMap<number, number>>(() => new Map());
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewport, setViewport] = React.useState(600);
  const lastRange = React.useRef<VirtualRange>({ start: -1, end: -1 });

  const heightOf = React.useCallback(
    (index: number) => heights.get(index) ?? estimateHeight,
    [heights, estimateHeight],
  );

  const offsets = React.useMemo(() => {
    const result = new Array<number>(items.length + 1);
    result[0] = 0;
    for (let index = 0; index < items.length; index += 1) {
      result[index + 1] = (result[index] ?? 0) + heightOf(index);
    }
    return result;
  }, [items.length, heightOf]);

  const totalHeight = offsets[items.length] ?? 0;

  const range = React.useMemo<VirtualRange>(() => {
    let start = 0;
    while (start < items.length && (offsets[start + 1] ?? 0) < scrollTop) start += 1;
    let end = start;
    while (end < items.length && (offsets[end] ?? 0) < scrollTop + viewport) end += 1;
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [items.length, offsets, scrollTop, viewport, overscan]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewport(element.clientHeight));
    observer.observe(element);
    setViewport(element.clientHeight);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (lastRange.current.start === range.start && lastRange.current.end === range.end) return;
    lastRange.current = range;
    onRangeChange?.(range);
  }, [range, onRangeChange]);

  React.useEffect(() => {
    if (scrollToIndex === null || scrollToIndex === undefined) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: (offsets[scrollToIndex] ?? 0) - viewport / 3, behavior: "smooth" });
  }, [scrollToIndex, offsets, viewport]);

  const measure = React.useCallback((index: number, node: HTMLDivElement | null) => {
    if (!node) return;
    const height = node.offsetHeight;
    if (height <= 0) return;
    setHeights((current) => {
      // Same map identity when nothing changed, so this cannot loop.
      if (current.get(index) === height) return current;
      const next = new Map(current);
      next.set(index, height);
      return next;
    });
  }, []);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className={cn("relative overflow-y-auto overscroll-contain", className)}
    >
      <div style={{ height: totalHeight }} className="relative">
        {items.slice(range.start, range.end).map((item, offset) => {
          const index = range.start + offset;
          return (
            <div
              key={getKey(item, index)}
              ref={(node) => measure(index, node)}
              className="absolute inset-x-0"
              style={{ top: offsets[index] }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
