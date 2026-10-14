import "server-only";
import { suggestClips } from "../suggest";
import type { Suggestion, Word } from "../types";
import { generate } from "./gemini";
import { SUGGESTION_SCORE_GEMINI_SCHEMA, suggestionScoreResponseSchema } from "./schemas";
import { cacheKeyFor, createResponseCache } from "./quota";

/**
 * Ranking a transcript into clip candidates.
 *
 * The candidates themselves are *measured* from the transcript by
 * `suggestClips` — deterministic, reviewable, and available offline. The model's
 * job is only to judge them: which ones deserve to be cut, how strong the hook
 * is, and why. That split means an AI outage degrades the ranking, never the
 * timeline: the words, timings and durations always come from the audio.
 */

export type AnalyzeResult = {
  suggestions: Suggestion[];
  meta: {
    model: string;
    promptId: string;
    promptVersion: number;
    latencyMs: number;
    cached: boolean;
    usage: { inputTokens: number; outputTokens: number };
  };
};

export type AnalyzeOptions = {
  words: Word[];
  language?: string;
  count?: number;
  refresh?: boolean;
  signal?: AbortSignal;
};

const cache = createResponseCache<AnalyzeResult["suggestions"]>();

/** Compact, stable payload: no ids the model does not need, no media, no PII. */
export function buildCandidatePayload(suggestions: Suggestion[], words: Word[]) {
  return suggestions.map((suggestion) => {
    const window = words.filter((word) => suggestion.wordIds.includes(word.id));
    const first = window[0];
    const last = window[window.length - 1];
    return {
      id: suggestion.id,
      start: Number((first?.start ?? suggestion.start).toFixed(2)),
      end: Number((last?.end ?? suggestion.end).toFixed(2)),
      durationSec: Number(((last?.end ?? suggestion.end) - (first?.start ?? suggestion.start)).toFixed(1)),
      wordCount: window.length,
      measured: suggestion.factors ?? [],
      text: suggestion.draftScript,
    };
  });
}

function promptBody(language: string, candidates: ReturnType<typeof buildCandidatePayload>): string {
  return [
    `language: ${language}`,
    `candidateCount: ${candidates.length}`,
    "",
    "candidates:",
    JSON.stringify(candidates, null, 1),
  ].join("\n");
}

export async function analyzeClips(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const language = options.language ?? "ar-DZ";
  const candidates = suggestClips(options.words, { count: options.count ?? 5 });

  // Nothing worth cutting: answer locally, do not spend a request.
  if (candidates.length === 0) {
    return {
      suggestions: [],
      meta: {
        model: "local",
        promptId: "score-suggestions",
        promptVersion: 0,
        latencyMs: 0,
        cached: false,
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    };
  }

  const payload = buildCandidatePayload(candidates, options.words);
  const key = cacheKeyFor({ language, payload, v: 1 }, "score-suggestions");
  if (!options.refresh) {
    const hit = cache.get(key);
    if (hit) {
      return {
        suggestions: hit,
        meta: {
          model: "cache",
          promptId: "score-suggestions",
          promptVersion: 1,
          latencyMs: 0,
          cached: true,
          usage: { inputTokens: 0, outputTokens: 0 },
        },
      };
    }
  }

  const result = await generate({
    prompt: "score-suggestions",
    parts: [{ text: promptBody(language, payload) }],
    schema: SUGGESTION_SCORE_GEMINI_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.25,
    // Ranking is interactive: a model that has not answered in 30s is worse than
    // the measured list we already have, so we give up on it and try the next.
    timeoutMs: 30_000,
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const parsed = suggestionScoreResponseSchema.parse(result.value);
  const byId = new Map(parsed.results.map((score) => [score.id, score]));

  const ranked: Suggestion[] = candidates
    .map((suggestion) => {
      const score = byId.get(suggestion.id);
      if (!score) return suggestion;
      return {
        ...suggestion,
        title: score.title.trim() || suggestion.title,
        hookScore: score.hookScore,
        clarityScore: score.clarityScore,
        reason: score.reason.trim() || suggestion.reason,
        status: suggestion.status,
      };
    })
    .filter((suggestion) => byId.get(suggestion.id)?.keep !== false)
    .sort(
      (a, b) =>
        b.hookScore + b.clarityScore - (a.hookScore + a.clarityScore) || a.start - b.start,
    )
    // Re-number so ids stay stable for the UI's keys and links.
    .map((suggestion, index) => ({ ...suggestion, id: `sug-${index + 1}` }));

  cache.set(key, ranked);

  return {
    suggestions: ranked,
    meta: {
      model: result.model,
      promptId: result.promptId,
      promptVersion: result.promptVersion,
      latencyMs: result.latencyMs,
      cached: false,
      usage: result.usage,
    },
  };
}

export function analyzeCacheSize(): number {
  return cache.size();
}
