"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useEditor } from "@/lib/editor-store";
import { outputToSource, totalDuration } from "@/lib/timeline";

/**
 * The playhead is driven by a rAF clock over the *output* timeline, not by the
 * media element's own clock. That is the only way a cut sequence plays
 * correctly: the media element only knows the source timeline.
 *
 * When real media is attached we keep it in sync (and muted-scrub it), so the
 * picture follows the cut without becoming the source of truth.
 */
export function usePlayback(mediaRef?: RefObject<HTMLMediaElement | null>) {
  const playing = useEditor((state) => state.playing);
  const speed = useEditor((state) => state.speed);
  const loopRange = useEditor((state) => state.loopRange);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const playheadRef = useRef(useEditor.getState().playhead);

  useEffect(() => useEditor.subscribe((state) => {
    playheadRef.current = state.playhead;
  }), []);

  /**
   * While paused the picture still follows the playhead: a deep link, a
   * suggestion jump or a clip selection has to show the frame it points at, not
   * the last frame that happened to play.
   */
  useEffect(
    () =>
      useEditor.subscribe((state, previous) => {
        if (state.playing || state.playhead === previous.playhead) return;
        const media = mediaRef?.current;
        if (!media) return;
        const source = outputToSource(state.playhead, state.project.clips);
        if (source === null) return;
        if (Math.abs(media.currentTime - source) > 0.05) {
          try {
            media.currentTime = source;
          } catch {
            /* Seeking before metadata is ready is expected — ignore. */
          }
        }
      }),
    [mediaRef],
  );

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      mediaRef?.current?.pause();
      return;
    }

    lastRef.current = performance.now();

    const tick = (now: number) => {
      const state = useEditor.getState();
      const clips = state.project.clips;
      const duration = totalDuration(clips);
      const delta = ((now - lastRef.current) / 1000) * speed;
      lastRef.current = now;

      let next = state.playhead + delta;

      if (state.loopRange && next >= state.loopRange.end) {
        next = state.loopRange.start;
      } else if (!state.loopRange && next >= duration) {
        next = duration;
        state.pause();
      }

      state.setPlayhead(next);

      // Keep an attached media element roughly in step with the cut.
      const media = mediaRef?.current;
      if (media) {
        const source = outputToSource(next, clips);
        if (source !== null && Math.abs(media.currentTime - source) > 0.12) {
          try {
            media.currentTime = source;
          } catch {
            /* Seeking before metadata is ready is expected — ignore. */
          }
        }
        if (media.paused) void media.play().catch(() => undefined);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, speed, loopRange, mediaRef]);

  /** Marks the word being spoken so the transcript can highlight it. */
  useEffect(() => {
    return useEditor.subscribe((state) => {
      const source = outputToSource(state.playhead, state.project.clips);
      if (source === null) return;
      const word = state.project.words.find(
        (candidate) => !candidate.deleted && source >= candidate.start && source <= candidate.end,
      );
      if (word && word.id !== state.activeWordId) state.setActiveWord(word.id);
    });
  }, []);
}
