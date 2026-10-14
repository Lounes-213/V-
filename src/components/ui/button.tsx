"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "font-medium transition-[transform,background-color,box-shadow,border-color,color] duration-200",
    "[transition-timing-function:var(--ease-spring)]",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    "aria-disabled:pointer-events-none aria-disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "text-primary-fg bg-[image:var(--gradient-primary)] shadow-[0_1px_0_0_rgb(255_255_255/0.14)_inset] hover:brightness-108 hover:shadow-[var(--shadow-glow)]",
        gold: "text-gold-fg bg-[image:var(--gradient-gold)] shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset] hover:brightness-105 hover:shadow-[var(--shadow-glow-gold)]",
        secondary:
          "bg-raised text-fg border border-border hover:border-border-strong hover:bg-overlay",
        outline: "border border-border-strong text-fg hover:bg-primary-soft hover:border-primary/45",
        ghost: "text-muted hover:bg-raised hover:text-fg",
        danger: "bg-danger text-danger-fg hover:brightness-110",
        "danger-ghost": "text-danger hover:bg-danger-soft",
        link: "text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        xs: "h-8 rounded-sm px-2.5 text-xs touch:h-11 touch:px-3.5",
        sm: "h-9 rounded-md px-3 text-sm touch:h-11 touch:px-4",
        md: "h-11 rounded-md px-4 text-sm touch:h-12",
        lg: "h-12 rounded-lg px-5 text-base touch:h-14",
        xl: "h-14 rounded-xl px-7 text-lg",
        icon: "size-9 rounded-md touch:size-12",
        "icon-sm": "size-8 rounded-sm touch:size-11",
        "icon-lg": "size-11 rounded-lg touch:size-14",
      },
      full: { true: "w-full", false: "" },
      pill: { true: "rounded-full", false: "" },
    },
    defaultVariants: { variant: "secondary", size: "md", full: false, pill: false },
  },
);

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element instead — icons and loading are not applied. */
    asChild?: boolean;
    /** Shows a spinner and keeps the label for layout stability. */
    loading?: boolean;
    loadingLabel?: string;
    icon?: React.ReactNode;
    iconEnd?: React.ReactNode;
  };

/**
 * `asChild` is a pure pass-through: the caller's element becomes the button, so
 * we forward only className and event props. Icons, spinners and `type` belong
 * to the real-button branch — forwarding them would land on the child element
 * (and, when the child is a link/fragment, produce React warnings).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    full,
    pill,
    asChild,
    loading = false,
    loadingLabel,
    icon,
    iconEnd,
    children,
    disabled,
    type,
    ...props
  },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, full, pill }), className);

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin" />
          <span className="sr-only">{loadingLabel ?? "…"}</span>
          <span aria-hidden className="opacity-70">
            {children}
          </span>
        </>
      ) : (
        <>
          {icon ? (
            <span aria-hidden className="shrink-0 [&_svg]:size-4">
              {icon}
            </span>
          ) : null}
          {children}
          {iconEnd ? (
            <span aria-hidden className="shrink-0 [&_svg]:size-4">
              {iconEnd}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
});

export { buttonVariants };
