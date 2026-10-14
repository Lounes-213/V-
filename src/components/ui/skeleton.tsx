import * as React from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} {...props} />;
}

/** Respects the surrounding text lines so loading never shifts layout. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : index % 2 ? "w-11/12" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("panel p-4", className)} aria-hidden>
      <Skeleton className="mb-3 aspect-video w-full rounded-lg" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-md border border-hairline p-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
