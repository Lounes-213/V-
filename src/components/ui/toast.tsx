"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "info" | "success" | "warn" | "danger";

type ToastInput = {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastRecord = ToastInput & { id: string };

const ToastContext = React.createContext<{
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
} | null>(null);

const toneIcon: Record<ToastTone, React.ReactNode> = {
  info: <Info className="size-4 text-info" />,
  success: <CircleCheck className="size-4 text-primary" />,
  warn: <TriangleAlert className="size-4 text-warn" />,
  danger: <CircleAlert className="size-4 text-danger" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastRecord[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback((input: ToastInput) => {
    counter.current += 1;
    const id = `t${counter.current}`;
    setItems((current) => [...current.slice(-2), { ...input, id }]);
    return id;
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5200}>
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            duration={item.duration}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={cn(
              "panel group pointer-events-auto flex w-[min(26rem,calc(100vw-1.5rem))] items-start gap-3 p-3.5",
              "data-[state=open]:animate-[rise_0.24s_var(--ease-spring)_both]",
              "data-[swipe=end]:animate-none",
            )}
          >
            <span aria-hidden className="mt-0.5 shrink-0">
              {toneIcon[item.tone ?? "info"]}
            </span>
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-fg">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="mt-0.5 text-xs text-muted">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
              {item.action ? (
                <ToastPrimitive.Action
                  altText={item.action.label}
                  onClick={item.action.onClick}
                  className="mt-2 rounded-sm text-xs font-semibold text-primary hover:underline"
                >
                  {item.action.label}
                </ToastPrimitive.Action>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="-m-1.5 rounded-sm p-1.5 text-subtle transition-colors hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-auto sm:items-end sm:p-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
