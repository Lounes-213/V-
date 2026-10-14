"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, BookOpen, Captions, Crop, Download, Palette, Redo2, Scissors, Undo2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/components/providers/number-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { BottomSheet, type Snap } from "@/components/ui/bottom-sheet";
import { AlignSurahDialog } from "@/components/quran/align-surah-dialog";
import { putProject } from "@/lib/db";
import { useEditor, type EditorState, type MobileTab } from "@/lib/editor-store";
import { nearestOutputTime, orderedClips, totalDuration } from "@/lib/timeline";
import { usePeaks } from "@/lib/peaks";
import { cn } from "@/lib/cn";
import { CaptionOverlay } from "./caption-overlay";
import { Inspector } from "./inspector";
import { SuggestionsPanel } from "./suggestions-panel";
import { Timeline } from "./timeline";
import { TranscriptPanel } from "./transcript-panel";
import { WaveformCanvas } from "./waveform-canvas";
import { usePlayback } from "./use-playback";

function haptic(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* Haptics are a nicety. */
  }
}

export function MobileEditor({ mediaUrl }: { mediaUrl?: string }) {
  const t = useTranslations("editor");
  const common = useTranslations("common");
  const a11y = useTranslations("a11y");
  const { tc } = useFormat();

  const { project, playing, playhead, mobileTab, sheetOpen, sheetSnap, safeAreas, snapping, dirty } =
    useEditor(
      useShallow((state: EditorState) => ({
        project: state.project,
        playing: state.playing,
        playhead: state.playhead,
        mobileTab: state.mobileTab,
        sheetOpen: state.mobileSheetOpen,
        sheetSnap: state.mobileSheetSnap,
        safeAreas: state.safeAreas,
        snapping: state.snapping,
        dirty: state.dirty,
      })),
    );

  const setMobileTab = useEditor((state) => state.setMobileTab);
  const setMobileSheet = useEditor((state) => state.setMobileSheet);
  const toggle = useEditor((state) => state.toggle);
  const setSafeAreas = useEditor((state) => state.setSafeAreas);
  const undo = useEditor((state) => state.undo);
  const redo = useEditor((state) => state.redo);
  const split = useEditor((state) => state.splitAtPlayhead);
  const setPlayhead = useEditor((state) => state.setPlayhead);
  const selectClip = useEditor((state) => state.selectClip);

  const mediaRef = React.useRef<HTMLVideoElement | null>(null);
  usePlayback(mediaRef);

  const loadProject = useEditor((state) => state.loadProject);

  const [exportOpen, setExportOpen] = React.useState(false);
  const [alignSurahOpen, setAlignSurahOpen] = React.useState(false);
  const duration = totalDuration(project.clips);
  const clips = React.useMemo(() => orderedClips(project.clips), [project.clips]);
  const peaks = usePeaks(project.id, Math.max(1, project.durationSec || duration));

  /* Landscape phones: keep the preview beside the sheets instead of above them. */
  const landscape = useReactLandscape();

  // Phones start muted: autoplay-with-sound is blocked anyway, and it keeps
  // one-handed editing from blasting audio in public.
  React.useEffect(() => {
    const media = mediaRef.current;
    if (media) media.muted = true;
  }, []);

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: "clips", label: t("tabClips"), icon: <Scissors /> },
    { id: "words", label: t("tabWords"), icon: <Captions /> },
    { id: "style", label: t("tabStyle"), icon: <Palette /> },
    { id: "export", label: t("tabExportMobile"), icon: <Download /> },
  ];

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-ink pb-safe">
      {/* --------------------------------------------------------- header -- */}
      <header className="flex h-12 shrink-0 items-center gap-1 px-2 pt-safe">
        <Link
          href="/dashboard"
          aria-label={t("back")}
          className="inline-flex size-11 items-center justify-center rounded-md text-muted"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
          {project.name || t("untitled")}
        </p>
        <IconButton label={t("shortcutUndo")} size="sm" onClick={() => undo()}>
          <Undo2 />
        </IconButton>
        <IconButton label={t("shortcutRedo")} size="sm" onClick={() => redo()}>
          <Redo2 />
        </IconButton>
        <IconButton
          label={t("safeAreas")}
          size="sm"
          selected={safeAreas}
          onClick={() => setSafeAreas(!safeAreas)}
        >
          <Crop />
        </IconButton>
        {project.mode === "quran" ? (
          <IconButton
            label="محاذاة سورة قرآنية"
            size="sm"
            onClick={() => setAlignSurahOpen(true)}
          >
            <BookOpen />
          </IconButton>
        ) : null}
      </header>

      <div className={cn("flex min-h-0 flex-1", landscape && "flex-row")}>
        {/* ------------------------------------------------------- preview -- */}
        <div
          className={cn(
            "sticky top-0 z-20 flex shrink-0 items-center justify-center bg-ink px-2",
            landscape ? "w-1/2" : "h-[42dvh] phone-landscape:h-full",
          )}
        >
          <div
            className={cn(
              "@container relative h-full overflow-hidden rounded-xl border border-border bg-ink-deep",
              project.aspect === "9:16" && "aspect-[9/16]",
              project.aspect === "1:1" && "aspect-square",
              project.aspect === "16:9" && "aspect-video max-w-full",
            )}
          >
            {mediaUrl ? (
              <video
                ref={mediaRef}
                src={mediaUrl}
                playsInline
                muted
                preload="metadata"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full bg-[radial-gradient(120%_80%_at_50%_0%,rgb(25_195_125/0.16),transparent_62%)]" />
            )}

            <CaptionOverlay aspect={project.aspect} />

            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? common("pause") : common("play")}
              className="absolute inset-0 z-30 grid place-items-center bg-transparent"
            >
              {!playing ? (
                <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur">
                  ▶
                </span>
              ) : null}
            </button>

            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between">
              <span className="num-tabular rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/90">
                {tc(playhead)}
              </span>
              <Badge tone="neutral" className="bg-black/55 text-white/90">
                {project.aspect}
              </Badge>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ mini timeline -- */}
        {/* min-w-0: the mini timeline is intrinsically wider than the phone, and
            without it this flex item refuses to shrink below that width. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MiniTimeline peaks={peaks} duration={Math.max(1, duration)} />

          {/* wraps on a narrow phone instead of pushing the snapping label off-screen */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-1">
            <Button
              variant="secondary"
              size="sm"
              icon={<Scissors />}
              onClick={() => split()}
              className="min-w-0 flex-1"
            >
              {t("timelineSplit")}
            </Button>
            <span className="num-tabular shrink-0 font-mono text-[10px] text-subtle">
              {snapping ? t("timelineSnapOn") : t("timelineSnapOff")}
            </span>
          </div>

          {/* quick-look at the clips: swipe between them above the sheets */}
          <div className="pan-x flex gap-2 px-3 pb-3">
            {clips.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => {
                  haptic(6);
                  selectClip(clip.id);
                  setPlayhead(
                    clips.slice(0, index).reduce((sum, item) => sum + (item.sourceOut - item.sourceIn), 0),
                  );
                }}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg border px-3 py-1.5 text-start text-xs",
                  clip.id === project.clips.find((item) => item.order === index)?.id
                    ? "border-primary/45 bg-primary-soft text-primary"
                    : "border-border bg-raised text-muted",
                )}
                aria-label={a11y("clipLabel", {
                  index: index + 1,
                  total: clips.length,
                  start: tc(clip.sourceIn),
                  end: tc(clip.sourceOut),
                })}
              >
                <span className="block font-medium">{clip.label}</span>
                <span className="num-tabular block font-mono text-[10px] text-subtle">
                  {tc(clip.sourceOut - clip.sourceIn)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------- floating export FAB -- */}
      <div className="pointer-events-none relative">
        <div className="absolute end-4 bottom-[5.5rem] z-30">
          <Button
            variant="primary"
            size="lg"
            pill
            icon={<Download />}
            className="pointer-events-auto shadow-[var(--shadow-glow)]"
            onClick={() => {
              haptic(10);
              setExportOpen(true);
            }}
          >
            {t("tabExportMobile")}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------ tab bar --- */}
      <nav
        aria-label={t("panels")}
        className="z-40 flex shrink-0 items-stretch border-t border-border bg-surface/95 backdrop-blur-xl"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={sheetOpen && mobileTab === tab.id ? "true" : undefined}
            onClick={() => {
              haptic(4);
              if (sheetOpen && mobileTab === tab.id) setMobileSheet(false);
              else setMobileTab(tab.id);
            }}
            className={cn(
              "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              sheetOpen && mobileTab === tab.id ? "text-primary" : "text-muted",
            )}
          >
            <span aria-hidden className="[&_svg]:size-5">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ------------------------------------------------------- sheets --- */}
      <BottomSheet
        open={sheetOpen && mobileTab === "clips"}
        onOpenChange={(open) => setMobileSheet(open)}
        snap={sheetSnap}
        onSnapChange={(snap: Snap) => setMobileSheet(true, snap)}
        title={t("tabClips")}
        description={t("clipCount", { count: clips.length })}
      >
        <div className="space-y-3">
          {clips.map((clip) => (
            <div key={clip.id} className="rounded-lg border border-border bg-raised/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">{clip.label}</span>
                <span className="num-tabular font-mono text-xs text-muted">
                  {tc(clip.sourceOut - clip.sourceIn)}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => selectClip(clip.id)}>
                  {t("timelineReorder")}
                </Button>
                <Button
                  size="sm"
                  variant="danger-ghost"
                  onClick={() => useEditor.getState().deleteClip(clip.id)}
                >
                  {t("timelineDelete")}
                </Button>
              </div>
            </div>
          ))}
          <Timeline compact />
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheetOpen && mobileTab === "words"}
        onOpenChange={(open) => setMobileSheet(open)}
        snap={sheetSnap}
        onSnapChange={(snap: Snap) => setMobileSheet(true, snap)}
        title={t("tabWords")}
        description={t("longPressHint")}
      >
        <p className="mb-2 text-xs text-subtle">{t("swipeHint")}</p>
        <TranscriptPanel className="h-[60dvh]" />
      </BottomSheet>

      <BottomSheet
        open={sheetOpen && mobileTab === "style"}
        onOpenChange={(open) => setMobileSheet(open)}
        snap={sheetSnap}
        onSnapChange={(snap: Snap) => setMobileSheet(true, snap)}
        title={t("tabStyle")}
      >
        <Inspector onExport={() => setExportOpen(true)} />
      </BottomSheet>

      <BottomSheet
        open={sheetOpen && mobileTab === "export"}
        onOpenChange={(open) => setMobileSheet(open)}
        snap={95}
        onSnapChange={(snap: Snap) => setMobileSheet(true, snap)}
        title={t("tabExport")}
        footer={
          <Button
            variant="primary"
            full
            size="lg"
            icon={<Download />}
            onClick={() => {
              setMobileSheet(false);
              setExportOpen(true);
            }}
          >
            {t("tabExportMobile")}
          </Button>
        }
      >
        <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-3 text-xs text-muted">
          <p className="text-sm font-medium text-fg">{t("safeAreas")}</p>
          <p className="mt-1">{t("safeAreasDesc")}</p>
          <p className="num-tabular mt-3 font-mono text-[11px] text-subtle">
            {tc(duration)} · {project.aspect} · {dirty ? t("saving") : common("saved")}
          </p>
        </div>
        <div className="mt-3">
          <SuggestionsPanel />
        </div>
      </BottomSheet>

      <AlignSurahDialog
        open={alignSurahOpen}
        onOpenChange={setAlignSurahOpen}
        project={project}
        onSuccess={(updated) => {
          loadProject(updated);
          void putProject(updated);
        }}
      />
      <ExportHost open={exportOpen} onOpenChange={setExportOpen} />
      <span className="sr-only" aria-live="polite">
        {playing ? t("shortcutPlayPause") : ""}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- helpers -- */

