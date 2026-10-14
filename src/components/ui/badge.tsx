import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-raised text-muted",
        primary: "border-primary/35 bg-primary-soft text-primary",
        gold: "border-gold/35 bg-gold-soft text-gold",
        danger: "border-danger/35 bg-danger-soft text-danger",
        warn: "border-warn/35 bg-warn-soft text-warn",
        info: "border-info/35 bg-info-soft text-info",
        outline: "border-border-strong bg-transparent text-fg",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px] tracking-wide uppercase",
        md: "",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type BadgeProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Small circular score used by AI suggestions and Quran confidence chips. */
export function ScoreBadge({
  value,
  label,
  tone = "auto",
  size = 44,
  className,
}: {
  value: number;
  label: string;
  tone?: "auto" | "primary" | "gold" | "danger";
  size?: number;
  className?: string;
}) {
  const resolved =
    tone !== "auto" ? tone : value >= 78 ? "primary" : value >= 55 ? "gold" : "danger";
  const strokePercent = Math.max(0, Math.min(100, value));

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`${label}: ${value}%`}
    >
      <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            stroke={
              resolved === "primary"
                ? "var(--primary)"
                : resolved === "gold"
                  ? "var(--gold)"
                  : "var(--danger)"
            }
            strokeDasharray={`${(strokePercent / 100) * 97.4} 97.4`}
          />
        </svg>
        <span className="num-tabular text-xs font-semibold text-fg">{Math.round(value)}</span>
      </span>
    </span>
  );
}
