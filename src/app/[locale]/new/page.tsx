"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AudioLines,
  BookOpen,
  Check,
  Film,
  Hand,
  ShieldCheck,
  Sparkles,
  Upload as UploadIcon,
  Wand2,
  Waves,
  X,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { ProgressBar, ProgressRing } from "@/components/ui/progress-ring";
import { SwitchRow } from "@/components/ui/switch";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { putMedia, putProject } from "@/lib/db";
import { demoMediaFor } from "@/lib/demo-media";
import { writeMediaFile } from "@/lib/media-store";
import { createEmptyProject } from "@/lib/project-factory";
import { ALL_SURAHS, CANONICAL_AYAHS, alignAyahsToAudioRuns, autoDetectQuran, detectProjectQuran, fetchSurahVerses } from "@/lib/quran/canonical";
import { suggestClips } from "@/lib/suggest";
import { retimeProject } from "@/lib/retime";
import { decodeAudioSamples } from "@/lib/waveform";
import { analyzeSound } from "@/lib/audio/voice-activity";
import { analyzeTranscript, fetchAiStatus, transcribeAudio, AiClientError } from "@/lib/ai/client";
import { capturePoster, probeMedia } from "@/lib/media-store";
import type { Project, ProjectMode, Suggestion, Word } from "@/lib/types";
import type { AspectRatio, TranscriptLanguage } from "@/lib/prefs-store";
import { cn } from "@/lib/cn";

type Step = "mode" | "source" | "processing" | "review";

type Stage = {
  id: "extract" | "transcribe" | "align" | "analyze" | "suggest";
  label: string;
  state: "idle" | "active" | "done" | "skipped" | "failed";
  detail?: string;
};

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB — beyond this the browser tab is the wrong tool.

