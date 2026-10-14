"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query the way React expects external stores to be read.
 *
 * `useSyncExternalStore` is the right primitive here: no setState inside an
 * effect, no torn reads when the query changes between render and commit, and a
 * server snapshot that keeps SSR deterministic. The editor mounts client-only,
 * so the server value is simply "no match".
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export const DESKTOP_QUERY = "(min-width: 1024px)";
