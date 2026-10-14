"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { CircleCheck, Download, FileText, Lock, Share2, TriangleAlert, X } from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Segmented, SwitchRow } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { DEFAULT_RULES, cuesToSrt, cuesToVtt, detectDirection, groupWordsIntoCues } from "@/lib/captions";
import { resolvePreset } from "@/lib/presets";
import { canRender, pickMimeType, renderProject } from "@/lib/render";
import type { ExportSettings } from "@/lib/types";
import { cn } from "@/lib/cn";

type Phase = "idle" | "rendering" | "done" | "failed" | "cancelled";

export function ExportDialog({
  open,
  onOpenChange,
  sourceRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const t = useTranslations("exportDialog");
  const { n, tc } = useFormat();
  const { toast } = useToast();

  const { project, exportSettings } = useEditor(
    useShallow((state: EditorState) => ({ project: state.project, exportSettings: state.exportSettings })),
  );
  const setExport = useEditor((state) => state.setExport);
  const patchProject = useEditor((state) => state.patchProject);

  const [phase, setPhase] = React.useState<Phase>("idle");
  const [percent, setPercent] = React.useState(0);
  const [step, setStep] = React.useState("");
  const [result, setResult] = React.useState<{ blob: Blob; fileName: string; degraded: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const browserSupportsRender = React.useMemo(() => canRender(), []);
  const mimeType = React.useMemo(
    () => pickMimeType(exportSettings.format),
    [exportSettings.format],
  );

  const cues = React.useMemo(
    () => groupWordsIntoCues(project.words, { ...DEFAULT_RULES, ...project.rules }),
    [project.words, project.rules],
  );

  const sizeEstimateMb = Math.max(4, Math.round((project.durationSec * 260) / 1024));

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const downloadSidecar = () => {
    if (exportSettings.sidecar === "none") return;
    const text =
      exportSettings.sidecar === "srt"
        ? cuesToSrt(cues)
        : cuesToVtt(cues, { direction: detectDirection(cues[0]?.text ?? "") });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${exportSettings.filename}.${exportSettings.sidecar}`);
    toast({ title: t("download"), tone: "success" });
  };

  const start = async () => {
    setError(null);
    setResult(null);
    setPercent(0);
    setPhase("rendering");

    if (!browserSupportsRender) {
      setPhase("failed");
      setError("UNSUPPORTED_BROWSER");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const rendered = await renderProject({
        project,
        preset: resolvePreset(project.presetId, project.captionOverrides),
        background: project.background,
        format: exportSettings.format === "m4a" ? "m4a" : exportSettings.format === "webm" ? "webm" : "webm",
        ...(exportSettings.resolution === "720" ? { targetHeight: 720 } : {}),
        source: sourceRef?.current ?? null,
        onProgress: (value, currentStep) => {
          setPercent(value);
          setStep(currentStep);
        },
        signal: controller.signal,
      });

      setResult({ blob: rendered.blob, fileName: rendered.fileName, degraded: rendered.degraded });
      setPhase("done");
      patchProject({ status: "exported", lastExportAt: Date.now() });

      if (exportSettings.sidecar !== "none") downloadSidecar();
    } catch (caught) {
      if ((caught as Error)?.name === "AbortError") {
        setPhase("cancelled");
        return;
      }
      setPhase("failed");
      setError((caught as Error)?.message ?? "UNKNOWN");
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase("cancelled");
    toast({ title: t("cancelled"), tone: "warn" });
  };

  const share = async () => {
    if (!result) return;
    const file = new File([result.blob], result.fileName, { type: result.blob.type });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: project.name });
      return;
    }
    toast({ title: t("shareUnsupported"), tone: "info" });
  };

  const formatLabel =
    exportSettings.format === "mp4"
      ? t("formatMp4")
      : exportSettings.format === "webm"
        ? t("formatWebm")
        : t("formatAudio");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("title")}
        description={t("subtitle")}
        size="lg"
        footer={
          phase === "done" ? (
            <>
              <Button variant="ghost" onClick={() => setPhase("idle")}>
                {t("newExport")}
              </Button>
              <Button variant="secondary" icon={<Share2 />} onClick={() => void share()}>
                {t("share")}
              </Button>
              <Button
                variant="primary"
                icon={<Download />}
                onClick={() => result && downloadBlob(result.blob, result.fileName)}
              >
                {t("download")}
              </Button>
            </>
          ) : phase === "rendering" ? (
            <Button variant="danger-ghost" icon={<X />} onClick={cancel}>
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button variant="primary" icon={<Download />} onClick={() => void start()}>
                {t("startExport")}
              </Button>
            </>
          )
        }
      >
        {phase === "rendering" || phase === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <ProgressRing
              value={percent}
              size={112}
              strokeWidth={6}
              tone={phase === "done" ? "primary" : "primary"}
              indeterminate={phase === "rendering" && percent === 0}
            />
            <div>
              <p className="text-base font-semibold text-fg">
                {phase === "done" ? t("successTitle") : t("progressTitle")}
              </p>
              <p className="num-tabular mt-1 text-sm text-muted">
                {phase === "done"
                  ? t("successBody", {
                      name: result?.fileName ?? exportSettings.filename,
                      size: `${n(sizeEstimateMb)} MB`,
                    })
                  : t("progressStep", {
                      step: t(`section${step === "finalising" ? "Quality" : "Output"}` as "sectionOutput"),
                      percent: Math.round(percent),
                    })}
              </p>
              {phase === "rendering" ? (
                <p className="mt-2 max-w-md text-xs text-subtle">{t("subtitle")}</p>
              ) : null}
            </div>
            {result?.degraded ? (
              <Badge tone="warn">
                <TriangleAlert aria-hidden className="size-3" />
                {t("failedWebCodecs")}
              </Badge>
            ) : null}
            {phase === "done" && project.quran.length > 0 ? (
              <p className="max-w-md text-xs text-gold">{t("quranNotice")}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            {phase === "failed" ? (
              <div
                role="alert"
                className="rounded-md border border-danger/40 bg-danger-soft/40 p-3 text-sm text-fg"
              >
                <p className="font-semibold">{t("failedTitle")}</p>
                <p className="mt-1 text-xs text-muted">
                  {error === "UNSUPPORTED_BROWSER" ? t("failedWebCodecs") : t("failedBody")}
                </p>
              </div>
            ) : null}

            {!browserSupportsRender || !mimeType ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn-soft/40 p-3 text-xs text-muted"
              >
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
                <span>{t("failedWebCodecs")}</span>
              </div>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                {t("sectionOutput")}
              </h3>
              <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary-soft/40 p-3">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-fg">
                    {t("resolutionOriginal", { value: `${project.aspect} · ${n(project.durationSec ? 1080 : 1080)}p` })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{t("resolutionLockedNote")}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted">{t("format")}</span>
                  <Select
                    value={exportSettings.format}
                    onValueChange={(value) => setExport({ format: value as ExportSettings["format"] })}
                  >
                    <SelectTrigger aria-label={t("format")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">{t("formatMp4")}</SelectItem>
                      <SelectItem value="webm">{t("formatWebm")}</SelectItem>
                      <SelectItem value="m4a">{t("formatAudio")}</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted">{t("filename")}</span>
                  <input
                    value={exportSettings.filename}
                    onChange={(event) => setExport({ filename: event.target.value })}
                    className="force-ltr h-10 w-full rounded-md border border-border bg-ink/60 px-3 font-mono text-sm text-fg outline-none focus:border-primary/60 touch:h-12"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{formatLabel}</Badge>
                <Badge tone="neutral">
                  <span className="num-tabular font-mono">{tc(project.durationSec)}</span>
                </Badge>
                <Badge tone="neutral">
                  <span className="num-tabular">{n(sizeEstimateMb)} MB</span>
                </Badge>
                {project.quran.length > 0 ? <Badge tone="gold">{t("quranNotice")}</Badge> : null}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                {t("sectionCaptions")}
              </h3>
              <SwitchRow
                label={t("burnCaptions")}
                description={t("burnCaptionsDesc")}
                checked={exportSettings.burnCaptions}
                onCheckedChange={(value) => setExport({ burnCaptions: value })}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">{t("sidecarLabel")}</span>
                <Segmented
                  label={t("sidecarLabel")}
                  size="sm"
                  value={exportSettings.sidecar}
                  onValueChange={(value) => setExport({ sidecar: value })}
                  options={[
                    { value: "none", label: t("sidecarNone") },
                    { value: "srt", label: t("sidecarSrt") },
                    { value: "vtt", label: t("sidecarVtt") },
                  ]}
                />
              </div>
              {exportSettings.sidecar !== "none" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  full
                  icon={<FileText />}
                  className={cn("justify-start border border-dashed border-border")}
                  onClick={downloadSidecar}
                >
                  {exportSettings.sidecar === "srt" ? t("sidecarSrt") : t("sidecarVtt")} ·{" "}
                  {n(cues.length)}
                </Button>
              ) : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                {t("sectionQuality")}
              </h3>
              <Segmented
                label={t("quality")}
                value={exportSettings.quality}
                onValueChange={(value) => setExport({ quality: value })}
                options={[
                  { value: "high", label: t("qualityHigh") },
                  { value: "balanced", label: t("qualityBalanced") },
                  { value: "small", label: t("qualitySmall") },
                ]}
                full
              />
              <p className="num-tabular text-xs text-subtle">
                {t("estimate", {
                  size: `${n(sizeEstimateMb)} MB`,
                  time: tc(Math.max(8, project.durationSec * 1.2)),
                })}
              </p>
            </section>

            {phase === "cancelled" ? (
              <p role="status" className="flex items-center gap-2 text-xs text-muted">
                <CircleCheck aria-hidden className="size-3.5 text-warn" />
                {t("cancelled")}
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
