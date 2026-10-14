"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  onCommit?: (value: number) => void;
  label: string;
  /** Renders the live value bubble while dragging. */
  format?: (value: number) => string;
  className?: string;
  disabled?: boolean;
  /** Small tick marks for snapping feedback. */
  ticks?: number;
};

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  onCommit,
  label,
  format,
  className,
  disabled,
  ticks,
}: SliderProps) {
  const [dragging, setDragging] = React.useState(false);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full", className)}>
      <SliderPrimitive.Root
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => onValueChange(next ?? min)}
        onValueCommit={([next]) => onCommit?.(next ?? value)}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onFocus={() => setDragging(true)}
        onBlur={() => setDragging(false)}
        className={cn(
          "relative flex h-6 touch:h-9 w-full touch-none items-center select-none",
          disabled && "opacity-45",
        )}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-raised">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[image:var(--gradient-primary)]" />
          {ticks
            ? Array.from({ length: ticks }).map((_, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="absolute top-0 h-full w-px bg-border"
                  style={{ left: `${((index + 1) / (ticks + 1)) * 100}%` }}
                />
              ))
            : null}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block size-4 touch:size-6 shrink-0 rounded-full border-2 border-primary bg-surface",
            "shadow-[0_2px_10px_-2px_rgb(25_195_125/0.7)] transition-transform duration-150",
            "hover:scale-110 focus-visible:scale-110 active:scale-110 disabled:pointer-events-none",
          )}
        />
      </SliderPrimitive.Root>

      {dragging && format ? (
        <output
          aria-hidden
          className="force-ltr pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded-sm border border-border bg-overlay px-1.5 py-0.5 font-mono text-[11px] text-fg shadow-[var(--shadow-pop)]"
          style={{ left: `calc(${percent}% + ${(50 - percent) * 0.16}px)` }}
        >
          {format(value)}
        </output>
      ) : null}
    </div>
  );
}