/**
 * Mini timeline for phones: fit-to-width programme, 44px trim handles, pinch to
 * zoom and haptic feedback when a clip edge snaps.
 */
function MiniTimeline({ peaks, duration }: { peaks: Float32Array; duration: number }) {
  const a11y = useTranslations("a11y");
  const t = useTranslations("editor");
  const { tc } = useFormat();

  const { project, playhead, pxPerSec } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      playhead: state.playhead,
      pxPerSec: state.pxPerSec,
    })),
  );
  const setPlayhead = useEditor((state) => state.setPlayhead);
  const setView = useEditor((state) => state.setView);
  const trim = useEditor((state) => state.trim);
  const selectClip = useEditor((state) => state.selectClip);

  const stripRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pinch = React.useRef({ distance: 0, pxPerSec });
  const drag = React.useRef<
    | { kind: "scrub" }
    | { kind: "trim"; clipId: string; side: "start" | "end" }
    | null
  >(null);

  const clips = React.useMemo(() => orderedClips(project.clips), [project.clips]);
  const total = Math.max(0.1, duration);
  const width = Math.max(320, total * pxPerSec);

  const timeAt = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return (clientX - rect.left + element.scrollLeft) / pxPerSec;
  };

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length !== 2) return;
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    pinch.current = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      pxPerSec,
    };
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length !== 2) return;
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const next = Math.max(12, Math.min(320, pinch.current.pxPerSec * (distance / pinch.current.distance)));
    setView({ pxPerSec: next });
  };

  const snapFeedback = () => haptic(6);

  return (
    <div className="px-3 pb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="num-tabular font-mono text-[10px] text-subtle">{tc(playhead)}</span>
        <span className="text-[10px] text-subtle">{t("timelineZoom")}</span>
      </div>

      <div
        ref={stripRef}
        role="slider"
        tabIndex={0}
        aria-label={a11y("timelineRole", { count: clips.length })}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(playhead)}
        aria-valuetext={a11y("timelinePlayheadAt", { time: tc(playhead) })}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 5 : 1;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPlayhead(playhead - step);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setPlayhead(playhead + step);
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className="relative touch-drag overflow-hidden rounded-lg border border-border bg-ink"
        style={{ height: 88 }}
      >
        <div ref={scrollRef} className="size-full overflow-x-auto no-scrollbar">
          <div className="relative h-full" style={{ width }}>
            <WaveformCanvas
              peaks={peaks}
              duration={total}
              fromSec={0}
              toSec={width / pxPerSec}
              height={88}
              className="absolute inset-0"
            />

            {clips.map((clip, index) => {
              const blockWidth = Math.max(44, (clip.sourceOut - clip.sourceIn) * pxPerSec);
              const offset = clips
                .slice(0, index)
                .reduce((sum, item) => sum + (item.sourceOut - item.sourceIn) * pxPerSec, 0);

              return (
                <div
                  key={clip.id}
                  className="absolute top-0 bottom-0 rounded-md border border-primary/40 bg-primary-soft/25"
                  style={{ left: offset, width: blockWidth }}
                >
                  <span className="absolute inset-x-0 top-1 truncate px-2 text-[10px] text-fg/80">
                    {clip.label}
                  </span>
                  {(["start", "end"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      aria-label={t(side === "start" ? "trimStart" : "trimEnd")}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        drag.current = { kind: "trim", clipId: clip.id, side };
                        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
                        selectClip(clip.id);
                      }}
                      onPointerMove={(event) => {
                        const current = drag.current;
                        if (current?.kind !== "trim" || current.clipId !== clip.id) return;
                        const target = scrollRef.current?.getBoundingClientRect();
                        if (!target) return;
                        trim(clip.id, current.side, (event.clientX - target.left) / pxPerSec);
                      }}
                      onPointerUp={() => {
                        drag.current = null;
                        snapFeedback();
                      }}
                      className={cn(
                        "absolute top-0 bottom-0 z-10 flex items-center justify-center touch-drag",
                        side === "start" ? "left-0" : "right-0",
                      )}
                      style={{ width: 44 }}
                    >
                      <span aria-hidden className="h-10 w-1.5 rounded-full bg-primary" />
                    </button>
                  ))}
                </div>
              );
            })}

            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onPointerDown={(event) => {
                drag.current = { kind: "scrub" };
                (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                const current = drag.current;
                if (current?.kind !== "scrub") return;
                const element = scrollRef.current;
                if (!element) return;
                setPlayhead(nearestOutputTime(timeAt(event.clientX, element), clips));
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              className="absolute inset-0 z-0"
            />

            <div
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-gold"
              style={{ left: playhead * pxPerSec }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function useReactLandscape() {
  const [landscape, setLandscape] = React.useState(
    () => typeof window !== "undefined" && window.innerHeight < 520 && window.innerWidth > window.innerHeight,
  );

  React.useEffect(() => {
    const update = () => setLandscape(window.innerHeight < 520 && window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return landscape;
}

// Module scope, not per-render: see desktop-editor for why.
const ExportDialog = React.lazy(() =>
  import("./export-dialog").then((module) => ({ default: module.ExportDialog })),
);

function ExportHost({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!open) return null;
  return (
    <React.Suspense fallback={null}>
      <ExportDialog open={open} onOpenChange={onOpenChange} />
    </React.Suspense>
  );
}
