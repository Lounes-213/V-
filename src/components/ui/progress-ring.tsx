"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 4,
  label,
  sublabel,
  tone = "primary",
  className,
  indeterminate,
}: {
  /** 0–100. Always a real percentage, never a fake animation. */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  tone?: "primary" | "gold" | "danger";
  className?: string;
  indeterminate?: boolean;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const stroke = tone === "gold" ? "var(--gold)" : tone === "danger" ? "var(--danger)" : "var(--primary)";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="size-full -rotate-90"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
          aria-label={typeof label === "string" ? label : "Progress"}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{
              strokeDashoffset: circumference - (clamped / 100) * circumference,
            }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24 }}
          />
        </svg>
        {indeterminate ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="size-1.5 animate-ping rounded-full bg-primary" />
          </span>
        ) : (
          <span
            className="num-tabular absolute inset-0 grid place-items-center text-xs font-semibold text-fg"
            aria-hidden
          >
            {Math.round(clamped)}%
          </span>
        )}
      </div>
      {label || sublabel ? (
        <div className="min-w-0">
          {label ? <div className="text-sm font-medium text-fg">{label}</div> : null}
          {sublabel ? <div className="num-tabular text-xs text-muted">{sublabel}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "primary",
  label,
  indeterminate,
}: {
  value: number;
  className?: string;
  tone?: "primary" | "gold" | "danger";
  label?: string;
  indeterminate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 [transition-timing-function:var(--ease-expo)]",
          tone === "primary" && "bg-[image:var(--gradient-primary)]",
          tone === "gold" && "bg-[image:var(--gradient-gold)]",
          tone === "danger" && "bg-danger",
          indeterminate && "animate-[sweep_1.4s_linear_infinite] w-1/3",
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
