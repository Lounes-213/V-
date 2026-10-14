"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { useFormat } from "@/components/providers/number-format";
import { CAPTION_FONTS, findFont } from "@/lib/caption-fonts";
import { buildCueText, DEFAULT_RULES, detectDirection, groupWordsIntoCues, type Cue } from "@/lib/captions";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { outputToSource } from "@/lib/timeline";
import { resolvePreset } from "@/lib/presets";
import type { AspectRatio } from "@/lib/prefs-store";
import { cn } from "@/lib/cn";

const SAFE_INSETS: Record<AspectRatio, { top: number; bottom: number; side: number }> = {
  "9:16": { top: 8, bottom: 16, side: 6 },
  "1:1": { top: 6, bottom: 12, side: 6 },
  "16:9": { top: 6, bottom: 10, side: 5 },
};

export function CaptionOverlay({
  aspect,
  className,
  interactive = true,
}: {
  aspect: AspectRatio;
  className?: string;
  interactive?: boolean;
}) {
  const t = useTranslations("editor");
  const a11y = useTranslations("a11y");
  const { tc } = useFormat();

  const { project, playhead, activeWordId, safeAreas } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      playhead: state.playhead,
      activeWordId: state.activeWordId,
      safeAreas: state.safeAreas,
    })),
  );

  const updatePreset = useEditor((state) => state.updatePreset);
  const preset = resolvePreset(project.presetId, project.captionOverrides);
  const font = findFont(preset.fontId);
  const fontStack = CAPTION_FONTS.find((item) => item.id === preset.fontId)?.stack ?? font.stack;

  const cues = React.useMemo(() => {
    const rules = { ...DEFAULT_RULES, ...project.rules };
    return groupWordsIntoCues(project.words, rules);
  }, [project.words, project.rules]);

  const cue: Cue | undefined = React.useMemo(() => {
    const source = outputToSource(playhead, project.clips);
    if (source === null) return undefined;
    return cues.find((item) => source >= item.start && source <= item.end);
  }, [cues, playhead, project.clips]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const gesture = React.useRef({ x: 0, y: 0, offsetY: 0, scale: 1, startDistance: 0 });

  const scale = preset.emphasisScale;

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive) return;
    event.stopPropagation();
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    gesture.current = { ...gesture.current, x: event.clientX, y: event.clientY, offsetY: preset.offsetY };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging || !interactive) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const deltaY = (event.clientY - gesture.current.y) / box.height;
    // offsetY is a signed fraction of the frame height, 0 = centred band.
    const next = Math.max(-0.42, Math.min(0.42, gesture.current.offsetY + deltaY));
    updatePreset({ offsetY: Number(next.toFixed(3)) });
  };

  const onPointerUp = () => setDragging(false);

  /* Two-finger scale: touch only, never blocks page scroll. */
  const onTouchStart = (event: React.TouchEvent) => {
    if (!interactive || event.touches.length !== 2) return;
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    gesture.current.startDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    gesture.current.scale = preset.emphasisScale;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!interactive || event.touches.length !== 2 || gesture.current.startDistance === 0) return;
    event.preventDefault();
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / gesture.current.startDistance;
    updatePreset({
      emphasisScale: Number(Math.max(0.6, Math.min(1.6, gesture.current.scale * ratio)).toFixed(2)),
    });
  };

  const insets = SAFE_INSETS[aspect];
  const direction = cue ? detectDirection(cue.text) : "rtl";
  const text = cue ? buildCueText(cue.words, { ...DEFAULT_RULES, ...project.rules }) : "";

  // Vertical placement: bottom/top anchors plus the user's offset.
  const topPercent =
    preset.position === "top"
      ? 12 - preset.offsetY * 100
      : preset.position === "middle"
        ? 50 - preset.offsetY * 100
        : 82 - preset.offsetY * 100;

  const background =
    preset.background === "none"
      ? "transparent"
      : preset.background === "blur"
        ? "rgba(11,15,20,0.28)"
        : `color-mix(in srgb, var(--ink) ${Math.round(preset.backgroundOpacity * 100)}%, transparent)`;

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      {safeAreas ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute rounded-md border border-dashed border-gold/45"
            style={{
              inset: `${insets.top}% ${insets.side}% ${insets.bottom}% ${insets.side}%`,
            }}
          >
            <span className="absolute -top-5 start-0 rounded-sm bg-gold/85 px-1 text-[9px] font-semibold text-gold-fg">
              {t("safeAreas")}
            </span>
          </div>
          <div className="absolute inset-x-0 top-0 h-[8%] bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.05)_0_6px,transparent_6px_12px)]" />
          <div className="absolute inset-x-0 bottom-0 h-[16%] bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.05)_0_6px,transparent_6px_12px)]" />
        </div>
      ) : null}

      {cue || project.words.length === 0 ? (
        <div
          role={interactive ? "group" : undefined}
          aria-label={interactive ? a11y("captionOverlayLabel") : undefined}
          dir={direction}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          className={cn(
            "absolute inset-x-[6%] flex flex-col items-center",
            interactive && "cursor-grab touch-drag active:cursor-grabbing",
            dragging && "opacity-90",
          )}
          style={{
            top: `${topPercent}%`,
            transform: `translateY(-50%) scale(${scale})`,
            transition: dragging ? "none" : "transform 200ms var(--ease-spring)",
            alignItems:
              preset.alignment === "start" ? "flex-start" : preset.alignment === "end" ? "flex-end" : "center",
          }}
        >
          <p
            className={cn(
              "max-w-full whitespace-pre-line text-center font-semibold",
              preset.uppercase && "uppercase",
            )}
            style={{
              fontFamily: fontStack,
              fontSize: `clamp(0.7rem, ${preset.size / 12}cqw, 3rem)`,
              fontWeight: preset.weight,
              color: preset.color,
              lineHeight: preset.lineHeight + (font.lineHeightBonus ?? 0),
              letterSpacing: `${preset.letterSpacing}em`,
              textShadow: preset.shadow ? "0 2px 12px rgba(0,0,0,0.65)" : "none",
              WebkitTextStroke: preset.outlineWidth > 0 ? `${preset.outlineWidth * 0.5}px rgba(4,10,7,0.9)` : undefined,
              background,
              padding: `${preset.padding * 0.5}px ${preset.padding}px`,
              borderRadius: preset.radius,
              textAlign: preset.alignment === "start" ? "start" : preset.alignment === "end" ? "end" : "center",
            }}
          >
            {(cue ? text : t("emptyTranscript")).split("\n").map((line, lineIndex) => (
              <React.Fragment key={`line-${lineIndex}`}>
                {lineIndex > 0 ? "\n" : null}
                {line.split(" ").map((token, tokenIndex) => {
                  const word = cue?.words.find((candidate) => candidate.text === token);
                  const isActive = word ? word.id === activeWordId : false;
                  return (
                    <span
                      key={`${token}-${tokenIndex}`}
                      style={{
                        color: isActive && preset.highlightActiveWord ? preset.highlightColor : undefined,
                        transition: "color 140ms ease-out",
                      }}
                    >
                      {token}
                      {tokenIndex < line.split(" ").length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </React.Fragment>
            ))}
          </p>

          {interactive ? (
            <p className="mt-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-medium text-white/70 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100 fine:opacity-60">
              {t("captionDragHint")} · {t("captionScaleHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      <output className="sr-only" aria-live="off">
        {cue ? `${tc(cue.start)} ${text}` : ""}
      </output>
    </div>
  );
}
