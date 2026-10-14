"use client";

import * as React from "react";
import { create } from "zustand";
import { getSetting } from "./db";

/**
 * Who is signed in, according to this deployment's own API.
 *
 * The session cookie is httpOnly, so the browser cannot read it — and it must
 * not try. The only source of truth is `GET /api/auth/session`, fetched once and
 * cached in a tiny store so the header, the dashboard and the auth form all
 * agree the moment one of them changes the answer.
 *
 * Deliberately client-side: reading cookies in the locale layout would opt every
 * page out of static rendering for a value that only matters after hydration.
 */

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  /** True for the anonymous "continue on this device" visitor. */
  local: boolean;
};

export type SessionProvider = "local" | "supabase";

type SessionResponse = {
  user: SessionUser | null;
  provider?: SessionProvider;
  configured?: boolean;
};

type SessionStore = {
  user: SessionUser | null;
  provider: SessionProvider;
  configured: boolean;
  /** A visitor who chose "continue locally" on this device. */
  localProfile: boolean;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  load: (force?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  user: null,
  provider: "local",
  configured: false,
  localProfile: false,
  status: "idle",
  error: null,

  load: async (force = false) => {
    if (!force && get().status === "loading") return;
    set({ status: "loading" });
    try {
      const [response, profile] = await Promise.all([
        fetch("/api/auth/session", { cache: "no-store" }),
        getSetting<{ mode?: string } | null>("local-profile", null).catch(() => null),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as SessionResponse;
      set({
        user: body.user ?? null,
        provider: body.provider ?? "local",
        configured: Boolean(body.configured),
        localProfile: Boolean(profile),
        status: "ready",
        error: null,
      });
    } catch (caught) {
      // A studio with no backend reachable is still usable: stay signed out and
      // keep the reason available instead of blocking the header on a spinner.
      set({ status: "error", error: (caught as Error)?.message ?? "unknown" });
    }
  },

  signOut: async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      set({ user: null, localProfile: false, status: "ready" });
    }
  },
}));

/** Refetch the session after a sign-in, sign-up or local-profile choice. */
export function refreshSession(): Promise<void> {
  return useSessionStore.getState().load(true);
}

/**
 * Loads the session on mount and returns it. Safe to call from any number of
 * components: the fetch happens once per page load.
 */
export function useSession() {
  const store = useSessionStore();

  React.useEffect(() => {
    if (useSessionStore.getState().status === "idle") void useSessionStore.getState().load();
  }, []);

  return store;
}
