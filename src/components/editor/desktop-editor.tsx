"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowLeft,
  BookOpen,
  Captions,
  Cloud,
  Command as CommandIcon,
  Download,
  Keyboard,
  LayoutPanelLeft,
  LayoutPanelTop,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/components/providers/number-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/overlays";
import { AlignSurahDialog } from "@/components/quran/align-surah-dialog";
import { putProject } from "@/lib/db";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { totalDuration } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import { Preview } from "./preview";
import { Inspector } from "./inspector";
import { SuggestionsPanel } from "./suggestions-panel";
import { Timeline } from "./timeline";
import { TranscriptPanel } from "./transcript-panel";
import { QuickThemeToggle } from "@/components/site/theme-toggle";

export function DesktopEditor({ mediaUrl }: { mediaUrl?: string }) {
  const t = useTranslations("editor");
  const nav = useTranslations("nav");
  const { n, tc } = useFormat();

  const {
    project,
    left,
    right,
    timeline,
    leftWidth,
    rightWidth,
    timelineHeight,
    leftTab,
    dirty,
    lastSavedAt,
    history,
    future,
    snapping,
    pxPerSec,
  } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      left: state.left,
      right: state.right,
      timeline: state.timeline,
      leftWidth: state.leftWidth,
      rightWidth: state.rightWidth,
      timelineHeight: state.timelineHeight,
      leftTab: state.leftTab,
      dirty: state.dirty,
      lastSavedAt: state.lastSavedAt,
      history: state.history.length,
      future: state.future.length,
      snapping: state.snapping,
      pxPerSec: state.pxPerSec,
    })),
  );

  const togglePanel = useEditor((state) => state.togglePanel);
  const setPanelWidth = useEditor((state) => state.setPanelWidth);
  const undo = useEditor((state) => state.undo);
  const redo = useEditor((state) => state.redo);
  const setName = useEditor((state) => state.setName);
  const setLeftTab = useEditor((state) => state.setLeftTab);
  const openCommandPalette = useEditor((state) => state.openCommandPalette);
  const openShortcuts = useEditor((state) => state.openShortcuts);
  const pushToast = useEditor((state) => state.pushToast);
  const loadProject = useEditor((state) => state.loadProject);

  const [exportOpen, setExportOpen] = React.useState(false);
  const [alignSurahOpen, setAlignSurahOpen] = React.useState(false);
  const duration = totalDuration(project.clips);

  const announce = (label: string | null, kind: "undo" | "redo") => {
    if (!label) return;
    pushToast(t(kind === "undo" ? "undoAction" : "redoAction", { action: label }), "info");
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-ink">
      {/* ------------------------------------------------------- top bar -- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
        <Tooltip content={nav("dashboard")}>
          <Link
            href="/dashboard"
            aria-label={t("back")}
            className="inline-flex size-9 touch:size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <ArrowLeft aria-hidden className="size-[1.15rem]" />
          </Link>
        </Tooltip>

        <div className="min-w-0 flex-1">
          <input
            value={project.name}
            onChange={(event) => setName(event.target.value)}
            aria-label={t("title")}
            className="w-full max-w-md truncate bg-transparent text-sm font-semibold text-fg outline-none focus:underline"
          />
          <p className="num-tabular flex items-center gap-2 text-[11px] text-subtle">
            <span>{tc(duration)}</span>
            <span aria-hidden>·</span>
            <span>
              {n(project.words.filter((word) => !word.deleted).length)} {t("tabWords").toLowerCase()}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Cloud aria-hidden className="size-3" />
              {dirty ? t("saving") : lastSavedAt ? t("autosaved", { time: tc(0) }) : t("saved")}
            </span>
          </p>
        </div>

        <Badge tone="primary">{project.aspect}</Badge>

        <div className="flex items-center gap-0.5">
          <IconButton
            label={t("shortcutUndo")}
            tooltip={t("shortcutUndo")}
            shortcut="⌃Z"
            size="sm"
            disabled={history === 0}
            onClick={() => announce(undo(), "undo")}
          >
            <Undo2 />
          </IconButton>
          <IconButton
            label={t("shortcutRedo")}
            tooltip={t("shortcutRedo")}
            shortcut="⇧⌃Z"
            size="sm"
            disabled={future === 0}
            onClick={() => announce(redo(), "redo")}
          >
            <Redo2 />
          </IconButton>
          <IconButton
            label={t("commandPalette")}
            tooltip={t("commandPalette")}
            shortcut="⌃K"
            size="sm"
            onClick={() => openCommandPalette(true)}
          >
            <CommandIcon />
          </IconButton>
          <IconButton
            label={t("shortcutsTitle")}
            tooltip={t("shortcutsTitle")}
            shortcut="?"
            size="sm"
            onClick={() => openShortcuts(true)}
          >
            <Keyboard />
          </IconButton>
          <IconButton
            label={t("showPanel", { name: t("transcript") })}
            tooltip={t("transcript")}
            size="sm"
            selected={left}
            onClick={() => togglePanel("left")}
          >
            <LayoutPanelLeft />
          </IconButton>
          <IconButton
            label={t("showPanel", { name: t("inspector") })}
            tooltip={t("inspector")}
            size="sm"
            selected={right}
            onClick={() => togglePanel("right")}
          >
            <LayoutPanelTop />
          </IconButton>
          <QuickThemeToggle />
        </div>

        {project.mode === "quran" ? (
          <Button
            variant="outline"
            size="sm"
            icon={<BookOpen />}
            className="border-primary/45 text-primary hover:bg-primary-soft/30"
            onClick={() => setAlignSurahOpen(true)}
          >
            📖 محاذاة سورة قرآنية
          </Button>
        ) : null}
        <Button variant="primary" size="sm" icon={<Download />} onClick={() => setExportOpen(true)}>
          {t("tabExport")}
        </Button>
        <Avatar name="Amina Belkacem" size={30} />
      </header>

      {/* --------------------------------------------------------- panes -- */}
      <div className="flex min-h-0 flex-1">
        {left ? (
          <>
            <aside
              className="flex min-h-0 shrink-0 flex-col border-e border-border bg-surface/60"
              style={{ width: leftWidth }}
              aria-label={t("transcript")}
            >
              <TabHeader
                value={leftTab}
                onChange={(value) => setLeftTab(value)}
                items={[
                  { value: "transcript", label: t("transcript"), icon: <Captions /> },
                  {
                    value: "suggestions",
                    label: t("suggestions"),
                    icon: <ListOrdered />,
                    badge: project.suggestions.filter((item) => item.status === "new").length,
                  },
                ]}
              />
              {leftTab === "transcript" ? <TranscriptPanel /> : <SuggestionsPanel />}
            </aside>
            <PaneResizer
              label={t("resizePanel", { name: t("transcript") })}
              value={leftWidth}
              min={240}
              max={560}
              direction="horizontal"
              onChange={(value) => setPanelWidth("left", value)}
            />
          </>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3">
            <Preview mediaUrl={mediaUrl} className="h-full" />
          </div>
        </main>

        {right ? (
          <>
            <PaneResizer
              label={t("resizePanel", { name: t("inspector") })}
              value={rightWidth}
              min={260}
              max={520}
              direction="horizontal"
              invert
              onChange={(value) => setPanelWidth("right", value)}
            />
            <aside
              className="flex min-h-0 shrink-0 flex-col border-s border-border bg-surface/60"
              style={{ width: rightWidth }}
              aria-label={t("inspector")}
            >
              <Inspector onExport={() => setExportOpen(true)} />
            </aside>
          </>
        ) : null}
      </div>

      {/* ------------------------------------------------------- timeline -- */}
      {timeline ? (
        <>
          <PaneResizer
            label={t("resizePanel", { name: t("timeline") })}
            value={timelineHeight}
            min={140}
            max={420}
            direction="vertical"
            invert
            onChange={(value) => setPanelWidth("timeline", value)}
          />
          <section
            className="flex shrink-0 flex-col border-t border-border bg-surface/60 p-3"
            style={{ height: timelineHeight }}
            aria-label={t("timeline")}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">
                {t("timeline")}
              </h2>
              <div className="flex items-center gap-2">
                <Tooltip content={t("timelineSnap")}>
                  <button
                    type="button"
                    aria-pressed={snapping}
                    onClick={() => useEditor.getState().setSnapping(!snapping)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      snapping
                        ? "border-primary/40 bg-primary-soft text-primary"
                        : "border-border text-subtle hover:text-fg",
                    )}
                  >
                    {snapping ? t("timelineSnapOn") : t("timelineSnapOff")}
                  </button>
                </Tooltip>
                <span className="num-tabular font-mono text-[10px] text-subtle">
                  {n(Math.round(pxPerSec))} px/s
                </span>
              </div>
            </div>
            <Timeline />
          </section>
        </>
      ) : null}

      <AlignSurahDialog
        open={alignSurahOpen}
        onOpenChange={setAlignSurahOpen}
        project={project}
        onSuccess={(updated) => {
          loadProject(updated);
          void putProject(updated);
          pushToast("تم ربط السورة وتحديث الآيات بنجاح", "success");
        }}
      />
      <ExportHost open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}

function TabHeader<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; icon: React.ReactNode; badge?: number }[];
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-hairline p-1.5" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors",
            value === item.value
              ? "bg-primary-soft text-primary"
              : "text-muted hover:bg-raised hover:text-fg",
          )}
        >
          <span aria-hidden className="[&_svg]:size-4">
            {item.icon}
          </span>
          {item.label}
          {item.badge ? (
            <span className="num-tabular rounded-full bg-raised px-1.5 text-[10px] text-muted">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/**
 * Drag/keyboard resizer. Six pixels of grip, but the hit area is padded so a
 * trackpad or a finger can find it without pixel hunting.
 */
function PaneResizer({
  label,
  value,
  min,
  max,
  direction,
  invert,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  direction: "horizontal" | "vertical";
  invert?: boolean;
  onChange: (value: number) => void;
}) {
  const dragging = React.useRef(false);
  const start = React.useRef({ pos: 0, value: 0 });

  const isHorizontal = direction === "horizontal";

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      onKeyDown={(event) => {
        const key = isHorizontal ? "ArrowLeft" : "ArrowUp";
        const decrease = event.key === key;
        const increase = event.key === (isHorizontal ? "ArrowRight" : "ArrowDown");
        if (!decrease && !increase) return;
        event.preventDefault();
        const step = event.shiftKey ? 40 : 12;
        const delta = (increase ? step : -step) * (invert ? -1 : 1);
        onChange(Math.min(max, Math.max(min, value + delta)));
      }}
      onPointerDown={(event) => {
        dragging.current = true;
        start.current = { pos: isHorizontal ? event.clientX : event.clientY, value };
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const current = isHorizontal ? event.clientX : event.clientY;
        const delta = (current - start.current.pos) * (invert ? -1 : 1) * (isHorizontal ? 1 : 1);
        onChange(Math.min(max, Math.max(min, start.current.value + delta)));
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className={cn(
        "group relative z-10 shrink-0 touch-none",
        isHorizontal ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute rounded-full bg-transparent transition-colors group-hover:bg-primary/70 group-focus-visible:bg-primary",
          isHorizontal ? "inset-y-2 left-1/2 w-0.5 -translate-x-1/2" : "inset-x-2 top-1/2 h-0.5 -translate-y-1/2",
        )}
      />
    </div>
  );
}

// Declared once at module scope: a lazy component created inside a component is a
// *new* component type on every render, which remounts the dialog subtree.
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
