/**
 * Media bundled with the app so the editor can be opened with something real
 * playing instead of a grey rectangle.
 *
 * These files ship in `public/demo/` and are served same-origin. They are the
 * only media the app ever loads without the user picking a file — every other
 * project's footage lives in OPFS on the user's own device.
 *
 * Licences are recorded here because they must be shown in the UI: the demo clip
 * is CC BY-SA 4.0 and the attribution has to travel with it.
 */

export type DemoMedia = {
  /** Project id this asset belongs to. */
  projectId: string;
  /** Public path of the file. */
  src: string;
  mimeType: string;
  /** Human-readable credit, shown next to the project and in the preview badge. */
  credit: string;
  license: { name: string; url: string; author: string };
  /** Filename shown as the project's source. */
  fileName: string;
};

export const DEMO_MEDIA: DemoMedia[] = [
  {
    projectId: "demo-darja-reel",
    src: "/demo/demo-clip.webm",
    mimeType: "video/webm",
    credit: "Fayçal (Darja) — Wikitongues · CC BY-SA 4.0",
    license: {
      name: "CC BY-SA 4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/",
      author: "Wikitongues, Anass Sedrati",
    },
    fileName: "wikitongues-faycal-darja.webm",
  },
];

/** Second demo (podcast take) reuses the same bundled clip. */
const DEMO_ALIASES: Record<string, string> = {
  "demo-podcast-clip": "demo-darja-reel",
};

export function demoMediaFor(projectId: string): DemoMedia | undefined {
  const canonical = DEMO_MEDIA.find((entry) => entry.projectId === projectId);
  if (canonical) return canonical;
  const alias = DEMO_ALIASES[projectId];
  return alias ? DEMO_MEDIA.find((entry) => entry.projectId === alias) : undefined;
}

export function isDemoProject(projectId: string): boolean {
  return Boolean(demoMediaFor(projectId));
}
