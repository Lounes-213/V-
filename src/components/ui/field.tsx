"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn("text-xs font-medium tracking-wide text-muted select-none", className)}
      {...props}
    />
  );
});

const controlBase = [
  "w-full rounded-md border border-border bg-ink/60 px-3 text-sm text-fg",
  "placeholder:text-subtle transition-colors duration-150",
  "hover:border-border-strong focus:border-primary/60",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-danger aria-invalid:focus:border-danger",
];

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(controlBase, "h-10 touch:h-12 [&::-webkit-search-cancel-button]:hidden", className)}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={3}
      className={cn(controlBase, "resize-none py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
  action,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  const hintId = hint ? `${htmlFor ?? "field"}-hint` : undefined;
  const errorId = error ? `${htmlFor ?? "field"}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer size-5 shrink-0 touch:size-6 rounded-sm border border-border-strong bg-ink/60",
        "grid place-items-center transition-colors",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary-soft",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        {props.checked === "indeterminate" ? (
          <Minus aria-hidden className="size-3.5" />
        ) : (
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(function SelectTrigger({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        controlBase,
        "flex h-10 touch:h-12 items-center justify-between gap-2 py-0 text-start",
        "data-[placeholder]:text-subtle",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

export function SelectContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-[85] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)]",
          "overflow-hidden rounded-md border border-border bg-overlay shadow-[var(--shadow-pop)]",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex h-9 touch:h-11 cursor-default items-center gap-2 rounded-sm px-2 ps-8 text-sm text-fg outline-none select-none",
        "data-[highlighted]:bg-primary-soft data-[highlighted]:text-fg data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute start-2 grid place-items-center">
        <Check aria-hidden className="size-3.5 text-primary" strokeWidth={3} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
