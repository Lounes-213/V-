"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  Database,
  Download,
  Globe,
  HardDrive,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { Segmented, SwitchRow } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { CAPTION_PRESETS } from "@/lib/presets";
import { clearMedia, listProjects, storageEstimate, getSetting } from "@/lib/db";
import { clearPeaks } from "@/lib/peaks";
import { fetchAiStatus, type AiStatus } from "@/lib/ai/client";
import { pickMimeType } from "@/lib/render";
import { opfsSupported } from "@/lib/media-store";
import { usePrefs, type PrefsState } from "@/lib/prefs-store";
import { routing } from "@/i18n/routing";
import type { AspectRatio, DigitStyle, TranscriptLanguage } from "@/lib/prefs-store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/cn";

type Check = { id: string; label: string; ok: boolean; detail?: string };

export default function SettingsPage() {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const nav = useTranslations("nav");
  const quran = useTranslations("quran");
  const states = useTranslations("states");
  const { n } = useFormat();
  const router = useRouter();
  const locale = useLocale();
  const { toast } = useToast();

  const prefs = usePrefs();
  const [storage, setStorage] = React.useState<{ usage: number; quota: number } | null>(null);
  const [ai, setAi] = React.useState<AiStatus | null>(null);
  const [checks, setChecks] = React.useState<Check[] | null>(null);
  const [running, setRunning] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
    void storageEstimate().then(setStorage).catch(() => setStorage(null));
    void fetchAiStatus().then(setAi).catch(() => setAi(null));
    void listProjects().then(setProjects).catch(() => setProjects([]));
    void getSetting("prefs-exported-at", 0);
  }, []);

  const setPref = <K extends keyof PrefsState>(key: K, value: PrefsState[K]) => {
    prefs.set(key, value);
  };

  /** Real capability probes — the same features the editor depends on at runtime. */
  const runDiagnostics = async () => {
    setRunning(true);
    const results: Check[] = [];
    const push = (id: string, label: string, ok: boolean, detail?: string) =>
      results.push({ id, label, ...(detail ? { detail } : {}), ok });

    push("indexeddb", "IndexedDB", typeof indexedDB !== "undefined");
    push("opfs", "Origin Private File System", opfsSupported(), opfsSupported() ? undefined : "Falling back to IndexedDB blobs");
    push("audio", "Web Audio", typeof window !== "undefined" && Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext));
    push("canvas", "Canvas 2D", (() => {
      try {
        return Boolean(document.createElement("canvas").getContext("2d"));
      } catch {
        return false;
      }
    })());
    push(
      "recorder",
      "MediaRecorder",
      typeof window !== "undefined" && "MediaRecorder" in window,
      // The container the exporter would actually use on this browser.
      pickMimeType("mp4") ?? pickMimeType("webm") ?? undefined,
    );
    push("webcodecs", "WebCodecs", typeof window !== "undefined" && "VideoEncoder" in window);
    push("storage", "Storage quota", Boolean(storage && storage.quota > 0), storage ? `${(storage.usage / 1024 / 1024).toFixed(1)} / ${(storage.quota / 1024 / 1024).toFixed(0)} MB` : undefined);

    try {
      const status = await fetchAiStatus();
      push("ai-analyze", "AI ranking", status.analyze);
      push("ai-transcribe", "AI transcription", status.transcribe);
    } catch {
      push("ai-analyze", "AI ranking", false, t("diagnosticsFail"));
      push("ai-transcribe", "AI transcription", false, t("diagnosticsFail"));
    }

    setChecks(results);
    setRunning(false);
  };

  const exportData = async () => {
    const rows = await listProjects();
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      prefs,
      projects: rows,
      note: "Media files are not included: they live in OPFS on this device and never enter this export.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dz-studio-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: t("exportData"), tone: "success" });
  };

  const clearCache = async () => {
    await clearMedia();
    clearPeaks();
    setStorage(await storageEstimate());
    setConfirmClear(false);
    toast({ title: t("clearCacheDone"), tone: "success" });
  };

  const sections = [
    { id: "appearance", label: t("sectionAppearance"), icon: <Palette /> },
    { id: "defaults", label: t("sectionDefaults"), icon: <Sparkles /> },
    { id: "privacy", label: t("sectionPrivacy"), icon: <ShieldCheck /> },
    { id: "quran", label: t("sectionQuran"), icon: <BookOpen /> },
    { id: "advanced", label: t("sectionAdvanced"), icon: <Zap /> },
    { id: "about", label: t("sectionAbout"), icon: <Activity /> },
  ];

  return (
    <AppShell>
      <PageFrame width="narrow">
        <header>
          <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </header>

        <nav aria-label={t("title")} className="mt-5 flex flex-wrap gap-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/35 hover:text-fg [&_svg]:size-3.5"
            >
              {section.icon}
              {section.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-4">
          {/* ------------------------------------------------ appearance -- */}
          <Card id="appearance">
            <CardHeader title={t("sectionAppearance")} icon={<Palette />} />
            <div className="mt-4 space-y-4">
              <Segmented
                label={t("themeLabel")}
                value={prefs.theme}
                onValueChange={(value) => setPref("theme", value as PrefsState["theme"])}
                options={[
                  { value: "dark", label: t("themeDark") },
                  { value: "light", label: t("themeLight") },
                  { value: "system", label: t("themeSystem") },
                ]}
              />
              <div>
                <Segmented
                  label={t("digitsLabel")}
                  value={prefs.digits}
                  onValueChange={(value) => setPref("digits", value as DigitStyle)}
                  options={[
                    { value: "western", label: t("digitsWestern") },
                    { value: "arabic", label: t("digitsArabic") },
                  ]}
                />
                <p className="mt-1 text-xs text-subtle">
                  {t("digitsHint")} — {n(1234567)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-fg" htmlFor="locale">
                  {t("languageLabel")}
                </label>
                <Select
                  value={locale}
                  onValueChange={(next) => {
                    router.replace("/settings", { locale: next as (typeof routing.locales)[number] });
                  }}
                >
                  <SelectTrigger id="locale" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Segmented
                label={t("reducedMotionLabel")}
                value={prefs.reducedMotion === "system" ? "system" : prefs.reducedMotion ? "on" : "off"}
                onValueChange={(value) => setPref("reducedMotion", value === "system" ? "system" : value === "on")}
                options={[
                  { value: "system", label: t("reducedMotionSystem") },
                  { value: "on", label: t("reducedMotionOn") },
                  { value: "off", label: t("reducedMotionOff") },
                ]}
              />
              <p className="text-xs text-subtle">{t("reducedMotionHint")}</p>
            </div>
          </Card>

          {/* -------------------------------------------------- defaults -- */}
          <Card id="defaults">
            <CardHeader title={t("sectionDefaults")} icon={<Sparkles />} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("defaultAspectLabel")} htmlFor="default-aspect">
                <Select
                  value={prefs.defaultAspect}
                  onValueChange={(value) => setPref("defaultAspect", value as AspectRatio)}
                >
                  <SelectTrigger id="default-aspect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("defaultPresetLabel")} htmlFor="default-preset">
                <Select value={prefs.defaultPreset} onValueChange={(value) => setPref("defaultPreset", value)}>
                  <SelectTrigger id="default-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPTION_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("transcriptLanguageLabel")} htmlFor="transcript-language">
                <Select
                  value={prefs.transcriptLanguage}
                  onValueChange={(value) => setPref("transcriptLanguage", value as TranscriptLanguage)}
                >
                  <SelectTrigger id="transcript-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar-DZ">الدارجة الجزائرية</SelectItem>
                    <SelectItem value="ar">العربية الفصحى</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-3 sm:col-span-2">
                <SwitchRow
                  label={t("burnCaptionsLabel")}
                  checked={prefs.burnCaptionsByDefault}
                  onCheckedChange={(checked) => setPref("burnCaptionsByDefault", checked)}
                />
                <SwitchRow
                  label={t("autoSaveLabel")}
                  description={t("autoSaveHint")}
                  checked={prefs.autoSave}
                  onCheckedChange={(checked) => setPref("autoSave", checked)}
                />
              </div>
            </div>
          </Card>

          {/* --------------------------------------------------- privacy -- */}
          <Card id="privacy">
            <CardHeader title={t("sectionPrivacy")} icon={<ShieldCheck />} />
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary-soft/15 p-3">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-fg">{t("keepMediaLocalLabel")}</p>
                  <p className="mt-0.5 text-xs text-muted">{t("keepMediaLocalHint")}</p>
                </div>
                <Badge tone="primary" className="ms-auto">
                  {common("locked")}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{t("storageUsed")}</p>
                  <p className="num-tabular mt-0.5 text-xs text-muted">
                    {storage ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB / ${(storage.quota / 1024 / 1024).toFixed(0)} MB` : "—"}
                    {" · "}
                    {n(projects.length)} {nav("dashboard")}
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon={<Trash2 />} onClick={() => setConfirmClear(true)}>
                  {t("clearCache")}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{t("exportData")}</p>
                  <p className="mt-0.5 text-xs text-muted">{t("exportDataDesc")}</p>
                </div>
                <Button variant="secondary" size="sm" icon={<Download />} onClick={() => void exportData()}>
                  {common("download")}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{t("deleteAccount")}</p>
                  <p className="mt-0.5 text-xs text-muted">{t("deleteAccountBody")}</p>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  {t("deleteAccount")}
                </Button>
              </div>
            </div>
          </Card>

          {/* ----------------------------------------------------- quran -- */}
          <Card id="quran">
            <CardHeader title={t("sectionQuran")} icon={<BookOpen />} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={quran("scriptLabel")} htmlFor="quran-script">
                <Select
                  value={prefs.quranScript}
                  onValueChange={(value) => setPref("quranScript", value as PrefsState["quranScript"])}
                >
                  <SelectTrigger id="quran-script">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uthmani">{quran("scriptUthmani")}</SelectItem>
                    <SelectItem value="imlaei">{quran("scriptImlaei")}</SelectItem>
                    <SelectItem value="indopak">{quran("scriptIndopak")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("quranTranslationLabel")} htmlFor="quran-translation">
                <Select
                  value={String(prefs.quranTranslationId)}
                  onValueChange={(value) => setPref("quranTranslationId", Number(value))}
                >
                  <SelectTrigger id="quran-translation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="136">Montada Islamic Foundation (FR)</SelectItem>
                    <SelectItem value="131">Dr. Mustafa Khattab (EN)</SelectItem>
                    <SelectItem value="0">{common("none")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-subtle sm:col-span-2">{t("quranScriptHint")}</p>
              <div className="sm:col-span-2">
                <SwitchRow
                  label={t("quranTranslationDefault")}
                  checked={prefs.showTranslationByDefault}
                  onCheckedChange={(checked) => setPref("showTranslationByDefault", checked)}
                />
              </div>
            </div>
          </Card>

          {/* -------------------------------------------------- advanced -- */}
          <Card id="advanced">
            <CardHeader title={t("sectionAdvanced")} icon={<Zap />} />
            <div className="mt-4 space-y-4">
              <SwitchRow
                label={t("hardwareAccelLabel")}
                description={ai?.analyze === false ? t("hardwareAccelHint") : t("hardwareAccelUnavailable")}
                checked={prefs.hardwareAccel}
                onCheckedChange={(checked) => setPref("hardwareAccel", checked)}
              />
              <Segmented
                label={t("threadsLabel")}
                value={String(prefs.ffmpegThreads)}
                onValueChange={(value) => setPref("ffmpegThreads", Number(value) as PrefsState["ffmpegThreads"])}
                options={[
                  { value: "2", label: "2" },
                  { value: "4", label: "4" },
                  { value: "8", label: "8" },
                ]}
              />
              <p className="text-xs text-subtle">{t("threadsHint")}</p>

              <div className="rounded-lg border border-border bg-ink/40 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg">{t("diagnostics")}</p>
                    <p className="mt-0.5 text-xs text-muted">{t("diagnosticsDesc")}</p>
                  </div>
                  <Button variant="secondary" size="sm" icon={<Activity />} disabled={running} onClick={() => void runDiagnostics()}>
                    {running ? t("diagnosticsRunning") : t("diagnostics")}
                  </Button>
                </div>

                {checks ? (
                  <ul className="mt-3 space-y-1.5">
                    {checks.map((check) => (
                      <li key={check.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full border",
                            check.ok ? "border-primary/40 text-primary" : "border-danger/50 text-danger",
                          )}
                        >
                          {check.ok ? <Check aria-hidden className="size-3" /> : <X aria-hidden className="size-3" />}
                        </span>
                        <span className="text-fg">{check.label}</span>
                        <span className="text-subtle">{check.ok ? t("diagnosticsPass") : t("diagnosticsFail")}</span>
                        {check.detail ? <span className="num-tabular ms-auto font-mono text-[10px] text-subtle">{check.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" icon={<AlertTriangle />} onClick={() => setConfirmReset(true)}>
                  {t("resetDefaults")}
                </Button>
              </div>
            </div>
          </Card>

          {/* ----------------------------------------------------- about -- */}
          <Card id="about">
            <CardHeader title={t("sectionAbout")} icon={<Activity />} />
            <div className="mt-4 space-y-3 text-xs text-muted">
              <p className="flex items-center gap-2">
                <Database aria-hidden className="size-3.5" /> IVS — Intelligent Video Studio · v0.1.0
              </p>
              <p className="flex items-center gap-2">
                <HardDrive aria-hidden className="size-3.5" /> Media: OPFS (local) · metadata: IndexedDB
              </p>
              <p className="flex items-center gap-2">
                <Globe aria-hidden className="size-3.5" /> {storyline(locale)}
              </p>
              <p>
                AI: {ai === null ? "—" : ai.analyze || ai.transcribe ? "Gemini (server-side, opt-in)" : t("diagnosticsFail")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="ghost" size="xs">
                  <Link href="/legal/privacy">{t("sectionPrivacy")}</Link>
                </Button>
                <Button asChild variant="ghost" size="xs">
                  <Link href="/legal/ai-disclosure">AI</Link>
                </Button>
                <Button asChild variant="ghost" size="xs">
                  <Link href="/legal/reciter-rights">{quran("reciterRightsTitle")}</Link>
                </Button>
              </div>
              <p className="text-[11px] text-subtle">{states("maintenanceBody")}</p>
            </div>
          </Card>
        </div>
      </PageFrame>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent title={t("clearCacheConfirm")} description={t("clearCacheConfirm")}>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {common("cancel")}
            </Button>
            <Button variant="danger" onClick={() => void clearCache()}>
              {t("clearCache")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent title={t("resetConfirm")} description={t("sectionDefaults")}>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              {common("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                prefs.reset();
                setConfirmReset(false);
                toast({ title: t("savedToast"), tone: "success" });
              }}
            >
              {common("reset")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function storyline(locale: string): string {
  if (locale === "ar") return "الجزائر · واجهة عربية بالكامل مع دعم من اليمين لليسار";
  if (locale === "fr") return "Algérie · interface complète en français";
  return "Algeria · full Arabic RTL interface alongside French and English";
}
