"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { getMedia, getProject, putProject } from "@/lib/db";
import { useEditor } from "@/lib/editor-store";
import { setPeaks } from "@/lib/peaks";
import { demoMediaFor } from "@/lib/demo-media";
import { needsRetime, retimeProject } from "@/lib/retime";
import { probeMedia } from "@/lib/media-store";
import {
  createDemoProject,
  createEmptyProject,
  createSecondDemoProject,
} from "@/lib/project-factory";
import { decodeAudioFile } from "@/lib/waveform";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { detectProjectQuran } from "@/lib/quran/canonical";
import { suggestClips } from "@/lib/suggest";

export type LoadedProject = { projectId: string; mediaUrl?: string; mediaRef: React.RefObject<HTMLVideoElement | null> };

/**
 * Hydrates the editor from local storage.
 *
 * Order of truth: IndexedDB project → bundled demo → empty project. Media is
 * only ever read from OPFS/IndexedDB on this device; nothing is fetched.
 */
export function ProjectLoader({ projectId, children }: { projectId: string; children: (ctx: LoadedProject) => React.ReactNode }) {
  const t = useTranslations("editor");
  const states = useTranslations("states");
  const landing = useTranslations("landing");

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState<string | undefined>(undefined);
  const [attempt, setAttempt] = React.useState(0);
  const mediaRef = React.useRef<HTMLVideoElement | null>(null);
  const loadedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const load = async () => {
      setStatus("loading");
      try {
        let project = await getProject(projectId);
        const bundled = demoMediaFor(projectId);

        if (!project && (projectId.startsWith("demo") || projectId === "new-project")) {
          project =
            projectId === "demo-podcast-clip" ? createSecondDemoProject() : createDemoProject({ id: projectId });
          await putProject(project);
        }

        if (!project) {
          project = createEmptyProject(projectId);
        }

        // Quran matches and clip suggestions are *computed from the transcript*
        // every time it is missing: the matcher decides, not a fixture.
        if (project.words.length > 0 && project.quran.length === 0) {
          project = { ...project, quran: detectProjectQuran(project.words) };
        }
        if (project.words.length > 0 && project.suggestions.length === 0) {
          project = { ...project, suggestions: suggestClips(project.words) };
        }

        // ------------------------------------------------------------- media --
        // The real bytes are resolved *before* the store sees the project, so the
        // timeline is never rendered against timings we later have to correct.
        const stored = await getMedia(projectId);
        let blob: Blob | undefined = stored?.blob ?? undefined;
        let sourceName = project.sourceName;

        if (!blob && bundled) {
          const response = await fetch(bundled.src);
          if (response.ok) {
            blob = await response.blob();
            sourceName = bundled.fileName;
          }
        }

        if (blob && !cancelled) {
          let mediaDuration = 0;
          try {
            const probe = await probeMedia(new File([blob], sourceName ?? "media.mp4"));
            mediaDuration = probe.duration;
          } catch {
            /* Undecodable container: fall through and let the player report it. */
          }

          if (mediaDuration > 0 && needsRetime(project, mediaDuration)) {
            project = retimeProject(project, mediaDuration);
          }
          project = { ...project, hasMedia: true, ...(sourceName ? { sourceName } : {}) };
          await putProject(project);

          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          setMediaUrl(url);
        }

        if (cancelled) return;

        useEditor.getState().loadProject(project);
        loadedFor.current = projectId;
        setStatus("ready");

        // Peaks: stored ones when we computed them at import time, otherwise
        // decoded from the real audio track right now.
        if (stored?.peaks) setPeaks(projectId, stored.peaks);
        if (blob && !stored?.peaks) {
          try {
            const decoded = await decodeAudioFile(blob, 4000);
            if (!cancelled) setPeaks(projectId, decoded.peaks);
          } catch {
            /* Video without a decodable audio track is fine — the waveform stays synthetic. */
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError((caught as Error)?.message ?? "unknown");
          setStatus("error");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
      setMediaUrl(undefined);
    };
  }, [projectId, attempt]);

  /* Autosave: debounced, local-only, never on the network. */
  React.useEffect(() => {
    if (status !== "ready") return;
    let timer: number | undefined;

    const unsubscribe = useEditor.subscribe((state, previous) => {
      if (state.project === previous.project) return;
      if (state.dirty === false) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void putProject(useEditor.getState().project).then(() => useEditor.getState().markSaved());
      }, 900);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl p-6" aria-busy="true">
        <p className="mb-4 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck aria-hidden className="size-4 text-primary" />
          {landing("privacyTitle")}
        </p>
        <SkeletonRows rows={5} />
        <p className="mt-3 text-xs text-subtle">{t("emptyTranscript")}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <ErrorState
          title={states("errorTitle")}
          description={states("errorBody")}
          details={error ?? undefined}
          onRetry={() => setAttempt((value) => value + 1)}
          retryLabel={states("errorRetry")}
        />
      </div>
    );
  }

  return (
    <>
      {children({ projectId, mediaUrl, mediaRef })}
      <Button
        variant="ghost"
        size="xs"
        className="sr-only"
        onClick={() => setAttempt((value) => value + 1)}
      >
        {states("errorRetry")}
      </Button>
    </>
  );
}


