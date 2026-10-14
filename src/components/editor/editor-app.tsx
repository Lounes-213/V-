"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEditor, type InspectorTab } from "@/lib/editor-store";
import { DESKTOP_QUERY, useMediaQuery } from "./use-media-query";
import { useEditorShortcuts } from "./use-shortcuts";
import { ProjectLoader } from "./project-loader";
import { DesktopEditor } from "./desktop-editor";
import { MobileEditor } from "./mobile-editor";
import { CommandPalette } from "./command-palette";
import { ShortcutSheet } from "./shortcut-sheet";
import { EditorToasts } from "./editor-toasts";

/**
 * Two shells, one store. The desktop shell is a 3-pane pro layout; the phone
 * shell is a bottom-sheet app. They are never both mounted — the breakpoint is
 * resolved before either renders, so neither pays for the other's layout.
 */
export function EditorApp({ projectId }: { projectId: string }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  useEditorShortcuts(isDesktop);
  const t = useTranslations("a11y");

  return (
    <TooltipProvider>
      <EditorToasts />
      <CommandPalette />
      <ShortcutSheet />
      <h1 className="sr-only">{t("loadingEditor")}</h1>
      <ProjectLoader projectId={projectId}>
        {({ mediaUrl }) => (
          <>
            <EditorDeepLink />
            {isDesktop ? <DesktopEditor mediaUrl={mediaUrl} /> : <MobileEditor mediaUrl={mediaUrl} />}
          </>
        )}
      </ProjectLoader>
    </TooltipProvider>
  );
}

const TABS: InspectorTab[] = ["video", "style", "captions", "background", "export"];

/**
 * The links the rest of the app hands out: `?t=` jumps the playhead to a second
 * on the output timeline (a suggestion, a moment in a transcript) and `?tab=`
 * opens an inspector tab (the overview's "open export"). It runs once per visit,
 * after the project is hydrated, because seeking needs real clips.
 */
function EditorDeepLink() {
  const params = useSearchParams();
  const applied = React.useRef(false);

  React.useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    const at = Number(params.get("t"));
    if (Number.isFinite(at) && at > 0) useEditor.getState().setPlayhead(at);

    const tab = params.get("tab");
    if (tab && (TABS as string[]).includes(tab)) useEditor.getState().setInspectorTab(tab as InspectorTab);
  }, [params]);

  return null;
}
