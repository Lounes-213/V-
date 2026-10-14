"use client";

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { outputToSource } from "@/lib/timeline";
import { resolveTransform } from "@/lib/types";
import type { CSSProperties } from "react";

/**
 * The CapCut-style transform of the clip being inspected or played, expressed as
 * CSS for the preview element. The export pipeline mirrors this on canvas
 * (applyTransform in render.ts), so what you see is what renders.
 */
export function useShallowSelectClipTransform(): CSSProperties {
  const { selectedClipId, playhead, clips } = useEditor(
    useShallow((state: EditorState) => ({
      selectedClipId: state.selectedClipId,
      playhead: state.playhead,
      clips: state.project.clips,
    })),
  );

  const activeClip = React.useMemo(() => {
    if (selectedClipId) return clips.find((clip) => clip.id === selectedClipId) ?? null;
    const source = outputToSource(playhead, clips);
    if (source === null) return null;
    return clips.find((clip) => source >= clip.sourceIn && source <= clip.sourceOut) ?? null;
  }, [clips, playhead, selectedClipId]);

  return React.useMemo(() => {
    const transform = resolveTransform(activeClip?.transform);
    const parts: string[] = [`scale(${transform.scale})`];
    if (transform.x !== 0 || transform.y !== 0) {
      parts.push(`translate(${transform.x}%, ${transform.y}%)`);
    }
    if (transform.rotation !== 0) parts.push(`rotate(${transform.rotation}deg)`);
    if (transform.flipH) parts.push("scaleX(-1)");
    if (transform.flipV) parts.push("scaleY(-1)");
    return {
      transform: parts.join(" "),
      transformOrigin: "center",
      willChange: "transform",
    };
  }, [activeClip]);
}
