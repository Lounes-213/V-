"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  hideClose,
  size = "md",
  footer,
}: {
  className?: string;
  children: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  hideClose?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-[70] bg-scrim backdrop-blur-[3px]",
          "data-[state=open]:animate-[rise_0.18s_ease-out_both]",
          "motion-reduce:animate-none",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-[71] flex flex-col border border-border bg-surface shadow-[var(--shadow-pop)]",
          // Phone: anchored sheet that can never fight the keyboard.
          "phone:inset-x-0 phone:bottom-0 phone:max-h-[92dvh] phone:rounded-t-2xl phone:rounded-b-none",
          "phone:data-[state=open]:animate-[rise_0.26s_var(--ease-spring)_both]",
          // Tablet and up: centred dialog with a real max height.
          "tablet:top-1/2 tablet:left-1/2 tablet:max-h-[86dvh] tablet:w-[min(92vw,var(--dlg-w))]",
          "tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-2xl",
          "desk:top-1/2 desk:left-1/2 desk:max-h-[86dvh] desk:w-[min(92vw,var(--dlg-w))]",
          "desk:-translate-x-1/2 desk:-translate-y-1/2 desk:rounded-2xl",
          size === "sm" && "[--dlg-w:26rem] phone:[--dlg-w:auto]",
          size === "md" && "[--dlg-w:34rem] phone:[--dlg-w:auto]",
          size === "lg" && "[--dlg-w:46rem] phone:[--dlg-w:auto]",
          size === "xl" && "[--dlg-w:64rem] phone:[--dlg-w:auto]",
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-hairline p-4 phone:pt-5">
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-lg font-semibold text-fg">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {typeof title === "string" ? title : "Dialog"}
              </DialogPrimitive.Description>
            )}
          </div>
          {hideClose ? null : (
            <DialogPrimitive.Close asChild>
              <IconButton label="Close dialog" size="sm" variant="ghost">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-hairline p-4 phone:pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
