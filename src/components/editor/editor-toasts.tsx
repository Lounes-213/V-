"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useEditor } from "@/lib/editor-store";
import { cn } from "@/lib/cn";

const ICONS = {
  info: <Info className="size-4 text-info" />,
  success: <CircleCheck className="size-4 text-primary" />,
  warn: <TriangleAlert className="size-4 text-warn" />,
  danger: <TriangleAlert className="size-4 text-danger" />,
} as const;

/**
 * Editor feedback (undo labels, cuts, warnings). Separate from the global toast
 * host so it can live inside the editor's stacking context on mobile.
 */
export function EditorToasts() {
  const toasts = useEditor((state) => state.toasts);
  const dismiss = useEditor((state) => state.dismissToast);
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[95] flex flex-col items-center gap-2 px-3 desk:bottom-6 desk:items-start desk:ps-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto flex w-[min(26rem,100%)] items-start gap-2.5 rounded-lg border p-3",
              "border-border bg-surface/95 shadow-[var(--shadow-pop)] backdrop-blur",
            )}
          >
            <span aria-hidden className="mt-0.5 shrink-0">
              {ICONS[toast.tone]}
            </span>
            <p className="min-w-0 flex-1 text-xs text-fg">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="-m-1 rounded-sm p-1 text-subtle transition-colors hover:text-fg"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
