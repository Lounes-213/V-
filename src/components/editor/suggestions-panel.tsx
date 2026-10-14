"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { Check, Pencil, Sparkles, Wand2, X } from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { Badge, ScoreBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/overlays";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { analyzeTranscript, AiClientError } from "@/lib/ai/client";
import { suggestClips } from "@/lib/suggest";
import { cn } from "@/lib/cn";

/** What the last ranking run was actually served by — shown, never implied. */
type RankMeta = { model: string; cached: boolean; latencyMs: number; promptVersion: number };

/**
 * Suggestion cards carry the two scores that actually change a publishing
 * decision — hook strength and clarity — plus the reasoning, so the user can
 * disagree with the model instead of trusting it blindly.
 */
export function SuggestionsPanel({ className }: { className?: string }) {
  const t = useTranslations("suggestions");
  const a11y = useTranslations("a11y");
  const { tc } = useFormat();

  const { project, busy } = useEditor(
    useShallow((state: EditorState) => ({ project: state.project, busy: state.aiBusy.suggest === true })),
  );

  const applySuggestion = useEditor((state) => state.applySuggestion);
  const acceptSuggestion = useEditor((state) => state.acceptSuggestion);
  const dismissSuggestion = useEditor((state) => state.dismissSuggestion);
  const replaceSuggestions = useEditor((state) => state.replaceSuggestions);
  const setPlayhead = useEditor((state) => state.setPlayhead);
  const setBusy = useEditor((state) => state.setBusy);
  const setLeftTab = useEditor((state) => state.setLeftTab);

  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [rank, setRank] = React.useState<RankMeta | null>(null);
  const [note, setNote] = React.useState<"unavailable" | "offline" | null>(null);
  const suggestions = project.suggestions.filter((item) => item.status !== "dismissed");

  /**
   * Candidates are always measured locally first; the AI route, when the server
   * has a key, only judges and re-orders them. If it is not available the list
   * the user sees is still derived from their own audio, and we say so.
   */
  const regenerate = async () => {
    setBusy("suggest", true);
    setNote(null);

    const controller = new AbortController();
    try {
      const response = await analyzeTranscript({
        words: project.words,
        language: project.language,
        count: 5,
        refresh: true,
        signal: controller.signal,
      });
      replaceSuggestions(response.suggestions);
      setRank({
        model: response.meta.model,
        cached: response.meta.cached,
        latencyMs: response.meta.latencyMs,
        promptVersion: response.meta.promptVersion,
      });
    } catch (caught) {
      const error = caught instanceof AiClientError ? caught : undefined;
      setNote(error?.code === "no_key" ? "unavailable" : "offline");
      replaceSuggestions(suggestClips(project.words));
      setRank(null);
    } finally {
      setBusy("suggest", false);
    }
  };

  const preview = (id: string, start: number) => {
    setPreviewId(id);
    setPlayhead(start);
  };

  if (busy) {
    return (
      <div className={cn("flex-1 p-3", className)}>
        <SkeletonRows rows={4} />
        <p className="mt-3 text-xs text-subtle">{t("resuggesting")}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={cn("flex-1 p-3", className)}>
        <EmptyState
          icon={<Sparkles />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button variant="primary" size="sm" icon={<Wand2 />} onClick={() => void regenerate()}>
              {t("generate")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-hairline p-3">
        <div className="min-w-0">
          <p className="num-tabular text-xs text-subtle">
            {t("countLabel", { count: suggestions.length })}
          </p>
          {rank ? (
            <p className="num-tabular mt-0.5 truncate text-[10px] text-subtle/80">
              {rank.model} · v{rank.promptVersion} · {rank.cached ? t("cached") : `${rank.latencyMs}ms`}
            </p>
          ) : note ? (
            <p className="mt-0.5 text-[10px] text-muted">
              {note === "unavailable" ? t("aiUnavailable") : t("offlineMeasured")}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="xs" icon={<Wand2 />} onClick={() => void regenerate()}>
          {t("regenerate")}
        </Button>
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {suggestions.map((suggestion) => {
          const badge =
            suggestion.hookScore >= 85
              ? { tone: "primary" as const, label: t("badgeTopPick") }
              : suggestion.hookScore >= 78
                ? { tone: "info" as const, label: t("badgeStrongHook") }
                : { tone: "warn" as const, label: t("badgeNeedsWork") };

          return (
            <li
              key={suggestion.id}
              onPointerEnter={() => preview(suggestion.id, suggestion.start)}
              onPointerLeave={() => setPreviewId(null)}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                previewId === suggestion.id
                  ? "border-primary/45 bg-primary-soft/25"
                  : "border-border bg-raised/40",
              )}
            >
              <div className="flex items-start gap-3">
                <ScoreBadge
                  value={suggestion.hookScore}
                  label={a11y("scoreLabel", { name: t("scoreVirality"), value: suggestion.hookScore })}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <Badge tone="neutral">
                      <span className="num-tabular font-mono">
                        {tc(suggestion.end - suggestion.start)}
                      </span>
                    </Badge>
                  </div>
                  <h3
                    dir="auto"
                    className="mt-2 text-sm leading-relaxed font-semibold text-fg"
                  >
                    {suggestion.title}
                  </h3>
                  <p dir="auto" className="mt-1 text-xs text-muted">
                    {suggestion.reason}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Tooltip content={t("scoreViralityHint")}>
                  <span className="flex items-center justify-between rounded-sm border border-border px-2 py-1">
                    <span className="text-[10px] text-subtle">{t("scoreVirality")}</span>
                    <span className="num-tabular font-mono text-[11px] text-fg">{suggestion.hookScore}</span>
                  </span>
                </Tooltip>
                <Tooltip content={t("scoreClarityHint")}>
                  <span className="flex items-center justify-between rounded-sm border border-border px-2 py-1">
                    <span className="text-[10px] text-subtle">{t("scoreClarity")}</span>
                    <span className="num-tabular font-mono text-[11px] text-fg">
                      {suggestion.clarityScore}
                    </span>
                  </span>
                </Tooltip>
              </div>

              <p
                dir="auto"
                className="mt-2 rounded-sm border border-hairline bg-ink/50 p-2 text-xs leading-relaxed text-muted"
              >
                {suggestion.draftScript}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Button
                  size="xs"
                  variant="primary"
                  icon={<Check />}
                  onClick={() => {
                    applySuggestion(suggestion.id);
                    setLeftTab("transcript");
                  }}
                >
                  {t("actionApply")}
                </Button>
                <Button
                  size="xs"
                  variant="secondary"
                  icon={<Pencil />}
                  onClick={() => acceptSuggestion(suggestion.id)}
                >
                  {t("actionEdit")}
                </Button>
                <Button size="xs" variant="ghost" icon={<Wand2 />} onClick={regenerate}>
                  {t("actionResuggest")}
                </Button>
                <Button
                  size="xs"
                  variant="danger-ghost"
                  icon={<X />}
                  aria-label={t("actionResuggest")}
                  onClick={() => dismissSuggestion(suggestion.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
