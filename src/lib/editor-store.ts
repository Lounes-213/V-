"use client";

import { create } from "zustand";
import { DEFAULT_RULES } from "./captions";
import { DEFAULT_EXPORT, presetById, presetsForMode } from "./presets";
import {
  clampViewport,
  cutWordsFromClips,
  orderedClips,
  outputToSource,
  removeClip,
  restoreRanges,
  sourceToOutput,
  splitClipAt,
  totalDuration,
  trimClip,
  zoomAt,
} from "./timeline";
import { createEmptyProject } from "./project-factory";
import { CAPTION_PRESETS } from "./presets";
import { resolveTransform } from "./types";
import type {
  BackgroundStyle,
  CaptionPreset,
  CaptionRules,
  Clip,
  ExportSettings,
  Project,
  QuranMatch,
  Suggestion,
  VideoTransform,
  Word,
} from "./types";

/**
 * Undo/redo is a command log: each entry keeps the *minimal* slice of the project
 * that an edit touched (words, clips, suggestions, quran) before and after the
 * change. Cheaper than full snapshots, and reversible without re-deriving state.
 */
type ProjectSlice = {
  words: Word[];
  clips: Clip[];
  suggestions: Suggestion[];
  quran: QuranMatch[];
};

type Command = {
  label: string;
  before: ProjectSlice;
  after: ProjectSlice;
  /** Same-key consecutive entries merge, so a 60fps drag stays one undo step. */
  coalesceKey?: string;
};

export type InspectorTab = "video" | "style" | "captions" | "background" | "export";
export type LeftTab = "transcript" | "suggestions";
export type MobileTab = "clips" | "words" | "style" | "export";

/** Desktop pane visibility and sizes; the mobile shell ignores these. */
type PanelState = {
  left: boolean;
  right: boolean;
  timeline: boolean;
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
};

export type EditorState = PanelState & {
  project: Project;
  exportSettings: ExportSettings;
  /** Output-timeline playhead, seconds. */
  playhead: number;
  playing: boolean;
  speed: number;
  loopRange: { start: number; end: number } | null;
  snapping: boolean;
  pxPerSec: number;
  scrollSec: number;
  timelineWidth: number;
  selectedWordIds: string[];
  activeWordId: string | null;
  selectedClipId: string | null;
  inspectorTab: InspectorTab;
  leftTab: LeftTab;
  mobileTab: MobileTab;
  mobileSheetOpen: boolean;
  mobileSheetSnap: 30 | 60 | 95;
  safeAreas: boolean;
  showWaveform: boolean;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  history: Command[];
  future: Command[];
  dirty: boolean;
  lastSavedAt: number | null;
  aiBusy: Record<string, boolean>;
  toasts: { id: string; message: string; tone: "info" | "success" | "warn" | "danger" }[];
};

