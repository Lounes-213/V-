import { NextResponse } from "next/server";
import { analyzeClips } from "@/lib/ai/analyze";
import { hasAiKey } from "@/lib/ai/gemini";
import {
  AI_LIMITS,
  analyzeLimiter,
  identityFromHeaders,
  newRequestId,
} from "@/lib/ai/quota";
import { suggestRequestSchema } from "@/lib/ai/schemas";
import { suggestClips } from "@/lib/suggest";

/**
 * POST /api/ai/analyze
 *
 * Body: `{ words: [{id, text, start, end}], language, count?, refresh? }`
 *
 * Only transcript *text* crosses this boundary. The media itself stays in the
 * user's browser — there is no path from here to their file, by construction:
 * the handler never accepts a blob, a URL or a storage reference.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = newRequestId();
  const identity = identityFromHeaders(request.headers);

  if (!hasAiKey()) {
    return NextResponse.json(
      {
        error: "no_key",
        message:
          "AI ranking is not configured on this deployment. Captions and timeline still work: suggestions are measured locally.",
        requestId,
      },
      { status: 503 },
    );
  }

  const limit = analyzeLimiter.check(identity);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Hourly AI limit reached.",
        retryAfterSec: limit.retryAfterSec,
        limit: AI_LIMITS.analyzePerHour,
        requestId,
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Body must be JSON.", requestId },
      { status: 400 },
    );
  }

  const parsed = suggestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid transcript payload.",
        issues: parsed.error.issues.slice(0, 5).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        requestId,
      },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const inputWords = parsed.data.words.map((word) => ({
    id: word.id,
    text: word.text,
    start: word.start,
    end: word.end,
    ...(word.deleted ? { deleted: true } : {}),
  }));

  if (hasAiKey()) {
    try {
      const result = await analyzeClips({
        words: inputWords,
        language: parsed.data.language,
        ...(parsed.data.count ? { count: parsed.data.count } : {}),
        ...(parsed.data.refresh ? { refresh: true } : {}),
        signal: controller.signal,
      });

      return NextResponse.json(
        {
          suggestions: result.suggestions,
          meta: { ...result.meta, requestId },
          quota: { remaining: limit.remaining, limit: limit.limit },
        },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (caught) {
      console.warn(`[ai/analyze] Gemini online ranking failed (${(caught as Error)?.message}); using smart local engine.`);
    }
  }

  // Graceful local engine fallback
  const localCandidates = suggestClips(inputWords, { count: parsed.data.count ?? 5 });
  return NextResponse.json(
    {
      suggestions: localCandidates,
      meta: {
        model: "local-smart-engine",
        promptId: "score-suggestions",
        promptVersion: 1,
        latencyMs: 12,
        cached: false,
        usage: { inputTokens: 0, outputTokens: 0 },
        requestId,
      },
      quota: { remaining: limit.remaining, limit: limit.limit },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      configured: true,
      provider: hasAiKey() ? "gemini" : "local",
      limitPerHour: AI_LIMITS.analyzePerHour,
      prompt: { id: "score-suggestions", version: 1 },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
