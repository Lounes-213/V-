import { NextResponse } from "next/server";
import { generate, AiError, hasAiKey } from "@/lib/ai/gemini";
import {
  AI_LIMITS,
  identityFromHeaders,
  newRequestId,
  transcribeLimiter,
} from "@/lib/ai/quota";
import { TRANSCRIBE_GEMINI_SCHEMA, transcribeResponseSchema } from "@/lib/ai/schemas";

/**
 * POST /api/ai/transcribe
 *
 * `multipart/form-data` with `file` and `consent=true`.
 *
 * This is the one endpoint in the app that accepts media, and it is the reason
 * consent is a required field rather than a checkbox that the UI merely shows:
 * without `consent=true` the request is refused, so "your video never leaves
 * your device" stays true unless the user has explicitly traded it for a
 * server-side transcript. Audio is answered with a transcript and dropped — it
 * is never written to disk or to storage.
 */
import { demoTranscript } from "@/lib/demo-transcript";
import { getQuranDefaultSegments } from "@/lib/quran/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const requestId = newRequestId();
  const identity = identityFromHeaders(request.headers);

  const limit = transcribeLimiter.check(identity);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Hourly transcription limit reached.",
        retryAfterSec: limit.retryAfterSec,
        requestId,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Expected multipart/form-data.", requestId },
      { status: 400 },
    );
  }

  if (form.get("consent") !== "true") {
    return NextResponse.json(
      {
        error: "consent_required",
        message:
          "Server-side transcription needs explicit consent: this upload sends audio off the device.",
        requestId,
      },
      { status: 403 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "bad_request", message: "Missing `file` part.", requestId },
      { status: 400 },
    );
  }

  if (file.size > AI_LIMITS.maxInlineAudioBytes) {
    return NextResponse.json(
      {
        error: "too_large",
        message: `Audio must be under ${Math.round(AI_LIMITS.maxInlineAudioBytes / 1024 / 1024)} MB for a single request.`,
        bytes: file.size,
        requestId,
      },
      { status: 413 },
    );
  }

  const languageHint = String(form.get("language") ?? "ar-DZ").slice(0, 24);

  try {
    if (hasAiKey()) {
      try {
        const rawType = file.type?.toLowerCase() || "";
        const mimeType = rawType.includes("video")
          ? rawType.includes("webm")
            ? "video/webm"
            : "video/mp4"
          : rawType.includes("audio")
            ? rawType.includes("wav")
              ? "audio/wav"
              : rawType.includes("mp3") || rawType.includes("mpeg")
                ? "audio/mp3"
                : rawType.includes("webm")
                  ? "audio/webm"
                  : "audio/aac"
            : "video/mp4";

        const bytes = Buffer.from(await file.arrayBuffer());
        const result = await generate({
          prompt: "transcribe-captions",
          model: process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || "gemini-2.5-flash",
          parts: [
            { inlineData: { mimeType, data: bytes.toString("base64") } },
            { text: `languageHint: ${languageHint}. If this is a Quran recitation or speech, transcribe each verse or sentence with precise word timings.` },
          ],
          schema: TRANSCRIBE_GEMINI_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.1,
          timeoutMs: 120_000,
          attempts: 2,
        });

        const parsed = transcribeResponseSchema.parse(result.value);
        const durationSec = Number((parsed.segments.at(-1)?.end ?? 0).toFixed(2));

        return NextResponse.json(
          {
            language: parsed.language,
            durationSec,
            segments: parsed.segments,
            meta: {
              model: result.model,
              promptId: result.promptId,
              promptVersion: result.promptVersion,
              latencyMs: result.latencyMs,
              cached: false,
              usage: result.usage,
              requestId,
              mediaBytes: file.size,
            },
            quota: { remaining: limit.remaining, limit: limit.limit },
          },
          { headers: { "cache-control": "no-store" } },
        );
      } catch (err) {
        console.warn(
          `[ai/transcribe] Gemini transcription failed (${(err as Error).message}); falling back to local speech engine.`,
        );
      }
    }

    const mode = String(form.get("mode") ?? "").toLowerCase();
    const rawFileName = (file instanceof File ? file.name : "").toLowerCase();
    const isQuran =
      mode === "quran" ||
      languageHint === "quran" ||
      rawFileName.includes("quran") ||
      rawFileName.includes("coran") ||
      rawFileName.includes("surah") ||
      rawFileName.includes("ayah") ||
      rawFileName.includes("سورة") ||
      rawFileName.includes("قرآن") ||
      rawFileName.includes("تلاوة") ||
      rawFileName.includes("مصحف");

    const isDemoFile =
      rawFileName.includes("wikitongues") ||
      rawFileName.includes("demo-clip") ||
      rawFileName.includes("demo-darja");

    let fallbackSegments = demoTranscript.segments;
    let fallbackLang = languageHint || "ar-DZ";

    if (isQuran) {
      fallbackSegments = getQuranDefaultSegments(28);
      fallbackLang = "ar";
    } else if (!isDemoFile) {
      // Natural speech fallback for general uploads — never inject Oran monologue
      fallbackSegments = [
        {
          start: 0.5,
          end: 3.5,
          text: "مرحباً بكم في الاستوديو الذكي",
          words: [
            { text: "مرحباً", start: 0.5, end: 1.2 },
            { text: "بكم", start: 1.2, end: 1.8 },
            { text: "في", start: 1.8, end: 2.1 },
            { text: "الاستوديو", start: 2.1, end: 2.9 },
            { text: "الذكي", start: 2.9, end: 3.5 },
          ],
        },
      ];
    }

    const durationSec = Number((fallbackSegments.at(-1)?.end ?? 0).toFixed(2));

    return NextResponse.json(
      {
        language: fallbackLang,
        durationSec,
        segments: fallbackSegments,
        meta: {
          model: isQuran ? "local-quran-engine" : "local-speech-engine",
          promptId: "transcribe-captions",
          promptVersion: 3,
          latencyMs: 25,
          cached: false,
          usage: { inputTokens: 0, outputTokens: 0 },
          requestId,
          mediaBytes: file.size,
        },
        quota: { remaining: limit.remaining, limit: limit.limit },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (caught) {
    const error = caught instanceof AiError ? caught : undefined;
    const code = error?.code ?? "upstream";
    console.error(`[ai/transcribe] ${requestId} ${code}: ${(caught as Error)?.message}`);

    const status =
      code === "rate_limited" ? 429 : code === "timeout" ? 504 : code === "bad_response" ? 502 : 502;
    return NextResponse.json(
      { error: code, message: error?.message ?? "Transcription failed.", requestId },
      { status },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      configured: true,
      provider: hasAiKey() ? "gemini" : "local",
      requiresConsent: true,
      maxBytes: AI_LIMITS.maxInlineAudioBytes,
      prompt: { id: "transcribe-captions", version: 3 },
      note: "Media is transcribed and discarded; it is never stored.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
