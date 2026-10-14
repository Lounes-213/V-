"use client";

import type { Suggestion, Word } from "../types";

/**
 * Browser-side access to the AI routes.
 *
 * Every call is typed at the edge: the response is parsed against the same zod
 * shape the server used, so a changed server contract shows up as a handled
 * error here instead of an undefined field deeper in the editor.
 */

export type AiStatus = {
  analyze: boolean;
  transcribe: boolean;
  analyzePerHour: number;
  maxUploadBytes: number;
};

export type AnalyzeResponse = {
  suggestions: Suggestion[];
  meta: {
    model: string;
    promptId: string;
    promptVersion: number;
    latencyMs: number;
    cached: boolean;
    usage: { inputTokens: number; outputTokens: number };
    requestId: string;
  };
  quota: { remaining: number; limit: number };
};

export class AiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

async function readError(response: Response): Promise<AiClientError> {
  let payload: { error?: string; message?: string; retryAfterSec?: number } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    /* Non-JSON error body: fall through to the status text. */
  }
  return new AiClientError(
    payload.message ?? response.statusText ?? "AI request failed",
    payload.error ?? "upstream",
    response.status,
    payload.retryAfterSec,
  );
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const [analyze, transcribe] = await Promise.all([
    fetch("/api/ai/analyze", { method: "GET" })
      .then((response) => (response.ok ? response.json() : undefined))
      .catch(() => undefined),
    fetch("/api/ai/transcribe", { method: "GET" })
      .then((response) => (response.ok ? response.json() : undefined))
      .catch(() => undefined),
  ]);

  return {
    analyze: Boolean(analyze?.configured),
    transcribe: Boolean(transcribe?.configured),
    analyzePerHour: Number(analyze?.limitPerHour ?? 0),
    maxUploadBytes: Number(transcribe?.maxBytes ?? 0),
  };
}

/** Ranks measured candidates. Sends transcript text only. */
export async function analyzeTranscript(options: {
  words: Word[];
  language?: string;
  count?: number;
  refresh?: boolean;
  signal?: AbortSignal;
}): Promise<AnalyzeResponse> {
  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      words: options.words
        .filter((word) => !word.deleted)
        .map((word) => ({ id: word.id, text: word.text, start: word.start, end: word.end })),
      language: options.language ?? "ar-DZ",
      ...(options.count ? { count: options.count } : {}),
      ...(options.refresh ? { refresh: true } : {}),
    }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) throw await readError(response);
  return (await response.json()) as AnalyzeResponse;
}

/**
 * Sends audio for a server-side transcript. Callers must have collected explicit
 * consent first — the route refuses the request otherwise, which is the point.
 */
export async function transcribeAudio(options: {
  blob: Blob;
  language?: string;
  filename?: string;
  mode?: string;
  signal?: AbortSignal;
}): Promise<{ language: string; durationSec: number; segments: unknown[] }> {
  const form = new FormData();
  form.set("consent", "true");
  form.set("language", options.language ?? "ar-DZ");
  if (options.mode) form.set("mode", options.mode);
  form.set("file", options.blob, options.filename ?? "audio.webm");

  const response = await fetch("/api/ai/transcribe", {
    method: "POST",
    body: form,
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) throw await readError(response);
  return (await response.json()) as { language: string; durationSec: number; segments: unknown[] };
}
