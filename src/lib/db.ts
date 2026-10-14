"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MediaHandle, Project } from "./types";

/**
 * IndexedDB holds project metadata, transcripts and settings.
 * Media blobs live in OPFS (see media-store.ts) — IndexedDB only keeps the
 * handle, so a 2 GB file never has to be structured-cloned.
 */
type StudioDB = DBSchema & {
  projects: {
    key: string;
    value: Project;
    indexes: { updatedAt: number };
  };
  media: {
    key: string;
    value: MediaHandle & { blob?: Blob };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
};

const DB_NAME = "dz-video-ai-studio";
let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null;

export function studioDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  dbPromise ??= openDB<StudioDB>(DB_NAME, 1, {
    upgrade(db) {
      const projects = db.createObjectStore("projects", { keyPath: "id" });
      projects.createIndex("updatedAt", "updatedAt");
      db.createObjectStore("media", { keyPath: "projectId" });
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
  return dbPromise;
}

export async function listProjects(): Promise<Project[]> {
  const db = await studioDB();
  const projects = await db.getAll("projects");
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await studioDB();
  return db.get("projects", id);
}

export async function putProject(project: Project): Promise<void> {
  const db = await studioDB();
  await db.put("projects", project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await studioDB();
  await db.delete("projects", id);
  await db.delete("media", id);
}

export async function putMedia(handle: MediaHandle, blob?: Blob): Promise<void> {
  const db = await studioDB();
  await db.put("media", blob ? { ...handle, blob } : handle);
}

export async function getMedia(projectId: string) {
  const db = await studioDB();
  return db.get("media", projectId);
}

export async function clearMedia(): Promise<void> {
  const db = await studioDB();
  await db.clear("media");
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await studioDB();
    const row = await db.get("settings", key);
    return (row?.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await studioDB();
  await db.put("settings", { key, value });
}

/** Best-effort storage estimate for the settings screen. */
export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return { usage: 0, quota: 0 };
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}
