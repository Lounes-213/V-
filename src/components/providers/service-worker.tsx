"use client";

import * as React from "react";

/**
 * Registers the service worker.
 *
 * Only in a production build: during development the worker's cache would sit
 * between the browser and freshly compiled chunks, and what you would be looking
 * at is not what the source says.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Not fatal: the app works without a worker, it just re-downloads assets. */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
