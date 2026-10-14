"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/cn";

const PRESETS = [
  { group: "brand", colors: ["#19C37D", "#E8B04B", "#F0506E", "#56A8F5", "#E8EDF4"] },
  { group: "ink", colors: ["#0B0F14", "#121821", "#1A2230", "#263042", "#8B97A8"] },
  { group: "reels", colors: ["#FF3B5C", "#FFB020", "#00E0B8", "#7C5CFF", "#FFFFFF"] },
] as const;

export function ColorPicker({
  value,
  onChange,
  label,
  presets = true,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  presets?: boolean;
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = React.useState(() => value.replace("#", ""));
  // Adjusting state during render is the documented way to react to a changed
  // prop: an effect would paint the old value for one frame first.
  const [lastValue, setLastValue] = React.useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.replace("#", ""));
  }

  const commit = (next: string) => {
    const normalized = next.startsWith("#") ? next : `#${next}`;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) onChange(normalized.toUpperCase());
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button
            id={id}
            type="button"
            aria-label={`${label}: ${value}`}
            className="size-9 touch:size-11 shrink-0 rounded-md border border-border-strong shadow-[0_1px_2px_rgb(0_0_0/0.4)] transition-transform hover:scale-105"
            style={{ background: value }}
          />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-[88] w-64 rounded-lg border border-border bg-overlay p-3 shadow-[var(--shadow-pop)]"
          >
            <PopoverPrimitive.Title className="sr-only">{label}</PopoverPrimitive.Title>
            <div className="space-y-3">
              {presets
                ? PRESETS.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-subtle uppercase">
                        {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={color}
                            onClick={() => onChange(color)}
                            className={cn(
                              "size-7 rounded-md border transition-transform hover:scale-110",
                              value.toUpperCase() === color
                                ? "border-primary ring-2 ring-primary/40"
                                : "border-hairline",
                            )}
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                : null}

              <label className="flex items-center gap-2">
                <span className="flex h-9 flex-1 items-center gap-1.5 rounded-md border border-border bg-ink/60 px-2">
                  <span className="font-mono text-xs text-subtle">#</span>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.replace("#", ""))}
                    onBlur={(event) => commit(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commit(draft);
                    }}
                    aria-label={`${label} hex value`}
                    maxLength={6}
                    className="force-ltr w-full bg-transparent font-mono text-xs text-fg uppercase outline-none"
                  />
                </span>
                <span className="relative grid size-9 place-items-center rounded-md border border-border bg-raised">
                  <Pipette aria-hidden className="size-4 text-muted" />
                  <input
                    type="color"
                    value={value.length === 7 ? value : "#19C37D"}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    aria-label={`Pick ${label.toLowerCase()} visually`}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </span>
              </label>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <output className="force-ltr font-mono text-xs text-muted uppercase">{value}</output>
    </div>
  );
}
