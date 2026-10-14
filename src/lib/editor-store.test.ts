import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./editor-store";
import { createDemoProject } from "./project-factory";
import { totalDuration } from "./timeline";
import type { Project } from "./types";

function freshProject(): Project {
  return createDemoProject({ id: "test-project" });
}

function setup() {
  const project = freshProject();
  useEditor.getState().loadProject(project);
  return project;
}

describe("editor store", () => {
  let project: Project;

  beforeEach(() => {
    project = setup();
  });

  it("starts with a clean history and the project loaded", () => {
    const state = useEditor.getState();
    expect(state.history).toHaveLength(0);
    expect(state.project.id).toBe("test-project");
    expect(state.dirty).toBe(false);
  });

  it("cuts words and shortens the programme", () => {
    const before = totalDuration(useEditor.getState().project.clips);
    const target = project.words[5]!;
    useEditor.getState().cutWords([target.id]);

    const after = useEditor.getState();
    expect(after.project.words.find((word) => word.id === target.id)?.deleted).toBe(true);
    expect(totalDuration(after.project.clips)).toBeLessThan(before);
    expect(after.dirty).toBe(true);
  });

  it("undoes a cut back to the original duration", () => {
    const before = totalDuration(useEditor.getState().project.clips);
    const target = project.words[5]!;

    useEditor.getState().cutWords([target.id]);
    const label = useEditor.getState().undo();

    expect(label).toContain("Cut");
    const restored = useEditor.getState();
    expect(restored.project.words.find((word) => word.id === target.id)?.deleted).toBeFalsy();
    expect(totalDuration(restored.project.clips)).toBeCloseTo(before, 3);
  });

  it("redoes what was undone", () => {
    const target = project.words[5]!;
    useEditor.getState().cutWords([target.id]);
    const afterCut = totalDuration(useEditor.getState().project.clips);
    useEditor.getState().undo();
    useEditor.getState().redo();

    expect(totalDuration(useEditor.getState().project.clips)).toBeCloseTo(afterCut, 3);
  });

  it("ignores an empty cut and an empty undo", () => {
    useEditor.getState().cutWords([]);
    expect(useEditor.getState().history).toHaveLength(0);
    expect(useEditor.getState().undo()).toBeNull();
    expect(useEditor.getState().redo()).toBeNull();
  });

  it("reports a label for the redo it performed", () => {
    useEditor.getState().cutWords([project.words[5]!.id]);
    useEditor.getState().undo();
    expect(useEditor.getState().redo()).toContain("Cut");
  });

  it("restores cut words and their time range", () => {
    const before = totalDuration(useEditor.getState().project.clips);
    const target = project.words[5]!;
    useEditor.getState().cutWords([target.id]);
    useEditor.getState().restoreWords([target.id]);

    const state = useEditor.getState();
    expect(state.project.words.find((word) => word.id === target.id)?.deleted).toBe(false);
    expect(totalDuration(state.project.clips)).toBeCloseTo(before, 3);
  });

  it("edits a word text and refuses an empty edit", () => {
    const target = project.words[0]!;
    useEditor.getState().editWord(target.id, "الحمد لله");
    expect(useEditor.getState().project.words[0]!.text).toBe("الحمد لله");

    const historyLength = useEditor.getState().history.length;
    useEditor.getState().editWord(target.id, "   ");
    expect(useEditor.getState().history).toHaveLength(historyLength);
  });

  it("splits at the playhead inside a clip", () => {
    useEditor.getState().setPlayhead(3);
    useEditor.getState().splitAtPlayhead();
    expect(useEditor.getState().project.clips.length).toBeGreaterThan(project.clips.length);
  });

  it("refuses to split outside a clip and warns instead", () => {
    const state = useEditor.getState();
    state.setPlayhead(0);
    const before = state.project.clips.length;
    useEditor.getState().splitAtPlayhead();
    expect(useEditor.getState().project.clips).toHaveLength(before);
  });

  it("trims a clip", () => {
    const clipId = project.clips[0]!.id;
    useEditor.getState().trim(clipId, "start", 2);
    expect(useEditor.getState().project.clips[0]!.sourceIn).toBeCloseTo(2);
  });

  it("reorders clips from an explicit sequence", () => {
    const ids = project.clips.map((clip) => clip.id).reverse();
    useEditor.getState().reorder(ids);
    const clips = [...useEditor.getState().project.clips].sort((a, b) => a.order - b.order);
    expect(clips.map((clip) => clip.id)).toEqual(ids);
  });

  it("refuses to delete the final clip", () => {
    const state = useEditor.getState();
    state.deleteClip(state.project.clips[0]!.id);
    state.deleteClip(useEditor.getState().project.clips[0]!.id);
    expect(useEditor.getState().project.clips).toHaveLength(1);
  });

  it("applies a suggestion as the whole cut", () => {
    const suggestion = project.suggestions[1]!;
    useEditor.getState().applySuggestion(suggestion.id);
    const state = useEditor.getState();
    expect(state.project.clips).toHaveLength(1);
    expect(state.project.clips[0]!.sourceIn).toBeCloseTo(suggestion.start);
    expect(state.playhead).toBe(0);
  });

  it("accepts and dismisses suggestions", () => {
    const [first, second] = project.suggestions;
    useEditor.getState().acceptSuggestion(first!.id);
    useEditor.getState().dismissSuggestion(second!.id);
    const suggestions = useEditor.getState().project.suggestions;
    expect(suggestions.find((item) => item.id === first!.id)?.status).toBe("accepted");
    expect(suggestions.find((item) => item.id === second!.id)?.status).toBe("dismissed");
  });

  it("replaces the whole suggestion list in one undo step", () => {
    const replacement = [{ ...project.suggestions[0]!, id: "new-1", title: "New moment" }];
    useEditor.getState().replaceSuggestions(replacement);
    expect(useEditor.getState().project.suggestions).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().project.suggestions.length).toBe(project.suggestions.length);
  });

  it("reviews and corrects verse matches", () => {
    const match = { ...project.suggestions[0], id: "q1" };
    void match;
    useEditor.getState().setQuranMatches([
      {
        id: "q1",
        surah: 112,
        surahName: "الإخلاص",
        ayah: 1,
        uthmani: "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
        confidence: 0.5,
        start: 0,
        end: 2,
        reviewed: false,
      },
    ]);

    useEditor.getState().reviewAyah("q1", true);
    expect(useEditor.getState().project.quran[0]!.reviewed).toBe(true);

    useEditor.getState().correctAyah("q1", 3);
    const corrected = useEditor.getState().project.quran[0]!;
    expect(corrected.ayah).toBe(3);
    expect(corrected.confidence).toBe(1);
    expect(corrected.reviewed).toBe(true);
  });

  it("keeps style changes out of the undo history but marks the project dirty", () => {
    useEditor.getState().updatePreset({ size: 80 });
    const state = useEditor.getState();
    expect(state.project.captionOverrides?.size).toBe(80);
    expect(state.history).toHaveLength(0);
    expect(state.dirty).toBe(true);
  });

  it("drops overrides that match the preset again", () => {
    useEditor.getState().updatePreset({ size: 80 });
    useEditor.getState().updatePreset({ size: 62 });
    expect(useEditor.getState().project.captionOverrides?.size).toBeUndefined();
  });

  it("switching preset clears overrides", () => {
    useEditor.getState().updatePreset({ size: 80 });
    useEditor.getState().setPreset("minimal");
    const state = useEditor.getState();
    expect(state.project.presetId).toBe("minimal");
    expect(state.project.captionOverrides).toEqual({});
  });

  it("moves the playhead between words", () => {
    useEditor.getState().setPlayhead(0);
    useEditor.getState().seekWord(1);
    const first = useEditor.getState().playhead;
    useEditor.getState().seekWord(1);
    expect(useEditor.getState().playhead).toBeGreaterThanOrEqual(first);

    useEditor.getState().seekWord(-1);
    expect(useEditor.getState().playhead).toBeLessThanOrEqual(first);
  });

  it("jumps between clips", () => {
    const state = useEditor.getState();
    const duration = totalDuration(state.project.clips);
    state.seekClip(1);
    expect(useEditor.getState().playhead).toBeGreaterThan(0);
    useEditor.getState().seekClip(1);
    expect(useEditor.getState().playhead).toBeCloseTo(duration, 2);
    useEditor.getState().seekClip(-1);
    expect(useEditor.getState().playhead).toBeLessThan(duration);
  });

  it("clamps the playhead to the programme", () => {
    const duration = totalDuration(useEditor.getState().project.clips);
    useEditor.getState().setPlayhead(duration + 100);
    expect(useEditor.getState().playhead).toBeCloseTo(duration, 2);
    useEditor.getState().setPlayhead(-5);
    expect(useEditor.getState().playhead).toBe(0);
  });

  it("toggles playback and speed", () => {
    useEditor.getState().toggle();
    expect(useEditor.getState().playing).toBe(true);
    useEditor.getState().pause();
    expect(useEditor.getState().playing).toBe(false);
    useEditor.getState().play();
    expect(useEditor.getState().playing).toBe(true);
    useEditor.getState().setSpeed(1.5);
    expect(useEditor.getState().speed).toBe(1.5);
  });

  it("zooms around an anchor and clamps the view", () => {
    useEditor.getState().setView({ pxPerSec: 50, scrollSec: 0, width: 800 });
    const anchor = 400;
    const timeAtAnchor = anchor / 50;
    useEditor.getState().zoom(2, anchor);
    const state = useEditor.getState();
    expect(state.pxPerSec).toBeCloseTo(100);
    expect(state.scrollSec + anchor / state.pxPerSec).toBeCloseTo(timeAtAnchor, 1);
  });

  it("resizes panels within bounds", () => {
    useEditor.getState().setPanelWidth("left", 10_000);
    expect(useEditor.getState().leftWidth).toBe(560);
    useEditor.getState().setPanelWidth("left", 1);
    expect(useEditor.getState().leftWidth).toBe(240);
    useEditor.getState().setPanelWidth("timeline", 10_000);
    expect(useEditor.getState().timelineHeight).toBe(420);
  });

  it("toggles panels and tabs", () => {
    const before = useEditor.getState().left;
    useEditor.getState().togglePanel("left");
    expect(useEditor.getState().left).toBe(!before);
    useEditor.getState().setInspectorTab("background");
    expect(useEditor.getState().inspectorTab).toBe("background");
    useEditor.getState().setLeftTab("suggestions");
    expect(useEditor.getState().leftTab).toBe("suggestions");
    useEditor.getState().setMobileTab("clips");
    expect(useEditor.getState().mobileSheetOpen).toBe(true);
  });

  it("tracks word selection", () => {
    const [a, b] = project.words;
    useEditor.getState().toggleWordSelection(a!.id);
    useEditor.getState().toggleWordSelection(b!.id);
    expect(useEditor.getState().selectedWordIds).toHaveLength(2);
    useEditor.getState().toggleWordSelection(a!.id);
    expect(useEditor.getState().selectedWordIds).toEqual([b!.id]);
  });

  it("clears the selection after a cut", () => {
    useEditor.getState().selectWords([project.words[0]!.id]);
    useEditor.getState().cutWords([project.words[0]!.id]);
    expect(useEditor.getState().selectedWordIds).toEqual([]);
  });

  it("caps the history length", () => {
    for (let index = 0; index < 100; index += 1) {
      useEditor.getState().cutWords([project.words[index % project.words.length]!.id]);
    }
    expect(useEditor.getState().history.length).toBeLessThanOrEqual(80);
  });

  it("drops the redo stack once a new edit lands", () => {
    useEditor.getState().cutWords([project.words[1]!.id]);
    useEditor.getState().undo();
    expect(useEditor.getState().future).toHaveLength(1);
    useEditor.getState().cutWords([project.words[2]!.id]);
    expect(useEditor.getState().future).toHaveLength(0);
  });

  it("tracks save state and toasts", () => {
    useEditor.getState().markSaved();
    expect(useEditor.getState().dirty).toBe(false);
    expect(useEditor.getState().lastSavedAt).not.toBeNull();

    const id = useEditor.getState().pushToast("Saved", "success");
    void id;
    expect(useEditor.getState()).toBeDefined();
    const toastId = useEditor.getState().toasts[0]!.id;
    useEditor.getState().dismissToast(toastId);
    expect(useEditor.getState().toasts).toHaveLength(0);
  });

  it("keeps the last three toasts", () => {
    for (let index = 0; index < 5; index += 1) {
      useEditor.getState().pushToast(`Message ${index}`);
    }
    expect(useEditor.getState().toasts.length).toBeLessThanOrEqual(3);
  });

  it("propagates non-undoable project patches", () => {
    useEditor.getState().patchProject({ name: "Renamed" });
    expect(useEditor.getState().project.name).toBe("Renamed");
    expect(useEditor.getState().history).toHaveLength(0);
  });

  it("records an undoable project patch", () => {
    useEditor.getState().patchProject({ words: [] }, "Delete everything", true);
    expect(useEditor.getState().history).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().project.words.length).toBeGreaterThan(0);
  });

  it("marks busy work per key", () => {
    useEditor.getState().setBusy("suggest", true);
    expect(useEditor.getState().aiBusy.suggest).toBe(true);
    useEditor.getState().setBusy("suggest", false);
    expect(useEditor.getState().aiBusy.suggest).toBe(false);
  });

  it("updates aspect, mode, language and rules", () => {
    useEditor.getState().setAspect("16:9");
    useEditor.getState().setMode("manual");
    useEditor.getState().setLanguage("fr");
    useEditor.getState().setRules({ maxWordsPerLine: 4 });
    useEditor.getState().setBackground({ kind: "solid", color: "#000000" });
    useEditor.getState().setExport({ sidecar: "vtt" });

    const state = useEditor.getState();
    expect(state.project.aspect).toBe("16:9");
    expect(state.project.mode).toBe("manual");
    expect(state.project.language).toBe("fr");
    expect(state.project.rules.maxWordsPerLine).toBe(4);
    expect(state.project.background.kind).toBe("solid");
    expect(state.exportSettings.sidecar).toBe("vtt");
  });

  it("sets the loop range and snapping", () => {
    useEditor.getState().setLoop({ start: 1, end: 3 });
    expect(useEditor.getState().loopRange).toEqual({ start: 1, end: 3 });
    useEditor.getState().setSnapping(false);
    expect(useEditor.getState().snapping).toBe(false);
    useEditor.getState().setSafeAreas(false);
    expect(useEditor.getState().safeAreas).toBe(false);
  });

  it("opens the command palette and the shortcut sheet", () => {
    useEditor.getState().openCommandPalette(true);
    expect(useEditor.getState().commandPaletteOpen).toBe(true);
    useEditor.getState().openShortcuts(true);
    expect(useEditor.getState().shortcutsOpen).toBe(true);
  });

  it("selects clips and active words", () => {
    useEditor.getState().selectClip("c2");
    useEditor.getState().setActiveWord("w001");
    expect(useEditor.getState().selectedClipId).toBe("c2");
    expect(useEditor.getState().activeWordId).toBe("w001");
  });
});
