"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { CAPTION_FONTS, findFont, registerUploadedFont, type FontSpec } from "@/lib/caption-fonts";
import { cn } from "@/lib/cn";
import { Button } from "./button";

const ARABIC_SAMPLE = "الحمد لله رب العالمين";
const LATIN_SAMPLE = "Tonight, Rabat";

export function FontPicker({
  value,
  onChange,
  label,
  fonts = CAPTION_FONTS,
  extraFonts = [],
  onFontUploaded,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Visibly offered faces — callers narrow this for Quran-only styling. */
  fonts?: FontSpec[];
  extraFonts?: FontSpec[];
  onFontUploaded?: (font: FontSpec) => void;
  className?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const offeredFonts = React.useMemo(() => [...fonts, ...extraFonts], [fonts, extraFonts]);
  const active = findFont(value);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const font = await registerUploadedFont(file);
      onFontUploaded?.(font);
      onChange(font.id);
    } catch {
      setError("That file could not be read as a font. Try .ttf, .otf or .woff2.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)} role="radiogroup" aria-label={label}>
      {offeredFonts.map((font) => {
        const selected = font.id === active.id;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(font.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-start transition-colors",
              selected
                ? "border-primary/50 bg-primary-soft"
                : "border-border hover:border-border-strong hover:bg-raised",
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                {font.label}
                <span className="rounded-full border border-border px-1.5 text-[10px] font-normal text-subtle">
                  {font.script === "arabic" ? "AR" : font.script === "latin" ? "LAT" : "AR/LAT"}
                </span>
              </span>
              <span className="mt-1 block truncate text-xs text-subtle">{font.license}</span>
            </span>
            <span
              dir={font.script === "latin" ? "ltr" : "rtl"}
              className="shrink-0 text-lg text-muted"
              style={{ fontFamily: font.stack, lineHeight: 1.9 }}
            >
              {font.script === "latin" ? LATIN_SAMPLE : ARABIC_SAMPLE}
            </span>
          </button>
        );
      })}

      <div className="pt-1">
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          full
          loading={uploading}
          icon={<Upload />}
          onClick={() => inputRef.current?.click()}
          className="justify-start border border-dashed border-border"
        >
          Add your own font
        </Button>
        {error ? (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
