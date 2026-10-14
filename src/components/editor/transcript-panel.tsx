"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { Eye, EyeOff, Pin, PinOff, Replace, RotateCcw, Search, Scissors } from "lucide-react";
import { useFormat } from "@/components/providers/number-format";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useEditor, type EditorState } from "@/lib/editor-store";
import { outputToSource, sourceToOutput } from "@/lib/timeline";
import type { Word } from "@/lib/types";
import { cn } from "@/lib/cn";
import { VirtualList } from "./virtual-list";

const BLOCK_SIZE = 12;

type Block = { id: string; words: Word[] };

export function TranscriptPanel({ className }: { className?: string }) {
  const t = useTranslations("editor");
  const a11y = useTranslations("a11y");
  const { tc } = useFormat();
  const { toast } = useToast();

  const { project, activeWordId, selectedWordIds, playhead } = useEditor(
    useShallow((state: EditorState) => ({
      project: state.project,
      activeWordId: state.activeWordId,
      selectedWordIds: state.selectedWordIds,
      playhead: state.playhead,
    })),
  );

  const cutWords = useEditor((state) => state.cutWords);
  const restoreWords = useEditor((state) => state.restoreWords);
  const editWord = useEditor((state) => state.editWord);
  const replaceAllWords = useEditor((state) => state.replaceAllWords);
  const toggleWordSelection = useEditor((state) => state.toggleWordSelection);
  const selectWords = useEditor((state) => state.selectWords);
  const setActiveWord = useEditor((state) => state.setActiveWord);
  const setPlayhead = useEditor((state) => state.setPlayhead);

  const [query, setQuery] = React.useState("");
  const [hideDeleted, setHideDeleted] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  /** Pro-studio transcript: the list follows playback until the user scrolls it. */
  const [followPlayback, setFollowPlayback] = React.useState(true);
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [replaceFrom, setReplaceFrom] = React.useState("");
  const [replaceTo, setReplaceTo] = React.useState("");

  const words = project.words;
  const deletedCount = words.filter((word) => word.deleted).length;

  const visible = React.useMemo(() => {
    const needle = query.trim();
    const filtered = hideDeleted ? words.filter((word) => !word.deleted) : words;
    if (!needle) return filtered;
    return filtered.filter((word) => word.text.includes(needle));
  }, [words, query, hideDeleted]);

  const blocks = React.useMemo<Block[]>(() => {
    const result: Block[] = [];
    for (let index = 0; index < visible.length; index += BLOCK_SIZE) {
      const slice = visible.slice(index, index + BLOCK_SIZE);
      result.push({ id: slice[0]?.id ?? `b${index}`, words: slice });
    }
    return result;
  }, [visible]);

  const seekToWord = React.useCallback(
    (word: Word) => {
      const output = sourceToOutput(word.start, project.clips);
      if (output !== null) setPlayhead(output);
      setActiveWord(word.id);
    },
    [project.clips, setPlayhead, setActiveWord],
  );

  // Which block the spoken word lives in — derived, so nothing has to be
  // synchronised through an effect while playback is running. When follow
  // mode is off, the list stays where the reader put it.
  const scrollTarget = React.useMemo(() => {
    if (!activeWordId || !followPlayback) return null;
    const index = visible.findIndex((word) => word.id === activeWordId);
    return index >= 0 ? Math.floor(index / BLOCK_SIZE) : null;
  }, [activeWordId, visible, followPlayback]);

  const activeSource = outputToSource(playhead, project.clips);

  const handleCut = (word: Word) => {
    if (word.deleted) {
      restoreWords([word.id]);
      toast({ title: a11y("wordRestored", { word: word.text }), tone: "success" });
      return;
    }
    cutWords([word.id]);
    const label = word.end - word.start;
    toast({ title: t("wordDeleted", { time: `${label.toFixed(2)}s` }), tone: "info" });
  };

  const cutSelection = () => {
    if (selectedWordIds.length === 0) return;
    cutWords(selectedWordIds);
    toast({ title: t("rangeSelected", { count: selectedWordIds.length }), tone: "success" });
  };

  const commitEdit = (word: Word) => {
    if (draft.trim() && draft !== word.text) editWord(word.id, draft);
    setEditingId(null);
  };

  const commitReplace = () => {
    const count = replaceAllWords(replaceFrom, replaceTo);
    if (count > 0) {
      toast({ title: t("replacedCount", { count: count }), tone: "success" });
      setReplaceFrom("");
      setReplaceTo("");
      setReplaceOpen(false);
    } else {
      toast({ title: t("replaceNone"), tone: "info" });
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 space-y-2 border-b border-hairline p-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchTranscript")}
            aria-label={t("searchTranscript")}
            className="ps-9"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="num-tabular truncate text-xs text-subtle">
            {t("clipCount", { count: project.clips.length })} · {words.length} {t("tabWords").toLowerCase()}
            {deletedCount > 0 ? ` · ${deletedCount} ${t("deletedWord")}` : ""}
          </p>
          <div className="flex items-center gap-1">
            <IconButton
              label={replaceOpen ? t("replaceClose") : t("replaceOpen")}
              tooltip={replaceOpen ? t("replaceClose") : t("replaceOpen")}
              size="sm"
              selected={replaceOpen}
              onClick={() => setReplaceOpen((value) => !value)}
            >
              <Replace />
            </IconButton>
            <IconButton
              label={followPlayback ? t("followOn") : t("followOff")}
              tooltip={followPlayback ? t("followOn") : t("followOff")}
              size="sm"
              selected={followPlayback}
              onClick={() => setFollowPlayback((value) => !value)}
            >
              {followPlayback ? <Pin /> : <PinOff />}
            </IconButton>
            <IconButton
              label={hideDeleted ? t("showDeleted") : t("hideDeleted")}
              tooltip={hideDeleted ? t("showDeleted") : t("hideDeleted")}
              size="sm"
              selected={hideDeleted}
              onClick={() => setHideDeleted((value) => !value)}
            >
              {hideDeleted ? <EyeOff /> : <Eye />}
            </IconButton>
          </div>
        </div>
        {replaceOpen ? (
          <div className="flex items-end gap-2">
            <Input
              value={replaceFrom}
              onChange={(event) => setReplaceFrom(event.target.value)}
              placeholder={t("replaceFromPlaceholder")}
              aria-label={t("replaceFromPlaceholder")}
              className="min-w-0 flex-1"
            />
            <Input
              value={replaceTo}
              onChange={(event) => setReplaceTo(event.target.value)}
              placeholder={t("replaceToPlaceholder")}
              aria-label={t("replaceToPlaceholder")}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={!replaceFrom.trim() || replaceFrom.trim() === replaceTo.trim()}
              onClick={commitReplace}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary-soft px-3 text-xs font-medium text-primary disabled:opacity-40"
            >
              {t("replaceAll")}
            </button>
          </div>
        ) : null}
        {selectedWordIds.length > 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-primary/35 bg-primary-soft/50 p-2">
            <span className="num-tabular flex-1 text-xs font-medium text-primary">
              {t("rangeSelected", { count: selectedWordIds.length })}
            </span>
            <button
              type="button"
              onClick={cutSelection}
              className="inline-flex items-center gap-1 rounded-sm bg-danger-soft px-2 py-1 text-xs font-medium text-danger"
            >
              <Scissors aria-hidden className="size-3" />
              {t("deleteRange")}
            </button>
            <button
              type="button"
              onClick={() => selectWords([])}
              className="rounded-sm px-2 py-1 text-xs text-muted hover:text-fg"
            >
              {t("clearSelection")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1" role="list" aria-label={a11y("wordListLabel", { count: words.length })}>
        {blocks.length === 0 ? (
          query ? (
            <p className="p-6 text-center text-sm text-muted">{t("noMatches")}</p>
          ) : (
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <p className="pt-2 text-xs text-subtle">{t("emptyTranscript")}</p>
            </div>
          )
        ) : (
          <VirtualList
            items={blocks}
            estimateHeight={92}
            scrollToIndex={scrollTarget}
            getKey={(block) => block.id}
            className="h-full px-3 py-2"
            renderItem={(block) => (
              <p
                className="min-h-11 pb-3 text-[13px] leading-[2] text-muted"
                onKeyDown={(event) => {
                  if (event.key === "Escape") selectWords([]);
                }}
              >
                {block.words.map((word) => {
                  const selected = selectedWordIds.includes(word.id);
                  const isActive = word.id === activeWordId;
                  const isEditing = editingId === word.id;
                  const inRange = activeSource !== null && activeSource >= word.start && activeSource <= word.end;

                  if (isEditing) {
                    return (
                      <input
                        key={word.id}
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => commitEdit(word)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitEdit(word);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        aria-label={`${t("edit")} ${word.text}`}
                        className="mx-0.5 inline-block w-32 rounded-sm border border-primary/50 bg-ink px-1 py-0.5 text-[13px] text-fg outline-none"
                      />
                    );
                  }

                  return (
                    <span key={word.id} className="inline-flex items-center">
                      <button
                        type="button"
                        role="listitem"
                        aria-current={isActive ? "true" : undefined}
                        aria-label={`${tc(word.start)} ${word.text}${word.deleted ? ` (${t("deletedWord")})` : ""}`}
                        onClick={(event) => {
                          if (event.shiftKey) toggleWordSelection(word.id);
                          else if (selectedWordIds.length > 0) toggleWordSelection(word.id);
                          else seekToWord(word);
                        }}
                        onDoubleClick={() => {
                          setEditingId(word.id);
                          setDraft(word.text);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            seekToWord(word);
                          }
                          if (event.key === "Backspace" || event.key === "Delete") {
                            event.preventDefault();
                            handleCut(word);
                          }
                          if (event.key === "e") {
                            event.preventDefault();
                            setEditingId(word.id);
                            setDraft(word.text);
                          }
                        }}
                        className={cn(
                          "rounded-sm px-1 py-0.5 transition-colors duration-150 touch:py-2",
                          word.deleted && "text-danger/60 line-through decoration-danger/50",
                          !word.deleted && inRange && "bg-primary/20 text-fg",
                          isActive && "bg-primary-soft text-primary",
                          selected && "bg-primary/25 text-fg ring-1 ring-primary/50",
                          !isActive && !selected && !word.deleted && "hover:bg-raised hover:text-fg",
                        )}
                      >
                        {word.text}
                      </button>
                      <span aria-hidden className="text-subtle/50">
                        {" "}
                      </span>
                    </span>
                  );
                })}
              </p>
            )}
          />
        )}
      </div>

      {deletedCount > 0 ? (
        <div className="shrink-0 border-t border-hairline p-2">
          <button
            type="button"
            onClick={() => {
              restoreWords(words.filter((word) => word.deleted).map((word) => word.id));
              toast({ title: a11y("wordRestored", { word: `${deletedCount}` }), tone: "success" });
            }}
            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg touch:min-h-11"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            {t("restoreWord")} · {deletedCount}
          </button>
        </div>
      ) : null}
    </div>
  );
}
