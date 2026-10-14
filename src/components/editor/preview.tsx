"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { Crop, Film, Play, ShieldCheck } from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { Segmented } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { useShallowSelectClipTransform } from "./use-clip-transform";
import { outputToSource, totalDuration } from "@/lib/timeline";
import type { AspectRatio } from "@/lib/prefs-store";
import { cn } from "@/lib/cn";
import { CaptionOverlay } from "./caption-overlay";
import { Transport } from "./transport";
import { usePlayback } from "./use-playback";
import { WaveformCanvas } from "./waveform-canvas";
import { usePeaks } from "@/lib/peaks";

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "9:16": "aspect-[9/16] max-h-full",
  "1:1": "aspect-square max-h-full",
  "16:9": "aspect-video max-h-full",
};

export function Preview({ mediaUrl, className }: { mediaUrl?: string; className?: string }) {
  const t = useTranslations("editor");
  const landing = useTranslations("landing");
  const { tc } = useFormat();

  const { project, playing, safeAreas, showWaveform } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      playing: state.playing,
      safeAreas: state.safeAreas,
      showWaveform: state.showWaveform,
    })),
  );
  const setAspect = useEditor((state) => state.setAspect);
  const toggle = useEditor((state) => state.toggle);
  const setSafeAreas = useEditor((state) => state.setSafeAreas);

  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [muted, setMuted] = React.useState(false);
  usePlayback(mediaRef);

  // The selected (or active-at-playhead) clip's CapCut-style transform, applied
  // to the picture the same way the export renderer applies it on canvas.
  const transformStyle = useShallowSelectClipTransform();

  const duration = totalDuration(project.clips);
  const peaks = usePeaks(project.id, Math.max(1, project.durationSec || duration));
  const hasVideo = Boolean(mediaUrl);

  React.useEffect(() => {
    const media = mediaRef.current;
    if (media) media.muted = muted || !playing;
  }, [muted, playing]);

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label={t("aspectSwitcher")}
          value={project.aspect}
          onValueChange={(value) => setAspect(value)}
          size="sm"
          options={[
            { value: "9:16", label: "9:16" },
            { value: "1:1", label: "1:1" },
            { value: "16:9", label: "16:9" },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconButton
            label={t("safeAreas")}
            tooltip={t("safeAreasDesc")}
            size="sm"
            selected={safeAreas}
            onClick={() => setSafeAreas(!safeAreas)}
          >
            <Crop />
          </IconButton>
          <Badge tone={hasVideo ? "primary" : "neutral"}>
            {hasVideo ? project.sourceName ?? t("preview") : t("preview")}
          </Badge>
        </div>
      </div>

      {/* The stage: one container query context so caption type scales with the frame. */}
      <div
        className={cn(
          "@container relative isolate grid min-h-0 flex-1 place-items-center overflow-hidden rounded-xl",
          "border border-border bg-ink-deep p-2",
        )}
      >
        <div
          aria-hidden
          className="grid-backdrop pointer-events-none absolute inset-0 opacity-60"
        />

        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-ink shadow-[var(--shadow-pop)]",
            ASPECT_CLASS[project.aspect],
          )}
          style={{ maxHeight: "100%", width: "auto" }}
        >
          {hasVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={mediaUrl}
              playsInline
              muted={muted}
              preload="metadata"
              style={transformStyle}
              className="size-full object-cover"
              aria-label={landing("featureSafeTitle")}
            />
          ) : (
            <div className="size-full bg-[radial-gradient(120%_80%_at_50%_0%,rgb(25_195_125/0.16),transparent_62%)]">
              <div className="grid size-full place-items-center p-6 text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-raised text-primary">
                    <Film aria-hidden className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-fg">{project.name || t("untitled")}</p>
                  <p className="num-tabular mt-1 font-mono text-xs text-subtle">
                    {tc(duration)} · {project.aspect}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-medium text-primary">
                    <ShieldCheck aria-hidden className="size-3" />
                    {landing("privacyPointLocal")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <CaptionOverlay aspect={project.aspect} />

          {/* tap-to-play on touch, click on desktop: one target, no hover-only affordance */}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? t("pause") : t("play")}
            className="absolute inset-0 z-30 cursor-pointer bg-transparent"
          />
          {!playing ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
            >
              <span className="grid size-14 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur">
                <Play className="size-6 translate-x-0.5" />
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {showWaveform ? (
        <div className="relative h-12 overflow-hidden rounded-lg border border-border bg-ink/60">
          <WaveformCanvas
            peaks={peaks}
            duration={Math.max(1, project.durationSec || duration)}
            fromSec={Math.max(0, (outputToSource(useEditor.getState().playhead, project.clips) ?? 0) - 6)}
            toSec={(outputToSource(useEditor.getState().playhead, project.clips) ?? 0) + 6}
            height={48}
            tone="primary"
          />
        </div>
      ) : null}

      <Transport muted={muted} onMuteChange={setMuted} />
    </div>
  );
}
