"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 touch:h-7 touch:w-13 cursor-pointer items-center rounded-full",
        "border border-border bg-raised transition-colors duration-200",
        "data-[state=checked]:border-primary/50 data-[state=checked]:bg-primary-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 touch:size-5.5 translate-x-1 rounded-full bg-subtle shadow-sm transition-all duration-200",
          "[transition-timing-function:var(--ease-spring)]",
          "data-[state=checked]:translate-x-[1.35rem] touch:data-[state=checked]:translate-x-[1.6rem]",
          "data-[state=checked]:bg-primary",
          // Mirror the travel distance in RTL instead of inheriting the flip.
          "rtl:-translate-x-1 rtl:data-[state=checked]:-translate-x-[1.35rem]",
        )}
      />
    </SwitchPrimitive.Root>
  );
});

export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  disabled,
  badge,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            "flex items-center gap-2 text-sm font-medium text-fg",
            !disabled && "cursor-pointer",
            disabled && "opacity-60",
          )}
        >
          {label}
          {badge}
        </label>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/**
 * Segmented control (single-select). Keyboard-navigable via Radix ToggleGroup,
 * with a spring-driven indicator that follows the active option.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  size = "md",
  full,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
  full?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-ink/50 p-1",
        full && "flex w-full",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroupPrimitive.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={typeof option.label === "string" ? option.label : undefined}
            className={cn(
              "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
              size === "sm" ? "h-7 px-2 text-xs" : "h-8 touch:h-11 px-3 text-sm",
              "text-muted hover:text-fg disabled:pointer-events-none disabled:opacity-40",
              active && "text-fg",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${label}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 36 }}
                className="absolute inset-0 -z-10 rounded-md border border-primary/30 bg-primary-soft"
              />
            ) : null}
            {option.icon ? (
              <span aria-hidden className="[&_svg]:size-3.5">
                {option.icon}
              </span>
            ) : null}
            <span className="truncate">{option.label}</span>
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
