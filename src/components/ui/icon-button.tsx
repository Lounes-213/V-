"use client";

import * as React from "react";
import { Tooltip } from "./tooltip";
import { cn } from "@/lib/cn";

type IconButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  /** Always required: an icon-only control must announce itself. */
  label: string;
  tooltip?: string;
  shortcut?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "ghost" | "outline";
  selected?: boolean;
  children: React.ReactNode;
};

const sizes = {
  sm: "size-8 touch:size-11",
  md: "size-9 touch:size-12",
  lg: "size-11 touch:size-14",
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tooltip, shortcut, size = "md", variant = "ghost", selected, className, children, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={selected === undefined ? undefined : selected}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-40",
        sizes[size],
        variant === "ghost" && "text-muted hover:bg-raised hover:text-fg",
        variant === "solid" && "bg-raised text-fg border border-border hover:border-border-strong",
        variant === "outline" && "border border-border-strong text-muted hover:text-fg",
        selected && "bg-primary-soft text-primary hover:text-primary",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="[&_svg]:size-[1.15rem]">
        {children}
      </span>
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip content={tooltip} shortcut={shortcut}>
      {button}
    </Tooltip>
  );
});
