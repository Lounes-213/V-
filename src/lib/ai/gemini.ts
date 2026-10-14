import "server-only";
import { PROMPTS, type PromptId } from "./prompts.generated";

/**
 * Server-only Gemini access.
 *
 * The API key lives in `GEMINI_API_KEY` and never reaches the browser: every call
 * happens inside a route handler. Requests are retried with jittered backoff on
 * the statuses Google actually uses for "try again", and every call is bounded by
 * a timeout so a stuck request cannot hold a serverless invocation open.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.8-flash";

// 404 is in here on purpose: Google retires model names, and when that happens
// the ladder should move rather than fail the user's request.
const RETRYABLE = new Set([400, 404, 408, 429, 500, 502, 503, 504]);

/**
 * Model ladder. A capacity spike on one model is the most common failure we can
 * see from here, so a retry moves *down* the ladder instead of hammering the
 * same model: `GEMINI_MODEL`, then the pinned stable names.
 */
export function modelLadder(preferred?: string): string[] {
  const configured = preferred || process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const extra = (process.env.GEMINI_MODEL_FALLBACKS ?? "gemini-3.5-flash-lite,gemini-3.7-flash,gemini-flash-latest")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([configured, ...extra, "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-flash-latest"])];
}


export class AiError extends Error {
  constructor(
    message: string,
    readonly code: "no_key" | "rate_limited" | "timeout" | "bad_response" | "upstream" | "network",
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export type AiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GenerateOptions = {
  prompt: PromptId | { text: string; version?: number };
  parts: AiPart[];
  /** JSON schema for structured output — omit for plain text. */
  schema?: Record<string, unknown>;
  temperature?: number;
  model?: string;
  timeoutMs?: number;
  attempts?: number;
  signal?: AbortSignal;
};

export type GenerateResult<T = unknown> = {
  value: T;
  text: string;
  model: string;
  promptId: string;
  promptVersion: number;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
};

export function hasAiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function resolvePrompt(prompt: GenerateOptions["prompt"]) {
  if (typeof prompt === "string") {
    const entry = PROMPTS[prompt];
    if (!entry) throw new AiError(`Unknown prompt: ${prompt}`, "bad_response");
    return { id: entry.id, version: entry.version, text: entry.text, model: entry.model };
  }
  return { id: "inline", version: prompt.version ?? 0, text: prompt.text, model: "" };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Full jitter backoff, capped — keeps a burst of retries from synchronising. */
export function backoffDelay(attempt: number, baseMs = 400, capMs = 6000): number {
  return Math.min(capMs, baseMs * 2 ** (attempt - 1)) * (0.5 + Math.random() / 2);
}

export async function generate<T = unknown>(options: GenerateOptions): Promise<GenerateResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("GEMINI_API_KEY is not configured.", "no_key");

  const prompt = resolvePrompt(options.prompt);
  const ladder = modelLadder(options.model || prompt.model);
  const attempts = Math.max(1, options.attempts ?? ladder.length);
  const timeoutMs = options.timeoutMs ?? 60_000;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          ...options.parts.map((part) =>
            "text" in part ? { text: part.text } : { inlineData: part.inlineData },
          ),
          { text: prompt.text },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      ...(options.schema
        ? { responseMimeType: "application/json", responseSchema: options.schema }
        : {}),
    },
  };

  let lastError: AiError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const model = ladder[Math.min(attempt - 1, ladder.length - 1)]!;
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });

    try {
      const response = await fetch(`${ENDPOINT}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        const error = new AiError(
          `Gemini (${model}) responded ${response.status}: ${detail}`,
          response.status === 429 ? "rate_limited" : "upstream",
          response.status,
        );
        if (RETRYABLE.has(response.status) && attempt < attempts) {
          console.warn(
            `[ai] ${model} returned ${response.status}; retrying on ${ladder[Math.min(attempt, ladder.length - 1)]}`,
          );
          lastError = error;
          await sleep(backoffDelay(attempt, 250, 2500));
          continue;
        }
        throw error;
      }

      const json = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };

      const text =
        json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text.trim()) {
        throw new AiError(
          `Empty Gemini response (finishReason: ${json.candidates?.[0]?.finishReason ?? "unknown"}).`,
          "bad_response",
        );
      }

      let value: unknown = text;
      if (options.schema) {
        try {
          value = JSON.parse(text);
        } catch {
          throw new AiError("Gemini returned malformed JSON.", "bad_response");
        }
      }

      return {
        value: value as T,
        text,
        model,
        promptId: prompt.id,
        promptVersion: prompt.version,
        usage: {
          inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        },
        latencyMs: Date.now() - started,
      };
    } catch (caught) {
      const error =
        caught instanceof AiError
          ? caught
          : (caught as Error)?.name === "AbortError"
            ? new AiError(`Gemini call timed out after ${timeoutMs}ms.`, "timeout")
            : new AiError((caught as Error)?.message ?? "Network failure", "network");

      if ((error.code === "timeout" || error.code === "network") && attempt < attempts) {
        lastError = error;
        await sleep(backoffDelay(attempt, 250, 2500));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  throw lastError ?? new AiError("Gemini call failed.", "upstream");
}
