import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  interactive,
  selected,
  as: Tag = "div",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
  selected?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Tag
      data-selected={selected || undefined}
      className={cn(
        "panel relative transition-[border-color,transform,box-shadow] duration-200",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]",
        selected && "border-primary/50 shadow-[var(--shadow-glow)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 p-4", className)}>
      {icon ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-raised text-primary [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  align = "start",
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold text-fg sm:text-3xl">{title}</h2>
        {description ? <p className="mt-3 text-base text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-8 touch:min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
        selected
          ? "border-primary/45 bg-primary-soft text-primary"
          : "border-border bg-raised text-muted hover:border-border-strong hover:text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel p-3.5", className)}>
      <div className="flex items-center gap-2 text-muted">
        {icon ? (
          <span aria-hidden className="[&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="num-tabular mt-1.5 text-xl font-semibold text-fg">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-subtle">{hint}</div> : null}
    </div>
  );
}
