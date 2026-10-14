"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/editor-store";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Desktop editing shortcuts. Two rules keep this predictable:
 *  1. never fire while the user is typing in a field or a contenteditable;
 *  2. never swallow a modifier combination we do not own.
 */
export function useEditorShortcuts(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (TYPING_TAGS.has(target.tagName) ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox");

      const store = useEditor.getState();
      const meta = event.ctrlKey || event.metaKey;

      // Command palette and escape work even while typing.
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        store.openCommandPalette(!store.commandPaletteOpen);
        return;
      }
      if (event.key === "Escape") {
        if (store.commandPaletteOpen) store.openCommandPalette(false);
        else if (store.shortcutsOpen) store.openShortcuts(false);
        else if (store.mobileSheetOpen) store.setMobileSheet(false);
        return;
      }
      if (typing) return;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        const label = event.shiftKey ? store.redo() : store.undo();
        if (label) {
          store.pushToast(
            (event.shiftKey ? "Redid " : "Undid ") + label,
            event.shiftKey ? "success" : "info",
          );
        }
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        store.markSaved();
        store.pushToast("Saved locally", "success");
        return;
      }
      if (meta) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          store.toggle();
          break;
        case "j":
          store.setSpeed(Math.max(0.25, Number((store.speed - 0.25).toFixed(2))));
          break;
        case "k":
          store.pause();
          break;
        case "l":
          store.setSpeed(Math.min(4, Number((store.speed + 0.25).toFixed(2))));
          break;
        case ",":
          event.preventDefault();
          store.setPlayhead(store.playhead - 1 / 30);
          break;
        case ".":
          event.preventDefault();
          store.setPlayhead(store.playhead + 1 / 30);
          break;
        case "ArrowLeft":
          if (event.shiftKey) {
            event.preventDefault();
            store.seekWord(-1);
          }
          break;
        case "ArrowRight":
          if (event.shiftKey) {
            event.preventDefault();
            store.seekWord(1);
          }
          break;
        case "s":
        case "S":
          event.preventDefault();
          store.splitAtPlayhead();
          break;
        case "Delete":
        case "Backspace":
          if (store.selectedWordIds.length > 0) {
            event.preventDefault();
            store.cutWords(store.selectedWordIds);
          } else if (store.selectedClipId) {
            event.preventDefault();
            store.deleteClip(store.selectedClipId);
          }
          break;
        case "?":
          event.preventDefault();
          store.openShortcuts(true);
          break;
        case "+":
        case "=":
          event.preventDefault();
          store.zoom(1.25);
          break;
        case "-":
          event.preventDefault();
          store.zoom(1 / 1.25);
          break;
        case "1":
          store.setAspect("9:16");
          break;
        case "2":
          store.setAspect("1:1");
          break;
        case "3":
          store.setAspect("16:9");
          break;
        case "Home":
          event.preventDefault();
          store.setPlayhead(0);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