export type EditorActions = {
  loadProject: (project: Project) => void;
  patchProject: (patch: Partial<Project>, label?: string, undoable?: boolean) => void;

  /* structural edits — undoable */
  cutWords: (ids: string[]) => void;
  restoreWords: (ids: string[]) => void;
  editWord: (id: string, text: string) => void;
  /** Replaces every occurrence of an exact word (find-and-replace, undoable). */
  replaceAllWords: (from: string, to: string) => number;
  splitAtPlayhead: () => void;
  trim: (clipId: string, side: "start" | "end", sourceTime: number) => void;
  reorder: (orderedIds: string[]) => void;
  updateClipTransform: (clipId: string, patch: Partial<VideoTransform>) => void;
  deleteClip: (clipId: string) => void;
  acceptSuggestion: (id: string) => void;
  applySuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  replaceSuggestions: (next: Suggestion[]) => void;
  reviewAyah: (id: string, reviewed: boolean) => void;
  correctAyah: (id: string, ayah: number) => void;
  setQuranMatches: (matches: QuranMatch[]) => void;

  /* style + settings — not undoable, but saved */
  setPreset: (presetId: string) => void;
  updatePreset: (patch: Partial<CaptionPreset>) => void;
  setRules: (patch: Partial<CaptionRules>) => void;
  setBackground: (patch: Partial<BackgroundStyle>) => void;
  setExport: (patch: Partial<ExportSettings>) => void;
  setAspect: (aspect: Project["aspect"]) => void;
  setName: (name: string) => void;
  setMode: (mode: Project["mode"]) => void;
  setLanguage: (language: Project["language"]) => void;

  /* transport */
  setPlayhead: (time: number, options?: { fromOutput?: boolean }) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: number) => void;
  setLoop: (range: { start: number; end: number } | null) => void;
  seekWord: (direction: 1 | -1) => void;
  seekClip: (direction: 1 | -1) => void;

  /* view */
  setView: (patch: { pxPerSec?: number; scrollSec?: number; width?: number }) => void;
  zoom: (factor: number, anchorX?: number) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setLeftTab: (tab: LeftTab) => void;
  setMobileTab: (tab: MobileTab) => void;
  setMobileSheet: (open: boolean, snap?: 30 | 60 | 95) => void;
  togglePanel: (panel: "left" | "right" | "timeline") => void;
  setPanelWidth: (panel: "left" | "right" | "timeline", value: number) => void;
  setSafeAreas: (value: boolean) => void;
  setSnapping: (value: boolean) => void;
  selectWords: (ids: string[]) => void;
  toggleWordSelection: (id: string) => void;
  setActiveWord: (id: string | null) => void;
  selectClip: (id: string | null) => void;
  openCommandPalette: (open: boolean) => void;
  openShortcuts: (open: boolean) => void;

  /* history */
  undo: () => string | null;
  redo: () => string | null;
  markSaved: () => void;
  pushToast: (message: string, tone?: EditorState["toasts"][number]["tone"]) => void;
  dismissToast: (id: string) => void;
  setBusy: (key: string, busy: boolean) => void;
};

const HISTORY_LIMIT = 80;

function clip(text: string, max = 42): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sliceOf(project: Project): ProjectSlice {
  return {
    words: project.words.map((word) => ({ ...word })),
    clips: project.clips.map((clip) => ({ ...clip })),
    suggestions: project.suggestions.map((suggestion) => ({ ...suggestion })),
    quran: project.quran.map((match) => ({ ...match })),
  };
}

