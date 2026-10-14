"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

type TabItem = {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Extra classes for the icon wrapper — e.g. reveal it only in a wide pane. */
  iconClassName?: string;
  badge?: React.ReactNode;
};

export function TabsList({
  items,
  className,
  variant = "pill",
  label,
  compact = false,
}: {
  items: TabItem[];
  className?: string;
  variant?: "pill" | "underline";
  label: string;
  /** Tighter type and padding, for panes narrower than the full desktop layout. */
  compact?: boolean;
}) {
  const active = React.useContext(ActiveTabContext);
  const reduce = useReducedMotion();

  return (
    <TabsPrimitive.List
      aria-label={label}
      className={cn(
        // Never let the strip widen its pane: it scrolls instead, which keeps the
        // document free of horizontal overflow at every desktop window size.
        "relative flex max-w-full min-w-0 items-center overflow-x-auto overscroll-x-contain",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        variant === "pill" && "gap-1 rounded-lg border border-border bg-ink/50 p-1",
        variant === "underline" && "gap-1 border-b border-border",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = active === item.value;
        return (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150",
              compact ? "min-h-8 px-2.5 py-1 text-[13px] touch:min-h-12" : "min-h-9 px-3 py-1.5 text-sm touch:min-h-12",
              "text-muted hover:text-fg data-[state=active]:text-fg",
              variant === "underline" && "rounded-none border-b-2 border-transparent px-2.5 data-[state=active]:border-primary",
              "data-[state=active]:bg-transparent",
            )}
          >
            {variant === "pill" && isActive ? (
              <motion.span
                layoutId={`tabs-pill-${label}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-md border border-primary/30 bg-primary-soft"
              />
            ) : null}
            {item.icon ? (
              <span aria-hidden className={cn("[&_svg]:size-4", item.iconClassName)}>
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
            {item.badge !== undefined ? (
              <span className="num-tabular rounded-full bg-raised px-1.5 text-[10px] text-muted">
                {item.badge}
              </span>
            ) : null}
          </TabsPrimitive.Trigger>
        );
      })}
    </TabsPrimitive.List>
  );
}

const ActiveTabContext = React.createContext<string | undefined>(undefined);

/**
 * Wraps Radix Tabs to expose the active value to `TabsList` so the sliding
 * indicator can live outside the trigger (Radix keeps the trigger unstyled).
 */
export function TabGroup({
  value,
  onValueChange,
  defaultValue,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = value ?? internal;

  const handle = React.useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  return (
    <ActiveTabContext.Provider value={current}>
      <TabsPrimitive.Root
        value={current}
        onValueChange={handle}
        className={cn("flex min-h-0 flex-col", className)}
      >
        {children}
      </TabsPrimitive.Root>
    </ActiveTabContext.Provider>
  );
}

export const TabPanel = TabsPrimitive.Content;

export function useActiveTab() {
  return React.useContext(ActiveTabContext);
}
