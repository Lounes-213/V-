"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type Snap = 30 | 60 | 95;
const SNAPS: Snap[] = [30, 60, 95];

function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* Haptics are a nicety, never a dependency. */
  }
}

/**
 * Mobile editor surface with 30/60/95% snap points.
 *
 * Dragging writes straight to the element's custom property (no React state per
 * frame) so a finger drag stays at 60fps, and only commits to state on release.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  snap = 60,
  onSnapChange,
  children,
  footer,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  snap?: Snap;
  onSnapChange?: (snap: Snap) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [activeSnap, setActiveSnap] = React.useState<Snap>(snap);
  const [pulse, setPulse] = React.useState(false);
  const start = React.useRef({ y: 0, height: 0, atTop: true });

  // Reopening resets the sheet to the snap it was asked for. Doing it during
  // render (instead of in an effect) means the sheet never animates up at the
  // wrong height first.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setActiveSnap(snap);
  }

  const commitSnap = React.useCallback(
    (next: Snap) => {
      setActiveSnap((current) => {
        if (current !== next) {
          haptic(8);
          setPulse(true);
          window.setTimeout(() => setPulse(false), 220);
        }
        return next;
      });
      onSnapChange?.(next);
    },
    [onSnapChange],
  );

  React.useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.setProperty("--sheet-h", `${(activeSnap / 100) * window.innerHeight}px`);
    const onResize = () => {
      el.style.setProperty("--sheet-h", `${(activeSnap / 100) * window.innerHeight}px`);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeSnap, open]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!dismissible) return;
    const el = sheetRef.current;
    if (!el) return;
    const body = bodyRef.current;
    start.current = {
      y: event.clientY,
      height: el.clientHeight,
      atTop: !body || body.scrollTop <= 0,
    };
    setDragging(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging) return;
    const el = sheetRef.current;
    if (!el) return;
    const delta = event.clientY - start.current.y;
    // Dragging up always resizes; dragging down only when the body is scrolled to top.
    if (delta > 0 && !start.current.atTop) return;
    const next = Math.min(window.innerHeight * 0.96, Math.max(120, start.current.height - delta));
    el.style.setProperty("--sheet-h", `${next}px`);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const el = sheetRef.current;
    if (!el) return;
    const height = el.clientHeight;
    const viewport = window.innerHeight;

    if (dismissible && height < viewport * 0.22) {
      haptic(12);
      onOpenChange(false);
      return;
    }

    const nearest = SNAPS.reduce<Snap>((best, candidate) => {
      const a = Math.abs((candidate / 100) * viewport - height);
      const b = Math.abs((best / 100) * viewport - height);
      return a < b ? candidate : best;
    }, activeSnap);
    commitSnap(nearest);
  };

  const onHandleKeyDown = (event: React.KeyboardEvent) => {
    const index = SNAPS.indexOf(activeSnap);
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commitSnap(SNAPS[Math.min(SNAPS.length - 1, index + 1)] ?? 95);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = SNAPS[Math.max(0, index - 1)] ?? 30;
      if (next === 30 && activeSnap === 30 && dismissible) onOpenChange(false);
      else commitSnap(next);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[60] bg-scrim backdrop-blur-[2px]",
            "data-[state=open]:animate-[rise_0.2s_ease-out_both]",
          )}
        />
        <DialogPrimitive.Content
          ref={sheetRef}
          aria-describedby={description ? undefined : "sheet-desc"}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex flex-col",
            "h-[var(--sheet-h,60vh)] max-h-[96dvh] rounded-t-2xl border border-border bg-surface",
            "shadow-[0_-24px_60px_-30px_rgb(0_0_0/0.9)]",
            !dragging && "transition-[height] duration-300 [transition-timing-function:var(--ease-spring)]",
            "touch-drag",
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="shrink-0 cursor-grab px-4 pt-2 pb-1 select-none active:cursor-grabbing"
          >
            <button
              type="button"
              aria-label="Resize panel. Arrow up to expand, arrow down to shrink."
              onKeyDown={onHandleKeyDown}
              className={cn(
                "mx-auto flex h-6 w-full items-center justify-center rounded-full",
                pulse && "bg-primary-soft",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-11 rounded-full bg-border-strong transition-all duration-200",
                  dragging && "w-16 bg-primary",
                  pulse && "bg-primary",
                )}
              />
            </button>
            <div className="mt-1 flex items-center justify-between gap-3 pb-2">
              <DialogPrimitive.Title className="text-base font-semibold text-fg">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close panel"
                className="-m-2 rounded-md p-2 text-subtle transition-colors hover:text-fg"
              >
                <X aria-hidden className="size-5" />
              </DialogPrimitive.Close>
            </div>
            {description ? (
              <DialogPrimitive.Description className="pb-2 text-xs text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description id="sheet-desc" className="sr-only">
                {typeof title === "string" ? title : "Panel"}
              </DialogPrimitive.Description>
            )}
          </div>
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4"
            style={{ touchAction: "pan-y" }}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-hairline bg-raised/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