export const useEditor = create<EditorState & EditorActions>()((set, get) => {
  /**
   * Applies a structural change and records it in the command log.
   * `mutate` returns the next slice plus a label describing what happened.
   */
  const commit = (
    mutate: (project: Project) => { next: Partial<ProjectSlice>; label: string } | null,
    coalesceKey?: string,
  ) => {
    const { project, history } = get();
    const last = history[history.length - 1];
    const mergeWithPrevious =
      coalesceKey !== undefined && last !== undefined && last.coalesceKey === coalesceKey;

    // Merged gestures keep their original "before" so undo lands at the true start.
    const before = mergeWithPrevious && last ? last.before : sliceOf(project);
    const result = mutate(project);
    if (!result) return;

    const after: ProjectSlice = { ...before, ...result.next };
    const entry: Command = { label: result.label, before, after, ...(coalesceKey ? { coalesceKey } : {}) };

    set({
      project: { ...project, ...result.next, updatedAt: Date.now() },
      history: mergeWithPrevious
        ? [...history.slice(0, -1), entry]
        : [...history, entry].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
    });
  };

  const applySlice = (slice: ProjectSlice) =>
    set((state) => ({
      project: { ...state.project, ...slice, updatedAt: Date.now() },
      dirty: true,
    }));

  return {
    project: createEmptyProject(),
    exportSettings: { ...DEFAULT_EXPORT },
    // Desktop shell panes. On phones these are irrelevant — the mobile shell
    // uses its own bottom-sheet state instead.
    left: true,
    right: true,
    timeline: true,
    leftWidth: 320,
    rightWidth: 336,
    timelineHeight: 208,
    playhead: 0,
    playing: false,
    speed: 1,
    loopRange: null,
    snapping: true,
    pxPerSec: 46,
    scrollSec: 0,
    timelineWidth: 1200,
    selectedWordIds: [],
    activeWordId: null,
    selectedClipId: null,
    inspectorTab: "style",
    leftTab: "transcript",
    mobileTab: "words",
    mobileSheetOpen: false,
    mobileSheetSnap: 60,
    safeAreas: true,
    showWaveform: true,
    commandPaletteOpen: false,
    shortcutsOpen: false,
    history: [],
    future: [],
    dirty: false,
    lastSavedAt: null,
    aiBusy: {},
    toasts: [],

    loadProject: (project) =>
      set({
        // A project opened outside Quran Mode can never carry scripture-only
        // styling: swap it to the signature look before anything renders.
        project: presetsForMode(project.mode).some((preset) => preset.id === project.presetId)
          ? project
          : { ...project, presetId: CAPTION_PRESETS[0]!.id, captionOverrides: {} },
        history: [],
        future: [],
        playhead: 0,
        playing: false,
        dirty: false,
        selectedWordIds: [],
        activeWordId: null,
        selectedClipId: project.clips[0]?.id ?? null,
        pxPerSec: 46,
        scrollSec: 0,
        lastSavedAt: null,
        // Opening another project must not carry over notifications or
        // selections from the previous one.
        toasts: [],
        aiBusy: {},
        loopRange: null,
        commandPaletteOpen: false,
        shortcutsOpen: false,
        mobileSheetOpen: false,
      }),

    patchProject: (patch, label = "Edit", undoable = false) => {
      if (!undoable) {
        set((state) => ({ project: { ...state.project, ...patch, updatedAt: Date.now() }, dirty: true }));
        return;
      }
      commit(() => ({ next: patch as Partial<ProjectSlice>, label }));
    },

    /* ---------------------------------------------------------- words -- */

    cutWords: (ids) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      commit((project) => {
        const words = project.words.map((word) =>
          idSet.has(word.id) ? { ...word, deleted: true } : word,
        );
        const clips = cutWordsFromClips(project.clips, project.words, idSet);
        return { next: { words, clips }, label: `Cut ${ids.length} word${ids.length > 1 ? "s" : ""}` };
      });
      set({ selectedWordIds: [] });
    },

    restoreWords: (ids) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      commit((project) => {
        const words = project.words.map((word) =>
          idSet.has(word.id) ? { ...word, deleted: false } : word,
        );
        // Each restored word puts its own time range back, joined to the clips
        // it touches — the rest of the timeline is left exactly as the user cut it.
        const ranges = project.words
          .filter((word) => idSet.has(word.id))
          .map((word) => ({ start: word.start, end: word.end }));
        const clips = restoreRanges(project.clips, ranges);
        return { next: { words, clips }, label: `Restore ${ids.length} word(s)` };
      });
    },

    editWord: (id, text) => {
      const next = text.trim();
      if (!next) return;
      commit((project) => {
        const target = project.words.find((word) => word.id === id);
        if (!target || target.text === next) return null;
        const words = project.words.map((word) => (word.id === id ? { ...word, text: next } : word));
        return { next: { words }, label: `Edit “${clip(target.text, 20)}”` };
      });
    },

    replaceAllWords: (from, to) => {
      const needle = from.trim();
      const replacement = to.trim();
      if (!needle || !replacement || needle === replacement) return 0;
      let replaced = 0;
      commit((project) => {
        let touched = false;
        const words = project.words.map((word) => {
          if (word.text !== needle) return word;
          touched = true;
          replaced += 1;
          return { ...word, text: replacement };
        });
        if (!touched) return null;
        return { next: { words }, label: `Replace “${clip(needle, 16)}” → “${clip(replacement, 16)}”` };
      });
      return replaced;
    },

    splitAtPlayhead: () => {
      const { project, playhead } = get();
      const source = outputToSource(playhead, project.clips);
      if (source === null) {
        get().pushToast("Move the playhead inside a clip to split.", "warn");
        return;
      }
      commit((project) => {
        const clips = splitClipAt(project.clips, source);
        if (clips === project.clips) return null;
        return { next: { clips }, label: "Split clip" };
      });
    },

    trim: (clipId, side, sourceTime) => {
      commit((project) => {
        const clips = trimClip(project.clips, clipId, side, sourceTime);
        const changed = clips.some((clip, index) => {
          const original = project.clips[index];
          return !original || clip.sourceIn !== original.sourceIn || clip.sourceOut !== original.sourceOut;
        });
        if (!changed) return null;
        return { next: { clips }, label: side === "start" ? "Trim clip start" : "Trim clip end" };
      });
    },

    reorder: (orderedIds) => {
      commit((project) => {
        const byId = new Map(project.clips.map((clip) => [clip.id, clip]));
        const clips = orderedIds
          .map((id, index) => {
            const found = byId.get(id);
            return found ? { ...found, order: index } : null;
          })
          .filter((value): value is Clip => value !== null);
        if (clips.length !== project.clips.length) return null;
        return { next: { clips }, label: "Reorder clips" };
      });
    },

    deleteClip: (clipId) => {
      commit((project) => {
        const clips = removeClip(project.clips, clipId);
        if (clips === project.clips) {
          get().pushToast("A project needs at least one clip.", "warn");
          return null;
        }
        return { next: { clips }, label: "Delete clip" };
      });
      set({ selectedClipId: null });
    },

    updateClipTransform: (clipId, patch) => {
      commit(
        (project) => {
          const current = project.clips.find((clip) => clip.id === clipId);
          if (!current) return null;
          const prev = resolveTransform(current.transform);
          const merged: VideoTransform = {
            ...prev,
            ...patch,
            scale: clampNumber(patch.scale ?? prev.scale, 0.2, 3),
            x: clampNumber(patch.x ?? prev.x, -200, 200),
            y: clampNumber(patch.y ?? prev.y, -200, 200),
            rotation: clampNumber(patch.rotation ?? prev.rotation, -180, 180),
          };
          if (
            merged.scale === prev.scale &&
            merged.x === prev.x &&
            merged.y === prev.y &&
            merged.rotation === prev.rotation &&
            merged.flipH === prev.flipH &&
            merged.flipV === prev.flipV
          ) {
            return null;
          }
          const clips = project.clips.map((clip) =>
            clip.id === clipId ? { ...clip, transform: merged } : clip,
          );
          return { next: { clips }, label: "Transform clip" };
        },
        `transform:${clipId}`,
      );
    },

    /* ---------------------------------------------------- suggestions -- */

    acceptSuggestion: (id) => {
      commit((project) => {
        const suggestions = project.suggestions.map((suggestion) =>
          suggestion.id === id ? { ...suggestion, status: "accepted" as const } : suggestion,
        );
        return { next: { suggestions }, label: "Accept suggestion" };
      });
    },

    applySuggestion: (id) => {
      const { project } = get();
      const suggestion = project.suggestions.find((item) => item.id === id);
      if (!suggestion) return;
      commit((current) => ({
        next: {
          clips: [{ id: `c_${id}`, order: 0, sourceIn: suggestion.start, sourceOut: suggestion.end, label: clip(suggestion.title, 28) }],
          suggestions: current.suggestions.map((item) =>
            item.id === id ? { ...item, status: "accepted" as const } : item,
          ),
        },
        label: `Use “${clip(suggestion.title, 24)}”`,
      }));
      set({ playhead: 0 });
    },

    dismissSuggestion: (id) => {
      commit((project) => {
        const suggestions = project.suggestions.map((suggestion) =>
          suggestion.id === id ? { ...suggestion, status: "dismissed" as const } : suggestion,
        );
        return { next: { suggestions }, label: "Dismiss suggestion" };
      });
    },

    replaceSuggestions: (next) => {
      commit(() => ({ next: { suggestions: next }, label: "Regenerate suggestions" }));
    },

    reviewAyah: (id, reviewed) => {
      commit((project) => {
        const quran = project.quran.map((match) =>
          match.id === id ? { ...match, reviewed } : match,
        );
        return { next: { quran }, label: reviewed ? "Confirm verse" : "Unconfirm verse" };
      });
    },

    correctAyah: (id, ayah) => {
      commit((project) => {
        const quran = project.quran.map((match) =>
          match.id === id
            ? { ...match, ayah, correctedAyah: ayah, reviewed: true, confidence: 1 }
            : match,
        );
        return { next: { quran }, label: `Correct to ${ayah}` };
      });
    },

    setQuranMatches: (matches) => {
      commit(() => ({ next: { quran: matches }, label: "Load verse matches" }));
    },

    /* --------------------------------------------------------- style -- */

    setPreset: (presetId) =>
      set((state) => ({
        project: { ...state.project, presetId, captionOverrides: {}, updatedAt: Date.now() },
        dirty: true,
      })),

    updatePreset: (patch) => {
      set((state) => {
        const base = presetById(state.project.presetId);
        const merged = { ...(state.project.captionOverrides ?? {}), ...patch };
        // Drop values that match the preset so overrides stay minimal.
        const cleaned: Partial<CaptionPreset> = {};
        for (const [key, value] of Object.entries(merged)) {
          if ((base as Record<string, unknown>)[key] !== value) {
            (cleaned as Record<string, unknown>)[key] = value;
          }
        }
        return {
          project: { ...state.project, captionOverrides: cleaned, updatedAt: Date.now() },
          dirty: true,
        };
      });
    },

    setRules: (patch) =>
      set((state) => ({
        project: { ...state.project, rules: { ...state.project.rules, ...patch }, updatedAt: Date.now() },
        dirty: true,
      })),

    setBackground: (patch) =>
      set((state) => ({
        project: {
          ...state.project,
          background: { ...state.project.background, ...patch },
          updatedAt: Date.now(),
        },
        dirty: true,
      })),

    setExport: (patch) =>
      set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),

    setAspect: (aspect) =>
      set((state) => ({ project: { ...state.project, aspect, updatedAt: Date.now() }, dirty: true })),

    setName: (name) =>
      set((state) => ({ project: { ...state.project, name, updatedAt: Date.now() }, dirty: true })),

    setMode: (mode) =>
      set((state) => ({ project: { ...state.project, mode, updatedAt: Date.now() }, dirty: true })),

    setLanguage: (language) =>
      set((state) => ({ project: { ...state.project, language, updatedAt: Date.now() }, dirty: true })),

    /* ----------------------------------------------------- transport -- */

    setPlayhead: (time) => {
      const { project } = get();
      const duration = totalDuration(project.clips);
      set({ playhead: Math.min(Math.max(0, time), duration) });
    },

    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    toggle: () => set((state) => ({ playing: !state.playing })),
    setSpeed: (speed) => set({ speed }),
    setLoop: (loopRange) => set({ loopRange }),

    seekWord: (direction) => {
      const { project, playhead } = get();
      const source = outputToSource(playhead, project.clips);
      if (source === null) return;
      const kept = project.words
        .filter((word) => !word.deleted)
        .sort((a, b) => a.start - b.start);
      const index = kept.findIndex((word) => word.start >= source - 0.001);

      const target =
        direction === 1
          ? kept[index === -1 ? kept.length - 1 : Math.min(kept.length - 1, index)]
          : kept[Math.max(0, (index === -1 ? kept.length : index) - 1)];
      if (!target) return;

      const output = sourceToOutput(target.start, project.clips);
      if (output !== null) set({ playhead: output, activeWordId: target.id });
    },

    seekClip: (direction) => {
      const { project, playhead } = get();
      const clips = orderedClips(project.clips);
      let cursor = 0;
      const boundaries: number[] = [];
      for (const item of clips) {
        boundaries.push(cursor);
        cursor += item.sourceOut - item.sourceIn;
      }
      const next =
        direction === 1
          ? boundaries.find((value) => value > playhead + 0.05)
          : [...boundaries].reverse().find((value) => value < playhead - 0.05);
      if (next !== undefined) set({ playhead: next });
      else set({ playhead: direction === 1 ? totalDuration(project.clips) : 0 });
    },

    /* ---------------------------------------------------------- view -- */

    setView: (patch) =>
      set((state) => {
        const duration = totalDuration(state.project.clips);
        const merged = {
          pxPerSec: patch.pxPerSec ?? state.pxPerSec,
          scrollSec: patch.scrollSec ?? state.scrollSec,
          width: patch.width ?? state.timelineWidth,
        };
        const clamped = clampViewport(merged, duration);
        return {
          pxPerSec: clamped.pxPerSec,
          scrollSec: clamped.scrollSec,
          timelineWidth: clamped.width,
        };
      }),

    zoom: (factor, anchorX) =>
      set((state) => {
        const duration = totalDuration(state.project.clips);
        const view = zoomAt(
          { pxPerSec: state.pxPerSec, scrollSec: state.scrollSec, width: state.timelineWidth },
          state.pxPerSec * factor,
          anchorX ?? state.timelineWidth / 2,
          duration,
        );
        return { pxPerSec: view.pxPerSec, scrollSec: view.scrollSec };
      }),

    setInspectorTab: (inspectorTab) => set({ inspectorTab }),
    setLeftTab: (leftTab) => set({ leftTab }),
    setMobileTab: (mobileTab) => set({ mobileTab, mobileSheetOpen: true }),
    setMobileSheet: (mobileSheetOpen, snap) =>
      set((state) => ({ mobileSheetOpen, mobileSheetSnap: snap ?? state.mobileSheetSnap })),

    togglePanel: (panel) =>
      set((state) => ({
        left: panel === "left" ? !state.left : state.left,
        right: panel === "right" ? !state.right : state.right,
        timeline: panel === "timeline" ? !state.timeline : state.timeline,
      })),

    setPanelWidth: (panel, value) =>
      set(() => {
        if (panel === "left") return { leftWidth: Math.min(560, Math.max(240, value)) };
        if (panel === "right") return { rightWidth: Math.min(520, Math.max(260, value)) };
        return { timelineHeight: Math.min(420, Math.max(140, value)) };
      }),

    setSafeAreas: (safeAreas) => set({ safeAreas }),
    setSnapping: (snapping) => set({ snapping }),
    selectWords: (selectedWordIds) => set({ selectedWordIds }),
    toggleWordSelection: (id) =>
      set((state) => ({
        selectedWordIds: state.selectedWordIds.includes(id)
          ? state.selectedWordIds.filter((value) => value !== id)
          : [...state.selectedWordIds, id],
      })),
    setActiveWord: (activeWordId) => set({ activeWordId }),
    selectClip: (selectedClipId) => set({ selectedClipId }),
    openCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
    openShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),

    /* ------------------------------------------------------- history -- */

    undo: () => {
      const { history, future } = get();
      const entry = history[history.length - 1];
      if (!entry) return null;
      applySlice(entry.before);
      set({ history: history.slice(0, -1), future: [entry, ...future] });
      return entry.label;
    },

    redo: () => {
      const { history, future } = get();
      const entry = future[0];
      if (!entry) return null;
      applySlice(entry.after);
      set({ history: [...history, entry], future: future.slice(1) });
      return entry.label;
    },

    markSaved: () => set({ dirty: false, lastSavedAt: Date.now() }),

    pushToast: (message, tone = "info") =>
      set((state) => ({
        toasts: [...state.toasts.slice(-2), { id: `t_${Date.now()}_${state.toasts.length}`, message, tone }],
      })),

    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

    setBusy: (key, busy) => set((state) => ({ aiBusy: { ...state.aiBusy, [key]: busy } })),
  };
});

/* ------------------------------------------------------------ selectors -- */

export const selectPreset = (state: EditorState) => presetById(state.project.presetId);
export const selectEffectiveRules = (state: EditorState): CaptionRules => ({
  ...DEFAULT_RULES,
  ...state.project.rules,
});
export const selectDuration = (state: EditorState) => totalDuration(state.project.clips);
export const selectKeptWords = (state: EditorState) =>
  state.project.words.filter((word) => !word.deleted);
export const selectUnreviewedAyahs = (state: EditorState) =>
  state.project.quran.filter((match) => !match.reviewed);
export const selectExportSettings = (state: EditorState): ExportSettings => state.exportSettings;