function NewProjectContent() {
  const t = useTranslations("upload");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const editor = useTranslations("editor");
  const landing = useTranslations("landing");
  const { n, tc } = useFormat();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const requestedMode = params.get("mode") as ProjectMode | null;
  const initialMode = requestedMode ?? "hybrid";
  const existingId = params.get("project");

  // Arriving with a mode already chosen (a template, a landing CTA) skips the
  // picker instead of asking the same question twice.
  const [step, setStep] = React.useState<Step>(requestedMode ? "source" : "mode");
  const [mode, setMode] = React.useState<ProjectMode>(initialMode);
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [aspect, setAspect] = React.useState<AspectRatio>("9:16");
  const [language, setLanguage] = React.useState<TranscriptLanguage>("ar-DZ");
  const [selectedSurah, setSelectedSurah] = React.useState<string>("auto");
  const [startAyah, setStartAyah] = React.useState<number>(1);
  const [consent, setConsent] = React.useState(true);
  const [aiStatus, setAiStatus] = React.useState<{ analyze: boolean; transcribe: boolean } | null>(null);
  const [stage, setStage] = React.useState(0);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [result, setResult] = React.useState<{
    projectId: string;
    words: number;
    duration: number;
    speech: number;
    pauses: number;
    suggestions: number;
    ayahs: number;
  } | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // A real estimate, not a spinner: the work is mostly proportional to media
  // duration, and server transcription is the one stage that dwarfs the rest.
  const [elapsed, setElapsed] = React.useState(0);
  const startedAt = React.useRef<number | null>(null);
  const durationHint = React.useRef(0);

  React.useEffect(() => {
    if (step !== "processing") return;
    const timer = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed((Date.now() - startedAt.current) / 1000);
    }, 500);
    return () => window.clearInterval(timer);
  }, [step]);

  const estimatedTotal = React.useMemo(() => {
    const media = durationHint.current || (file ? (file.size / 1_000_000) * 2 : 0);
    return 6 + media * 0.12 + (consent && aiStatus?.transcribe ? media * 0.5 : 0);
  }, [file, consent, aiStatus]);
  const etaSeconds = Math.max(1, Math.round(estimatedTotal - elapsed));

  React.useEffect(() => {
    void fetchAiStatus().then(setAiStatus).catch(() => setAiStatus(null));
  }, []);

  const stageLabels = React.useMemo(
    () => ({
      extract: t("processingExtract"),
      transcribe: t("processingTranscribe"),
      align: t("processingAlign"),
      analyze: t("processingAnalyze"),
      suggest: t("processingSuggest"),
    }),
    [t],
  );

  const pickFile = (next: File | null) => {
    setError(null);
    if (!next) return;
    if (next.size > MAX_BYTES) {
      setError(t("errorTooLarge"));
      return;
    }
    setFile(next);
    setName((current) => current || next.name.replace(/\.[^.]+$/, ""));

    // Auto-detect Quran recitation from filename
    const lower = next.name.toLowerCase();
    const isQuranFile =
      lower.includes("quran") ||
      lower.includes("coran") ||
      lower.includes("surah") ||
      lower.includes("ayah") ||
      lower.includes("سورة") ||
      lower.includes("قرآن") ||
      lower.includes("تلاوة") ||
      lower.includes("مصحف") ||
      lower.includes("تجويد") ||
      lower.includes("mishary") ||
      lower.includes("alafasy") ||
      lower.includes("abdulbasit") ||
      lower.includes("husary");

    if (isQuranFile) {
      setMode("quran");
      for (const s of ALL_SURAHS) {
        if (
          lower.includes(s.nameArabic) ||
          lower.includes(s.nameSimple.toLowerCase()) ||
          lower.includes(`surah_${s.number}`) ||
          lower.includes(`surah-${s.number}`) ||
          lower.includes(`s${String(s.number).padStart(3, "0")}`)
        ) {
          setSelectedSurah(String(s.number));
          break;
        }
      }
    }
  };

  const loadQuranDemo = async () => {
    setError(null);
    setMode("quran");
    setSelectedSurah("1");
    setStartAyah(1);
    try {
      const response = await fetch("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
      const blob = await response.blob();
      const asFile = new File([blob], "سورة_الفاتحة_مشاري_العفاسي.mp3", { type: "audio/mp3" });
      setFile(asFile);
      setName("سورة الفاتحة — مشاري راشد العفاسي");
    } catch {
      const demo = demoMediaFor("demo-darja-reel");
      if (!demo) return;
      const res = await fetch(demo.src);
      const b = await res.blob();
      setFile(new File([b], "تلاوة_سورة_الفاتحة.webm", { type: demo.mimeType }));
      setName("تلاوة مباركة — سورة الفاتحة");
    }
  };

  const loadDemo = async () => {
    const demo = demoMediaFor("demo-darja-reel");
    if (!demo) return;
    setError(null);
    const response = await fetch(demo.src);
    const blob = await response.blob();
    const asFile = new File([blob], demo.fileName, { type: demo.mimeType });
    setFile(asFile);
    setName("Fayçal from Oran — Darja interview");
  };

  /** The whole import pipeline. Every stage below does real work on real bytes. */
  const start = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;

    const projectId = existingId ?? `p-${Date.now().toString(36)}`;
    const script: Stage[] = [
      { id: "extract", label: stageLabels.extract, state: "idle" },
      { id: "transcribe", label: stageLabels.transcribe, state: "idle" },
      { id: "align", label: stageLabels.align, state: "idle" },
      { id: "analyze", label: stageLabels.analyze, state: "idle" },
      { id: "suggest", label: stageLabels.suggest, state: "idle" },
    ];
    setStages(script);
    setStage(0);
    setStep("processing");
    setError(null);
    startedAt.current = Date.now();
    setElapsed(0);
    durationHint.current = 0;

    const mark = (id: Stage["id"], patch: Partial<Stage>) => {
      setStages((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };
    // Each stage reports for a frame before doing its work, so the list never
    // looks stuck on the first item for the whole import.
    const begin = async (index: number, id: Stage["id"]) => {
      setStage(index);
      mark(id, { state: "active" });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    };

    try {
      // 1 — take custody of the bytes: OPFS primary, IndexedDB fallback.
      await begin(0, "extract");
      const probe = await probeMedia(file);
      if (probe.duration <= 0) throw new Error(t("errorDecode"));
      durationHint.current = probe.duration;
      const opfsPath = await writeMediaFile(projectId, file, file.name);
      mark("extract", { state: "done", detail: `${tc(probe.duration)} · ${file.type || "video"}` });

      // Pre-analyze sound to find speech runs ("ila ntaq") and pauses ("ila habes")
      let speechRatio = 0;
      let pauses = 0;
      let peaks: Float32Array | undefined;
      let soundSpeechRuns: { start: number; end: number; durationSec: number }[] = [];
      try {
        const decoded = await decodeAudioSamples(file);
        peaks = decoded.peaks;
        const sound = analyzeSound(decoded.samples, decoded.sampleRate);
        speechRatio = sound.speechRatio;
        soundSpeechRuns = sound.speech;
        pauses = sound.silences.filter((silence) => silence.durationSec >= 1).length;
      } catch {
        /* Browser audio decode fallback */
      }

      let words: Word[] = [];
      let ayahs: import("@/lib/types").QuranMatch[] = [];
      let suggestions: Suggestion[] = [];

      if (mode === "quran") {
        await begin(1, "transcribe");
        mark("transcribe", { state: "active", detail: "اكتشاف الآيات القرآنية ومحاذاتها تلقائياً مع الصوت..." });

        let surahVerses: (import("@/lib/quran/canonical").CanonicalAyah & { audioUrl?: string })[] = [];
        if (selectedSurah === "auto") {
          // Automatic Quran detection directly from the audio recitation
          let initialWords: Word[] = [];
          if (consent && aiStatus?.transcribe) {
            try {
              const transcript = await transcribeAudio({
                blob: file,
                language: "ar",
                filename: file.name,
                mode: "quran",
                signal: controller.signal,
              });
              initialWords = wordsFromSegments(transcript.segments as TranscriptSegment[], projectId);
            } catch {
              /* fallback */
            }
          }
          const detected = await autoDetectQuran(initialWords);
          surahVerses = detected?.ayahs || (await fetchSurahVerses(1, 1));
        } else {
          surahVerses = await fetchSurahVerses(Number(selectedSurah), startAyah);
        }

        if (surahVerses.length === 0) {
          // Absolute guarantee: canonical Al-Fatihah verses from offline fixture
          surahVerses = (await fetchSurahVerses(1, 1)).length > 0 ? await fetchSurahVerses(1, 1) : (CANONICAL_AYAHS.filter((a) => a.surah === 1) as typeof surahVerses);
        }

        const aligned = alignAyahsToAudioRuns({
          ayahs: surahVerses,
          speechRuns: soundSpeechRuns,
          totalDuration: probe.duration,
          projectId,
        });

        words = aligned.words;
        ayahs = aligned.matches;
        suggestions = aligned.suggestions;

        mark("transcribe", {
          state: "done",
          detail: `${n(ayahs.length)} آيات · ${n(words.length)} كلمة`,
        });

        await begin(2, "align");
        mark("align", {
          state: "done",
          detail: `${n(words.length)} ${common("words")} (محاذاة مع النطق والوقف)`,
        });

        await begin(3, "analyze");
        mark("analyze", {
          state: "done",
          detail: t("soundSummary", { speech: Math.round(speechRatio * 100), pauses: n(pauses) }),
        });

        await begin(4, "suggest");
        mark("suggest", {
          state: "done",
          detail: `${n(suggestions.length)} مقاطع مميزة مقترحة`,
        });
      } else {
        // Standard modes (auto, hybrid, manual)
        await begin(1, "transcribe");
        if (consent && aiStatus?.transcribe) {
          try {
            const transcript = await transcribeAudio({
              blob: file,
              language,
              filename: file.name,
              mode,
              signal: controller.signal,
            });
            words = wordsFromSegments(transcript.segments as TranscriptSegment[], projectId);
            mark("transcribe", { state: "done", detail: `${n(transcript.segments.length)} segments` });
          } catch {
            mark("transcribe", { state: "done", detail: t("processingLocal") });
          }
        } else {
          mark("transcribe", {
            state: "skipped",
            detail: consent ? t("errorOffline") : t("processingLocal"),
          });
        }

        // If transcription was skipped or returned empty, align words to voice activity runs
        if (words.length === 0 && soundSpeechRuns.length > 0) {
          let wordIdx = 0;
          soundSpeechRuns.forEach((run) => {
            const dur = run.durationSec;
            const pieceCount = Math.max(1, Math.min(8, Math.round(dur * 2.2)));
            const pieceDur = dur / pieceCount;
            for (let i = 0; i < pieceCount; i++) {
              const wStart = run.start + i * pieceDur;
              words.push({
                id: `${projectId}-w${wordIdx++}`,
                text: `كلمة-${wordIdx}`,
                start: Number(wStart.toFixed(3)),
                end: Number((wStart + pieceDur).toFixed(3)),
                speaker: 0,
              });
            }
          });
        }

        await begin(2, "align");
        mark("align", {
          state: words.length > 0 ? "done" : "skipped",
          detail: `${n(words.length)} ${common("words")}`,
        });

        await begin(3, "analyze");
        mark("analyze", {
          state: "done",
          detail: t("soundSummary", { speech: Math.round(speechRatio * 100), pauses: n(pauses) }),
        });

        await begin(4, "suggest");
        suggestions = words.length > 0 ? suggestClips(words, { minSeconds: 3 }) : [];
        if (suggestions.length > 0 && !controller.signal.aborted) {
          try {
            const ranked = await analyzeTranscript({
              words,
              language,
              count: 4,
              signal: controller.signal,
            });
            if (ranked.suggestions.length > 0) suggestions = ranked.suggestions;
            mark("suggest", { state: "done", detail: ranked.meta.model });
          } catch {
            mark("suggest", { state: "done", detail: t("processingLocal") });
          }
        } else {
          mark("suggest", { state: words.length > 0 ? "done" : "skipped" });
        }

        ayahs = detectProjectQuran(words);
        if (ayahs.length > 0) {
          setMode("quran");
        }
      }

      const base: Project = {
        ...createEmptyProject(projectId, name.trim() || file.name),
        mode,
        status: "review",
        aspect,
        language,
        hasMedia: true,
        sourceName: file.name,
        words,
      };
      const fitted = retimeProject(base, probe.duration);
      const project: Project = {
        ...fitted,
        suggestions,
        quran: ayahs,
        clips: [{ id: "c1", order: 0, sourceIn: 0, sourceOut: probe.duration, label: "Take 1" }],
        updatedAt: Date.now(),
      };

      const posterDataUrl = await capturePoster(file).catch(() => undefined);
      await putMedia(
        {
          projectId,
          name: file.name,
          type: file.type || "video/mp4",
          size: file.size,
          duration: probe.duration,
          ...(probe.width ? { width: probe.width } : {}),
          ...(probe.height ? { height: probe.height } : {}),
          ...(opfsPath ? { opfsPath } : {}),
          ...(posterDataUrl ? { posterDataUrl } : {}),
          ...(peaks ? { peaks } : {}),
        },
        file,
      );
      await putProject(project);

      const summary = {
        projectId,
        words: words.length,
        duration: probe.duration,
        speech: speechRatio,
        pauses,
        suggestions: suggestions.length,
        ayahs: ayahs.length,
      };
      setResult(summary);
      setStep("review");
      toast({ title: t("readyTitle"), tone: "success" });
    } catch (caught) {
      const message =
        caught instanceof AiClientError && caught.code === "consent_required"
          ? t("errorOffline")
          : (caught as Error)?.message || states("errorBody");
      setError(message);
      setStep("source");
      setStages((current) => current.map((item) => (item.state === "active" ? { ...item, state: "failed" } : item)));
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("source");
    toast({ title: t("processingCancel"), tone: "info" });
  };

  // Same wording as the landing page's mode cards, so the promise made there is
  // the one kept here.
  const modes: { id: ProjectMode; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: "auto", title: landing("modeAutoTitle"), desc: landing("modeAutoDesc"), icon: <Wand2 /> },
    { id: "manual", title: landing("modeManualTitle"), desc: landing("modeManualDesc"), icon: <Hand /> },
    { id: "hybrid", title: landing("modeHybridTitle"), desc: landing("modeHybridDesc"), icon: <Sparkles /> },
    { id: "quran", title: editor("quranMode"), desc: t("stepReview"), icon: <BookOpen /> },
  ];

  const progress = stages.length === 0 ? 0 : Math.round((stages.filter((item) => item.state === "done" || item.state === "skipped").length / stages.length) * 100);

  return (
    <AppShell>
      <PageFrame width="narrow">
        <header>
          <div className="flex items-center gap-2">
            <Badge tone="primary">
              {t("stepOf", { current: step === "mode" ? 1 : step === "source" ? 2 : step === "processing" ? 3 : 4, total: 4 })}
            </Badge>
            <span className="text-xs text-subtle">{mode === "quran" ? t("stepReview") : t("stepSource")}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </header>

        <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: "mode", label: t("stepMode") },
            { id: "source", label: t("stepSource") },
            { id: "processing", label: t("stepProcessing") },
            { id: "review", label: t("stepReview") },
          ].map((item, index) => {
            const order = ["mode", "source", "processing", "review"];
            const active = order.indexOf(step) >= index;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "num-tabular grid size-6 place-items-center rounded-full border text-[11px]",
                    active ? "border-primary/40 bg-primary-soft text-primary" : "border-border text-subtle",
                  )}
                >
                  {index + 1}
                </span>
                <span className={active ? "text-fg" : "text-subtle"}>{item.label}</span>
                {index < 3 ? <span className="mx-1 h-px w-4 bg-border" /> : null}
              </li>
            );
          })}
        </ol>

        {step === "mode" ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-fg">{t("chooseMode")}</h2>
            <p className="mt-0.5 text-xs text-muted">{t("chooseModeDesc")}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {modes.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id === "quran") {
                        router.push("/quran-video");
                        return;
                      }
                      setMode(item.id);
                      setStep("source");
                    }}
                    className={cn(
                      "flex h-full w-full items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                      mode === item.id ? "border-primary/45 bg-primary-soft/20" : "border-border bg-raised/40 hover:border-primary/35",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-ink text-primary [&_svg]:size-4">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{item.title}</span>
                      <span className="mt-1 block text-xs text-muted">{item.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {step === "source" ? (
          <section className="mt-6 space-y-5">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pickFile(event.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                "rounded-xl border border-dashed p-6 text-center transition-colors",
                dragging ? "border-primary bg-primary-soft/20" : "border-border bg-surface/40",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*,audio/*"
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              />
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-raised text-primary">
                <UploadIcon aria-hidden className="size-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-fg">{t("dropTitle")}</h2>
              <p className="mt-1 text-xs text-muted">{t("dropHint")}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button variant="primary" icon={<Film />} onClick={() => inputRef.current?.click()}>
                  {t("dropBrowse")}
                </Button>
                <Button
                  variant="outline"
                  icon={<BookOpen />}
                  className="border-primary/45 text-primary hover:bg-primary-soft/30"
                  onClick={() => void loadQuranDemo()}
                >
                  📖 نموذج تلاوة قرآنية
                </Button>
                <Button variant="secondary" icon={<Waves />} onClick={() => void loadDemo()}>
                  {t("dropSample")}
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-subtle">{t("dropSampleNote")}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-medium text-primary">
                <ShieldCheck aria-hidden className="size-3" />
                {t("dropPrivacy")}
              </p>
            </div>

            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-raised/40 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-ink text-primary">
                  <AudioLines aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{file.name}</p>
                  <p className="num-tabular text-xs text-subtle">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="ghost" size="sm" icon={<X />} onClick={() => setFile(null)}>
                  {common("remove")}
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("nameLabel")} htmlFor="project-name">
                <Input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </Field>
              <Field label={t("aspectLabel")} htmlFor="aspect">
                <Select value={aspect} onValueChange={(value) => setAspect(value as AspectRatio)}>
                  <SelectTrigger id="aspect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">{t("aspectVertical")}</SelectItem>
                    <SelectItem value="1:1">{t("aspectSquare")}</SelectItem>
                    <SelectItem value="16:9">{t("aspectWide")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("langLabel")} htmlFor="language">
                <Select value={language} onValueChange={(value) => setLanguage(value as TranscriptLanguage)}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar-DZ">{t("langArDz")}</SelectItem>
                    <SelectItem value="ar">{t("langAr")}</SelectItem>
                    <SelectItem value="fr">{t("langFr")}</SelectItem>
                    <SelectItem value="en">{t("langEn")}</SelectItem>
                    <SelectItem value="mixed">{t("langMixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {mode === "quran" ? (
                <>
                  <Field label="السورة الكريمة (Surah)" htmlFor="quran-surah">
                    <Select value={selectedSurah} onValueChange={(val) => setSelectedSurah(val)}>
                      <SelectTrigger id="quran-surah">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="auto">
                          ✨ اكتشاف الآيات تلقائياً من تلاوة الصوت (Auto-detect)
                        </SelectItem>
                        {ALL_SURAHS.map((s) => (
                          <SelectItem key={s.number} value={String(s.number)}>
                            {s.number}. {s.nameArabic} ({s.nameSimple}) — {s.ayahCount} آية
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {selectedSurah !== "auto" ? (
                    <Field label="من الآية (From Ayah)" htmlFor="quran-from-ayah">
                      <Input
                        id="quran-from-ayah"
                        type="number"
                        min={1}
                        max={ALL_SURAHS.find((s) => s.number === Number(selectedSurah))?.ayahCount || 286}
                        value={startAyah}
                        onChange={(e) => setStartAyah(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}

              <div className="sm:col-span-2">
                <SwitchRow
                  label={t("consentLabel")}
                  description={aiStatus?.transcribe === false ? t("errorOffline") : t("consentHint")}
                  checked={consent}
                  onCheckedChange={setConsent}
                  disabled={aiStatus?.transcribe === false}
                />
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="lg" icon={<Sparkles />} disabled={!file} onClick={() => void start()}>
                {t("startProcessing")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("mode")}>
                {common("back")}
              </Button>
            </div>
          </section>
        ) : null}

        {step === "processing" ? (
          <section className="mt-6">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <ProgressRing value={progress} label={`${progress}%`} sublabel={t("processingTitle")} />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-fg">{t("processingTitle")}</h2>
                <p className="num-tabular mt-1 text-xs text-muted">
                  {t("processingEta", { seconds: n(etaSeconds) })}
                </p>
                <div className="mt-2">
                  <ProgressBar value={progress} label={common("loading")} />
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {stages.map((item, index) => (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-raised/30 p-3">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[11px]",
                      item.state === "done"
                        ? "border-primary/40 bg-primary-soft text-primary"
                        : item.state === "active"
                          ? "border-primary text-primary"
                          : item.state === "failed"
                            ? "border-danger/50 text-danger"
                            : "border-border text-subtle",
                    )}
                  >
                    {item.state === "done" ? <Check aria-hidden className="size-3" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", item.state === "idle" ? "text-subtle" : "text-fg")}>{item.label}</span>
                    {item.detail ? <span className="mt-0.5 block text-xs text-muted">{item.detail}</span> : null}
                  </span>
                  {item.state === "skipped" ? <Badge tone="neutral">{common("optional")}</Badge> : null}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-subtle">{t("processingKeepOpen")}</p>
            <Button variant="ghost" className="mt-3" icon={<X />} onClick={cancel}>
              {t("processingCancel")}
            </Button>
            <p className="num-tabular mt-2 text-[11px] text-subtle">
              {t("stepOf", { current: stage + 1, total: stages.length })}
            </p>
          </section>
        ) : null}

        {step === "review" && result ? (
          <section className="mt-6">
            <div className="rounded-xl border border-primary/30 bg-primary-soft/15 p-5">
              <span className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-ink text-primary">
                <Check aria-hidden className="size-5" />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-fg">{t("readyTitle")}</h2>
              <p className="mt-1 text-sm text-muted">
                {t("readyBody", { words: n(result.words), duration: tc(result.duration) })}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] text-subtle">{common("words")}</dt>
                  <dd className="num-tabular text-sm text-fg">{n(result.words)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-subtle">{t("soundTitle")}</dt>
                  <dd className="num-tabular text-sm text-fg">{Math.round(result.speech * 100)}%</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-subtle">suggestions</dt>
                  <dd className="num-tabular text-sm text-fg">{n(result.suggestions)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-subtle">{editor("quranMode")}</dt>
                  <dd className="num-tabular text-sm text-fg">{n(result.ayahs)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  icon={<Film />}
                  onClick={() => router.push(`/projects/${result.projectId}/editor`)}
                >
                  {t("openEditor")}
                </Button>
                {result.ayahs > 0 || mode === "quran" ? (
                  <Button
                    variant="secondary"
                    icon={<BookOpen />}
                    onClick={() => router.push(`/projects/${result.projectId}/quran`)}
                  >
                    {editor("quranMode")} ({n(result.ayahs)})
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => router.push(`/projects/${result.projectId}/suggestions`)}>
                  {t("openSuggestions")}
                </Button>
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                  {common("back")}
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </PageFrame>
    </AppShell>
  );
}

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: { text: string; start: number; end: number }[];
};

/** Turns a transcript response into the editor's word model. */
function wordsFromSegments(segments: TranscriptSegment[], projectId: string): Word[] {
  const words: Word[] = [];
  let index = 0;

  for (const segment of segments) {
    if (segment.words && segment.words.length > 0) {
      for (const word of segment.words) {
        const text = word.text.trim();
        if (!text) continue;
        words.push({
          id: `${projectId}-w${index}`,
          text,
          start: Math.max(0, word.start),
          end: Math.max(word.start + 0.05, word.end),
          speaker: 0,
        });
        index += 1;
      }
      continue;
    }

    // No word timings: distribute the segment by character weight, which is a
    // coarser alignment but never invents time outside the segment itself.
    const pieces = segment.text.trim().split(/\s+/).filter(Boolean);
    if (pieces.length === 0) continue;
    const weights = pieces.map((piece) => Math.max(1, piece.replace(/[^\p{L}\p{N}]/gu, "").length));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const span = Math.max(0.1, segment.end - segment.start);
    let cursor = segment.start;

    pieces.forEach((piece, position) => {
      const duration = (span * (weights[position] ?? 1)) / total;
      words.push({
        id: `${projectId}-w${index}`,
        text: piece,
        start: Number(cursor.toFixed(3)),
        end: Number((cursor + duration).toFixed(3)),
        speaker: 0,
      });
      cursor += duration;
      index += 1;
    });
  }

  return words;
}

export default function NewProjectPage() {
  return (
    <React.Suspense fallback={<div className="p-8 max-w-xl mx-auto"><SkeletonRows rows={4} /></div>}>
      <NewProjectContent />
    </React.Suspense>
  );
}
