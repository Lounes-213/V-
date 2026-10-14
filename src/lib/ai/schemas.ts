import { z } from "zod";

/**
 * Wire contracts for the AI routes. One definition, used by the route handler to
 * validate what it received, by the server to validate what the model returned,
 * and by the client to validate what it renders.
 */

export const timedWordSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(160),
  start: z.number().min(0),
  end: z.number().min(0),
  deleted: z.boolean().optional(),
});

export const suggestRequestSchema = z.object({
  /** Transcript text only. Media never enters this route. */
  words: z.array(timedWordSchema).min(1).max(20_000),
  language: z.string().min(2).max(24).default("ar"),
  count: z.number().int().min(1).max(8).optional(),
  /** Set when the caller wants a fresh ranking instead of a cached one. */
  refresh: z.boolean().optional(),
});

export type SuggestRequest = z.infer<typeof suggestRequestSchema>;

/** What the model is allowed to answer with, per candidate. */
export const suggestionScoreSchema = z.object({
  id: z.string().min(1).max(80),
  hookScore: z.number().int().min(0).max(100),
  clarityScore: z.number().int().min(0).max(100),
  keep: z.boolean(),
  title: z.string().min(1).max(160),
  reason: z.string().min(1).max(400),
});

export const suggestionScoreResponseSchema = z.object({
  results: z.array(suggestionScoreSchema).min(1).max(20),
});

export type SuggestionScore = z.infer<typeof suggestionScoreSchema>;

/**
 * OpenAPI-subset schema handed to Gemini for structured output. Kept next to the
 * zod schema on purpose: if one changes, the other is a visible diff away.
 */
export const SUGGESTION_SCORE_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          hookScore: { type: "integer", minimum: 0, maximum: 100 },
          clarityScore: { type: "integer", minimum: 0, maximum: 100 },
          keep: { type: "boolean" },
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["id", "hookScore", "clarityScore", "keep", "title", "reason"],
        propertyOrdering: ["id", "hookScore", "clarityScore", "keep", "title", "reason"],
      },
    },
  },
  required: ["results"],
} as const;

/** Transcription contract — only used when a user explicitly opts in. */
export const transcribedSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string(),
  words: z
    .array(
      z.object({
        text: z.string().min(1),
        start: z.number().min(0),
        end: z.number().min(0),
      }),
    )
    .optional(),
});

export const transcribeResponseSchema = z.object({
  language: z.string().min(2).max(24),
  segments: z.array(transcribedSegmentSchema).max(2000),
});

export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;

export const TRANSCRIBE_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    language: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start: { type: "number" },
          end: { type: "number" },
          text: { type: "string" },
          words: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                start: { type: "number" },
                end: { type: "number" },
              },
              required: ["text", "start", "end"],
            },
          },
        },
        required: ["start", "end", "text", "words"],
      },
    },
  },
  required: ["language", "segments"],
} as const;

export type AiErrorCode =
  | "no_key"
  | "rate_limited"
  | "timeout"
  | "bad_response"
  | "upstream"
  | "network"
  | "bad_request"
  | "too_large"
  | "consent_required";

export type AiMeta = {
  model: string;
  promptId: string;
  promptVersion: number;
  latencyMs: number;
  cached: boolean;
  usage: { inputTokens: number; outputTokens: number };
  requestId: string;
};
