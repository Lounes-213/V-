"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/* ---------------------------------------------------------------- menu -- */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  align = "end",
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={6}
        collisionPadding={10}
        className={cn(
          "z-[86] min-w-52 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-[var(--shadow-pop)]",
          "data-[state=open]:animate-[rise_0.16s_var(--ease-expo)_both]",
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  icon,
  selected,
  shortcut,
  danger,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  icon?: React.ReactNode;
  selected?: boolean;
  shortcut?: string;
  danger?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex h-9 touch:h-11 cursor-default items-center gap-2.5 rounded-sm px-2 text-sm outline-none select-none",
        "data-[highlighted]:bg-primary-soft data-[disabled]:opacity-40",
        danger ? "text-danger data-[highlighted]:bg-danger-soft" : "text-fg",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="shrink-0 text-muted [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <kbd className="force-ltr shrink-0 font-mono text-[10px] text-subtle">{shortcut}</kbd>
      ) : null}
      {selected ? <Check aria-hidden className="size-3.5 shrink-0 text-primary" /> : null}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2 py-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase", className)}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-hairline" />;
}

/* ---------------------------------------------------------- scroll area -- */

export function ScrollArea({
  className,
  children,
  viewportClassName,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className={cn("size-full", viewportClassName)}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none p-0.5 select-none"
      >
        <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-border-strong" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}

/* ----------------------------------------------------------- accordion -- */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  value,
  question,
  children,
}: {
  value: string;
  question: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="border-b border-hairline last:border-b-0"
    >
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-start text-base font-medium text-fg transition-colors hover:text-primary">
          <span>{question}</span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden text-sm text-muted data-[state=closed]:hidden">
        <div className="pb-4 leading-relaxed">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

/* -------------------------------------------------------------- avatar -- */

export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return (
    <AvatarPrimitive.Root
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-raised",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="text-xs font-semibold text-muted">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Separator({ className }: { className?: string }) {
  return <SeparatorPrimitive.Root className={cn("h-px w-full bg-hairline", className)} />;
}

/* ------------------------------------------------------------ states ---- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-border bg-raised text-primary [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  details,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  details?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-danger/40 bg-danger-soft/40 px-5 py-6 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {details ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Hide details" : "Show details"}
          </Button>
        ) : null}
      </div>
      {open && details ? (
        <pre className="force-ltr mt-3 max-h-40 overflow-auto rounded-md border border-border bg-ink p-3 text-start font-mono text-[11px] text-muted">
          {details}
        </pre>
      ) : null}
    </div>
  );
}
