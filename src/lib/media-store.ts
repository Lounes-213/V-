"use client";

/**
 * Media storage.
 *
 * Primary path is OPFS (Origin Private File System): files stream to disk and
 * never get structured-cloned into IndexedDB, which is what makes multi-gigabyte
 * footage viable. When OPFS is unavailable (older Safari) we fall back to a Blob
 * in IndexedDB and say so in the UI.
 */

const DIR = "dz-media";

export function opfsSupported(): boolean {
  return typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in navigator.storage;
}

async function mediaDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create: true });
}

export async function writeMediaFile(projectId: string, file: File | Blob, name: string): Promise<string | null> {
  if (!opfsSupported()) return null;
  try {
    const dir = await mediaDir();
    const handle = await dir.getFileHandle(`${projectId}__${name}`, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    return `${DIR}/${projectId}__${name}`;
  } catch {
    return null;
  }
}

export async function readMediaFile(opfsPath: string): Promise<File | null> {
  if (!opfsSupported()) return null;
  try {
    const parts = opfsPath.split("/");
    const dir = await mediaDir();
    const fileName = parts[parts.length - 1];
    if (!fileName) return null;
    const handle = await dir.getFileHandle(fileName);
    return await handle.getFile();
  } catch {
    return null;
  }
}

export async function deleteMediaFile(opfsPath: string): Promise<void> {
  if (!opfsSupported()) return;
  try {
    const parts = opfsPath.split("/");
    const fileName = parts[parts.length - 1];
    if (!fileName) return;
    const dir = await mediaDir();
    await dir.removeEntry(fileName);
  } catch {
    /* Already gone — nothing to do. */
  }
}

export async function clearMediaDir(): Promise<void> {
  if (!opfsSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(DIR, { recursive: true });
  } catch {
    /* Nothing stored yet. */
  }
}

/**
 * Creates a short-lived object URL for a stored file.
 * Callers must revoke it — see `revokeWhenDone`.
 */
export function objectUrlFor(file: Blob): string {
  return URL.createObjectURL(file);
}

export function revokeWhenDone(url: string): () => void {
  return () => URL.revokeObjectURL(url);
}

/** Reads metadata without decoding the whole file. */
export async function probeMedia(file: File): Promise<{
  duration: number;
  width?: number;
  height?: number;
  hasVideo: boolean;
}> {
  const url = URL.createObjectURL(file);
  const element = document.createElement("video");
  element.preload = "metadata";
  element.muted = true;

  try {
    const result = await new Promise<{ duration: number; width: number; height: number }>(
      (resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Timed out reading media metadata.")), 12_000);
        element.onloadedmetadata = () => {
          window.clearTimeout(timer);
          resolve({
            duration: element.duration || 0,
            width: element.videoWidth || 0,
            height: element.videoHeight || 0,
          });
        };
        element.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("This file cannot be decoded in the browser."));
        };
        element.src = url;
      },
    );

    return {
      duration: Number.isFinite(result.duration) ? result.duration : 0,
      ...(result.width ? { width: result.width } : {}),
      ...(result.height ? { height: result.height } : {}),
      hasVideo: result.width > 0,
    };
  } finally {
    URL.revokeObjectURL(url);
    element.removeAttribute("src");
  }
}

/** Grabs a poster frame so project cards are not grey rectangles. */
export async function capturePoster(file: Blob, atSeconds = 1): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("timeout")), 12_000);
      video.onloadeddata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("decode"));
      };
      video.src = url;
    });

    video.currentTime = Math.min(atSeconds, Math.max(0, (video.duration || 2) - 0.1));
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      window.setTimeout(resolve, 2500);
    });

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 480 / Math.max(1, video.videoWidth));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
  }
}
