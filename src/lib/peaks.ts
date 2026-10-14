"use client";

import { useSyncExternalStore } from "react";
import { placeholderPeaks } from "./waveform";

/**
 * Peaks live outside React: they are a few thousand floats per project that
 * change once (when media is decoded) and are read by the canvas every frame.
 * Putting them in the store would mean re-rendering the editor on every decode.
 */
const cache = new Map<string, Float32Array>();
const listeners = new Set<() => void>();

export function setPeaks(projectId: string, peaks: Float32Array): void {
  cache.set(projectId, peaks);
  for (const listener of listeners) listener();
}

export function getPeaks(projectId: string): Float32Array | undefined {
  return cache.get(projectId);
}

export function clearPeaks(projectId?: string): void {
  if (projectId) cache.delete(projectId);
  else cache.clear();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable seed so a project without decoded media still gets the same picture. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function usePeaks(projectId: string, duration: number): Float32Array {
  const peaks = useSyncExternalStore(
    subscribe,
    () => cache.get(projectId),
    () => undefined,
  );

  return peaks ?? placeholderPeaks(Math.max(1, duration), hashString(projectId));
}
