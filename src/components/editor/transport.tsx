"use client";

import { useTranslations } from "next-intl";
import { Maximize2, Pause, Play, Repeat, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useFormat } from "@/components/providers/number-format";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { totalDuration } from "@/lib/timeline";
import { cn } from "@/lib/cn";

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function Transport({
  muted,
  onMuteChange,
  onFit,
}: {
  muted: boolean;
  onMuteChange: (value: boolean) => void;
  onFit?: () => void;
}) {
  const t = useTranslations("editor");
  const { tc } = useFormat();

  const { playing, speed, playhead, loopRange } = useEditor(
    useShallow((state: EditorState) => ({
      playing: state.playing,
      speed: state.speed,
      playhead: state.playhead,
      loopRange: state.loopRange,
    })),
  );
  const clips = useEditor((state) => state.project.clips);
  const duration = totalDuration(clips);
  const progress = duration === 0 ? 0 : (playhead / duration) * 100;

  const toggle = useEditor((state) => state.toggle);
  const setSpeed = useEditor((state) => state.setSpeed);
  const setPlayhead = useEditor((state) => state.setPlayhead);
  const seekWord = useEditor((state) => state.seekWord);
  const seekClip = useEditor((state) => state.seekClip);
  const setLoop = useEditor((state) => state.setLoop);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="num-tabular shrink-0 font-mono text-xs text-muted">{tc(playhead)}</span>
        <div className="relative h-7 flex-1">
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-[image:var(--gradient-primary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.05}
            value={playhead}
            onChange={(event) => setPlayhead(Number(event.target.value))}
            aria-label={t("timelinePlayhead")}
            aria-valuetext={tc(playhead)}
            className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:touch:size-6
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface
              [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:touch:size-6
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
              [&::-webkit-slider-thumb]:bg-surface"
          />
        </div>
        <span className="num-tabular shrink-0 font-mono text-xs text-subtle">{tc(duration)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton label={t("transportPrev")} tooltip={t("transportPrev")} shortcut="←" size="sm" onClick={() => seekWord(-1)}>
            <SkipBack />
          </IconButton>
          <IconButton label={t("transportNext")} tooltip={t("transportNext")} shortcut="→" size="sm" onClick={() => seekWord(1)}>
            <SkipForward />
          </IconButton>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="primary"
            size="sm"
            onClick={toggle}
            aria-pressed={playing}
            className="min-w-24"
            icon={playing ? <Pause /> : <Play />}
          >
            {playing ? t("pause") : t("play")}
          </Button>
          <IconButton
            label={t("transportLoop")}
            tooltip={t("transportLoop")}
            size="sm"
            selected={loopRange !== null}
            onClick={() =>
              setLoop(loopRange ? null : { start: playhead, end: Math.min(duration, playhead + 5) })
            }
          >
            <Repeat />
          </IconButton>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-border bg-raised p-0.5">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
                className={cn(
                  "num-tabular min-w-9 rounded-sm px-1.5 py-1 font-mono text-[10px] transition-colors touch:min-w-11 touch:py-2",
                  speed === value ? "bg-primary-soft text-primary" : "text-subtle hover:text-fg",
                )}
              >
                {value}×
              </button>
            ))}
          </div>
          <IconButton
            label={muted ? t("transportVolume") : t("transportMute")}
            tooltip={muted ? t("transportVolume") : t("transportMute")}
            size="sm"
            onClick={() => onMuteChange(!muted)}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </IconButton>
          <IconButton
            label={t("timelineFit")}
            tooltip={t("timelineFit")}
            size="sm"
            onClick={() => (onFit ? onFit() : seekClip(1))}
          >
            <Maximize2 />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
