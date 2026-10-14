"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

/**
 * Tooltips never carry information that is unavailable elsewhere — they are a
 * convenience for pointer users, and every trigger keeps an aria-label.
 */
export function TooltipProvider({
  children,
  delayDuration = 320,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={120}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  shortcut,
  side = "top",
  align = "center",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {React.isValidElement(children) && children.type !== React.Fragment ? (
          children
        ) : (
          <span className="inline-flex">{children}</span>
        )}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={10}
          className={cn(
            "z-[80] flex max-w-72 items-center gap-2 rounded-md border border-border bg-overlay px-2.5 py-1.5",
            "text-xs font-medium text-fg shadow-[var(--shadow-pop)]",
            "animate-[rise_0.16s_var(--ease-expo)_both] select-none",
            className,
          )}
        >
          <span>{content}</span>
          {shortcut ? (
            <kbd className="force-ltr rounded-sm border border-border bg-ink px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {shortcut}
            </kbd>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { TooltipPrimitive };
