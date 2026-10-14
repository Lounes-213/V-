"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Film,
  Pencil,
  Sparkles,
  Timer,
  TrendingUp,
  Wand2,
  X,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AppShell, PageFrame } from "@/components/site/app-shell";
import { Badge, ScoreBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/components/providers/number-format";
import { getProject, putProject } from "@/lib/db";
import { suggestClips } from "@/lib/suggest";
import { analyzeTranscript, AiClientError } from "@/lib/ai/client";
import type { Project, Suggestion } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Reasons are machine-readable factors; this maps them to the UI's language. */
const FACTOR_KEYS: Record<string, string> = {
  opensWithQuestion: "suggestions.factorQuestion",
  opensWithHook: "suggestions.factorHook",
  completeThought: "suggestions.factorComplete",
  unfinishedEnding: "suggestions.factorUnfinished",
  tightLength: "suggestions.factorTight",
  longForShortForm: "suggestions.factorLong",
  calmPace: "suggestions.factorCalm",
  fastPace: "suggestions.factorFast",
  noDeadAir: "suggestions.factorNoDeadAir",
  containsDeadAir: "suggestions.factorDeadAir",
};

export default function SuggestionsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const t = useTranslations("suggestions");
  const common = useTranslations("common");
  const states = useTranslations("states");
  const editor = useTranslations("editor");
  const { tc, n } = useFormat();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = React.useState<Project | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing" | "error">("loading");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [rank, setRank] = React.useState<{ model: string; promptVersion: number; cached: boolean; latencyMs: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await getProject(projectId);
        if (cancelled) return;
        if (!stored) {
          setStatus("missing");
          return;
        }
        let initialSuggestions = stored.suggestions;
        if (initialSuggestions.length === 0) {
          if (stored.quran && stored.quran.length > 0) {
            // Auto-generate suggestions directly from detected Quran ayahs
            initialSuggestions = stored.quran.map((match) => ({
              id: `sug-q-${match.surah}-${match.ayah}`,
              title: `سورة ${match.surahName} · الآية ${match.ayah}`,
              start: match.start,
              end: match.end,
              hookScore: Math.min(0.98, Math.max(0.85, match.confidence)),
              clarityScore: 0.98,
              reason: `سورة ${match.surahName} · الآية ${match.ayah} (نص قرآني مبارك)`,
              draftScript: match.uthmani,
              status: "new" as const,
              wordIds: stored.words.filter((w) => w.ayahRef === `${match.surah}:${match.ayah}`).map((w) => w.id),
              factors: ["completeThought", "calmPace", "noDeadAir"],
            }));
          } else {
            initialSuggestions = suggestClips(stored.words);
          }
        }

        const withSuggestions =
          stored.suggestions.length > 0 ? stored : { ...stored, suggestions: initialSuggestions };
        if (withSuggestions !== stored) await putProject(withSuggestions);
        setProject(withSuggestions);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const save = async (next: Project) => {
    setProject(next);
    await putProject({ ...next, updatedAt: Date.now() });
  };

  const regenerate = async () => {
    if (!project) return;
    setBusy(true);
    setNote(null);

    // If Quran mode, regenerate directly from Ayahs
    if (project.quran && project.quran.length > 0) {
      const quranSuggestions: Suggestion[] = project.quran.map((match) => ({
        id: `sug-q-${match.surah}-${match.ayah}`,
        title: `سورة ${match.surahName} · الآية ${match.ayah}`,
        start: match.start,
        end: match.end,
        hookScore: Math.min(0.98, Math.max(0.85, match.confidence)),
        clarityScore: 0.98,
        reason: `سورة ${match.surahName} · الآية ${match.ayah} (نص قرآني مبارك)`,
        draftScript: match.uthmani,
        status: "new",
        wordIds: project.words.filter((w) => w.ayahRef === `${match.surah}:${match.ayah}`).map((w) => w.id),
        factors: ["completeThought", "calmPace", "noDeadAir"],
      }));
      await save({ ...project, suggestions: quranSuggestions });
      setBusy(false);
      toast({ title: "تم تحديث اقتراحات الآيات بنجاح", tone: "success" });
      return;
    }

    try {
      const response = await analyzeTranscript({
        words: project.words,
        language: project.language,
        count: 5,
        refresh: true,
      });
      await save({ ...project, suggestions: response.suggestions });
      setRank({
        model: response.meta.model,
        promptVersion: response.meta.promptVersion,
        cached: response.meta.cached,
        latencyMs: response.meta.latencyMs,
      });
    } catch (caught) {
      const error = caught instanceof AiClientError ? caught : undefined;
      await save({ ...project, suggestions: suggestClips(project.words) });
      setRank(null);
      setNote(error?.code === "no_key" ? t("aiUnavailable") : t("offlineMeasured"));
    } finally {
      setBusy(false);
    }
  };

  /** Accepting a suggestion turns it into the cut the editor renders. */
  const accept = async (suggestion: Suggestion) => {
    if (!project) return;
    const accepted = project.words.filter((word) => suggestion.wordIds.includes(word.id));
    const first = accepted[0];
    const last = accepted[accepted.length - 1];
    if (!first || !last) return;

    const next: Project = {
      ...project,
      clips: [{ id: `c-${Date.now().toString(36)}`, order: 0, sourceIn: first.start, sourceOut: last.end, label: suggestion.title.slice(0, 24) }],
      suggestions: project.suggestions.map((item) =>
        item.id === suggestion.id ? { ...item, status: "accepted" } : item,
      ),
      status: "review",
    };
    await save(next);
    toast({ title: t("applied"), description: suggestion.title, tone: "success" });
  };

  const dismiss = async (suggestion: Suggestion) =>
    save({
      ...project!,
      suggestions: project!.suggestions.map((item) => (item.id === suggestion.id ? { ...item, status: "dismissed" } : item)),
    });

  const visible = (project?.suggestions ?? []).filter((item) => item.status !== "dismissed");

  return (
    <AppShell>
      <PageFrame>
        <Link
          href={`/projects/${projectId}/editor`}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg [&_svg]:size-3.5"
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {common("back")}
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Film />} onClick={() => router.push(`/projects/${projectId}/editor`)}>
              {t("openInEditor")}
            </Button>
            <Button variant="primary" size="sm" icon={<Wand2 />} disabled={busy || !project} onClick={() => void regenerate()}>
              {busy ? common("loading") : t("refresh")}
            </Button>
          </div>
        </header>

        {rank ? (
          <p className="num-tabular mt-3 font-mono text-[11px] text-subtle">
            {rank.model} · v{rank.promptVersion} · {rank.cached ? t("cached") : `${rank.latencyMs}ms`}
          </p>
        ) : note ? (
          <p className="mt-3 text-[11px] text-muted">{note}</p>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-surface/50 p-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-gold" />
            <p className="text-xs text-muted">{t("staleNotice")}</p>
          </div>
        )}

        {status === "loading" ? (
          <div className="mt-6">
            <SkeletonRows rows={4} />
          </div>
        ) : status === "missing" ? (
          <div className="mt-6">
            <EmptyState
              icon={<AlertTriangle />}
              title={states("notFoundTitle")}
              description={states("notFoundBody")}
              action={
                <Button asChild variant="primary">
                  <Link href="/dashboard">{states("notFoundCta")}</Link>
                </Button>
              }
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Sparkles />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                <Button variant="primary" icon={<Wand2 />} disabled={busy} onClick={() => void regenerate()}>
                  {busy ? common("loading") : t("refresh")}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 lg:grid-cols-2">
            {visible.map((suggestion) => (
              <li key={suggestion.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ScoreBadge value={suggestion.hookScore} label={t("sortByScore")} />
                      <div>
                        <h2 className="text-sm font-medium text-fg">{suggestion.title}</h2>
                        <p className="num-tabular mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
                          <Timer aria-hidden className="size-3" />
                          {tc(suggestion.start)} → {tc(suggestion.end)}
                          <span>·</span>
                          {tc(suggestion.end - suggestion.start)}
                        </p>
                      </div>
                    </div>
                    <Badge tone={suggestion.hookScore >= 85 ? "primary" : suggestion.hookScore >= 78 ? "info" : "warn"}>
                      {suggestion.hookScore >= 85 ? t("badgeTopPick") : suggestion.hookScore >= 78 ? t("badgeStrongHook") : t("badgeNeedsReview")}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-ink/40 p-2">
                      <p className="text-[10px] text-subtle">{t("whyThis")}</p>
                      <p className="num-tabular flex items-center gap-1 text-sm text-fg">
                        <TrendingUp aria-hidden className="size-3 text-primary" />
                        {n(suggestion.hookScore)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-ink/40 p-2">
                      <p className="text-[10px] text-subtle">{t("sortByScore")}</p>
                      <p className="num-tabular text-sm text-fg">{n(suggestion.clarityScore)}</p>
                    </div>
                  </div>

                  {suggestion.factors && suggestion.factors.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {suggestion.factors.map((factor) => (
                        <li
                          key={factor}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px]",
                            factor === "unfinishedEnding" || factor === "containsDeadAir"
                              ? "border-gold/40 bg-gold/10 text-gold"
                              : "border-border bg-raised/50 text-muted",
                          )}
                        >
                          {FACTOR_KEYS[factor] ? t(FACTOR_KEYS[factor]!.replace("suggestions.", "")) : factor}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="mt-3 flex-1 text-xs text-muted">{suggestion.reason}</p>

                  <blockquote
                    dir="auto"
                    className="mt-3 border-s-2 border-primary/40 bg-ink/40 p-2 text-xs text-fg/90"
                  >
                    {suggestion.draftScript}
                  </blockquote>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="primary" size="sm" icon={<Check />} onClick={() => void accept(suggestion)}>
                      {t("actionAccept")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil />}
                      onClick={() => router.push(`/projects/${projectId}/editor?t=${Math.floor(suggestion.start)}`)}
                    >
                      {editor("edit")}
                    </Button>
                    <Button variant="ghost" size="sm" icon={<X />} onClick={() => void dismiss(suggestion)}>
                      {common("remove")}
                    </Button>
                    <span className="num-tabular ms-auto text-[10px] text-subtle">
                      {n(suggestion.wordIds.length)} {common("words")}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageFrame>
    </AppShell>
  );
}
