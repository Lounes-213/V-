import { NextResponse } from "next/server";
import { hasAiKey } from "@/lib/ai/gemini";
import { ALL_SURAHS } from "@/lib/quran/surahs-data";
import { lookupAyah, CANONICAL_INDEX } from "@/lib/quran/canonical";
import { matchAyah } from "@/lib/quran/normalize";
import { computeTajweedWordWeight } from "@/lib/audio/tajweed-aligner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

function getAudioUrl(surah: number, ayah: number): string {
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
}

/* ---------------------------------------------------------------- schema */

const QURAN_DETECT_SCHEMA = {
  type: "object",
  properties: {
    surah: { type: "integer" },
    fromAyah: { type: "integer" },
    toAyah: { type: "integer" },
    isPartial: { type: "boolean" },
    confidence: { type: "number" },
    recitedText: { type: "string" },
    ayahs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ayah: { type: "integer" },
          text: { type: "string" },
          isPartial: { type: "boolean" },
        },
        required: ["ayah", "text"],
      },
    },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          ayah: { type: "integer" },
          start: { type: "number" },
          end: { type: "number" },
        },
        required: ["word", "ayah", "start", "end"],
      },
    },
  },
  required: [
    "surah",
    "fromAyah",
    "toAyah",
    "isPartial",
    "confidence",
    "recitedText",
    "ayahs",
    "words",
  ],
} as const;

type DetectedWord = {
  word: string;
  ayah: number;
  start: number;
  end: number;
};

type AiDetectionResult = {
  surah: number;
  fromAyah: number;
  toAyah: number;
  isPartial: boolean;
  confidence: number;
  recitedText: string;
  ayahs: { ayah: number; text: string; isPartial?: boolean }[];
  words: DetectedWord[];
};

/* ---------------------------------------------------------------- helpers */

function normMime(rawType: string): string {
  if (rawType.includes("webm")) return "audio/webm";
  if (rawType.includes("mp3") || rawType.includes("mpeg")) return "audio/mp3";
  if (rawType.includes("wav")) return "audio/wav";
  if (rawType.includes("ogg")) return "audio/ogg";
  if (rawType.includes("aac")) return "audio/aac";
  if (rawType.includes("mp4") || rawType.includes("m4a")) return "audio/mp4";
  return "audio/webm";
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064A\s]/g, "")
    .trim();
}

/**
 * Resilient JSON parser for Quran AI responses.
 * Handles clean JSON, markdown-wrapped JSON, and recovers from token-boundary truncations
 * where the JSON was cut off mid-way through the words array.
 */
function safeParseQuranAiJson(rawText: string): AiDetectionResult | null {
  let text = rawText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // 1. Try standard JSON.parse first
  try {
    const parsed = JSON.parse(text) as AiDetectionResult;
    if (parsed && typeof parsed.surah === "number" && parsed.surah >= 1 && parsed.surah <= 114) {
      return parsed;
    }
  } catch {
    // Proceed to robust extraction
  }

  // 2. Resilient recovery for truncated or slightly malformed JSON
  const surahMatch = text.match(/"surah"\s*:\s*(\d+)/);
  const fromMatch = text.match(/"fromAyah"\s*:\s*(\d+)/);
  const toMatch = text.match(/"toAyah"\s*:\s*(\d+)/);
  const recitedMatch = text.match(/"recitedText"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);

  if (surahMatch && surahMatch[1]) {
    const surah = parseInt(surahMatch[1], 10);
    const fromAyah = fromMatch && fromMatch[1] ? parseInt(fromMatch[1], 10) : 1;
    const toAyah = toMatch && toMatch[1] ? parseInt(toMatch[1], 10) : fromAyah;
    const recitedText = recitedMatch && recitedMatch[1] ? recitedMatch[1] : "";

    const words: DetectedWord[] = [];
    const wordRegex = /\{\s*"word"\s*:\s*"([^"]+)"\s*,\s*"ayah"\s*:\s*(\d+)\s*,\s*"start"\s*:\s*([\d.]+)\s*,\s*"end"\s*:\s*([\d.]+)\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(text)) !== null) {
      words.push({
        word: m[1]!,
        ayah: parseInt(m[2]!, 10),
        start: parseFloat(m[3]!),
        end: parseFloat(m[4]!),
      });
    }

    console.log(`[detect-audio] Successfully recovered truncated AI JSON: Surah ${surah}, Ayahs ${fromAyah}..${toAyah}, extracted ${words.length} words`);

    return {
      surah,
      fromAyah,
      toAyah,
      isPartial: false,
      confidence: 0.95,
      recitedText,
      ayahs: [],
      words,
    };
  }

  return null;
}

/**
 * Aligns detected words with canonical Uthmani text across ALL verses in the passage.
 * Automatically tracks transitions across verse boundaries, preserves Madd (المد)
 * diacritics, and handles repeated phrases without dropping timestamps.
 */
function alignWordsWithCanonical(
  detectedWords: DetectedWord[],
  canonicalAyahs: { ayah: number; text: string }[],
): { text: string; ayah: number; start: number; end: number }[] {
  type CanonicalToken = {
    text: string;
    norm: string;
    ayah: number;
  };

  const allTokens: CanonicalToken[] = [];
  for (const a of canonicalAyahs) {
    const rawTokens = a.text
      .split(/\s+/)
      .filter((t) => !/^[ۚۖۗۘۙۜ۞۩]+$/.test(t) && Boolean(t));
    for (const tok of rawTokens) {
      allTokens.push({
        text: tok,
        norm: normalizeArabic(tok),
        ayah: a.ayah,
      });
    }
  }

  if (allTokens.length === 0) {
    return detectedWords.map((w) => ({
      text: w.word,
      start: w.start,
      end: w.end,
      ayah: w.ayah || canonicalAyahs[0]?.ayah || 1,
    }));
  }

  const aligned: { text: string; ayah: number; start: number; end: number }[] = [];
  let cCursor = 0;

  for (let i = 0; i < detectedWords.length; i++) {
    const dw = detectedWords[i]!;
    const normW = normalizeArabic(dw.word);

    // 1. Search forward from cCursor (natural reading progression across ayahs)
    let foundIdx = -1;
    for (let j = cCursor; j < allTokens.length; j++) {
      if (allTokens[j]!.norm === normW) {
        foundIdx = j;
        break;
      }
    }

    // 2. If not found ahead, search from beginning (reciter repeated a word or phrase)
    if (foundIdx === -1) {
      for (let j = 0; j < allTokens.length; j++) {
        if (allTokens[j]!.norm === normW) {
          foundIdx = j;
          break;
        }
      }
    }

    let matchedText = dw.word;
    let matchedAyah = dw.ayah || (allTokens[cCursor] ? allTokens[cCursor]!.ayah : canonicalAyahs[0]?.ayah || 1);

    if (foundIdx !== -1) {
      const match = allTokens[foundIdx]!;
      matchedText = match.text;
      matchedAyah = match.ayah;
      cCursor = (foundIdx + 1) % allTokens.length;
    }

    aligned.push({
      text: matchedText,
      start: dw.start,
      end: dw.end,
      ayah: matchedAyah,
    });
  }

  return aligned;
}

/**
 * Distributes canonical words intelligently across the audio clip duration
 * with acoustic weighting for word length, Tajweed Madd syllables, and verse pauses.
 */
function distributeCanonicalWordsAcrossDuration(
  canonicalAyahs: { ayah: number; text: string }[],
  durationSec: number,
): { text: string; ayah: number; start: number; end: number }[] {
  type WeightedWord = { text: string; ayah: number; weight: number };
  const words: WeightedWord[] = [];

  for (const a of canonicalAyahs) {
    const rawWords = a.text
      .split(/\s+/)
      .filter((w) => !/^[ۚۖۗۘۙۜ۞۩]+$/.test(w) && Boolean(w));

    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i]!;
      const isVerseEnd = i === rawWords.length - 1;
      const tajweed = computeTajweedWordWeight(w, isVerseEnd);
      words.push({ text: w, ayah: a.ayah, weight: tajweed.totalWeight });
    }
  }

  if (words.length === 0) return [];

  const totalWeight = words.reduce((acc, w) => acc + w.weight, 0);
  const usableDuration = Math.max(1, durationSec - 0.2);
  let currentSec = 0.1;

  return words.map((w, idx) => {
    const wordDur = Math.max(0.22, (w.weight / Math.max(0.1, totalWeight)) * usableDuration);
    const start = Number(currentSec.toFixed(3));
    const end = Number(Math.min(durationSec, currentSec + wordDur).toFixed(3));
    currentSec = end + (idx < words.length - 1 ? 0.03 : 0);
    return {
      text: w.text,
      ayah: w.ayah,
      start,
      end: Math.max(start + 0.18, end),
    };
  });
}

/**
 * Precision Quran Audio Forced Alignment Engine.
 * Aligns the known sequence of canonical Quranic words against the recitation audio,
 * capturing exact start and end intervals, natural pauses, and prolonged Madd.
 */
async function alignCanonicalWordsToAudioWithAi(
  bytes: Buffer,
  mimeType: string,
  canonicalAyahs: { ayah: number; text: string }[],
  durationSec: number,
  apiKey: string,
): Promise<{ text: string; ayah: number; start: number; end: number }[]> {
  type Token = { word: string; ayah: number };
  const flatTokens: Token[] = [];
  for (const ca of canonicalAyahs) {
    const rawTokens = ca.text.split(/\s+/).filter((t) => !/^[ۚۖۗۘۙۜ۞۩]+$/.test(t) && Boolean(t));
    for (const tok of rawTokens) {
      flatTokens.push({ word: tok, ayah: ca.ayah });
    }
  }

  if (flatTokens.length === 0) return [];

  const b64 = bytes.toString("base64");
  const wordList = flatTokens.map((w) => w.word).join(" ");

  const prompt = `You are a precision Quran audio forced alignment engine.
The audio recitation matches these exact Arabic Quran words in order:
${wordList}

Listen carefully to the audio clip (duration 0.0s to ${durationSec.toFixed(1)}s).
For each word, identify the EXACT interval during which it is uttered:
- 'start': when the speaker starts reciting this word (in seconds)
- 'end': when the speaker finishes reciting this word (in seconds, end > start). Hold 'end' to include prolonged Madd (المد) and vowels.

Do not output identical start and end values. End MUST be strictly greater than start.
If any words at the end of the text were not recited in this clip, do not include them.

Return ONLY a valid JSON array:
[
  {"word": "${flatTokens[0]!.word}", "ayah": ${flatTokens[0]!.ayah}, "start": 0.15, "end": 0.95}
]`;

  const models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"];

  for (const model of models) {
    try {
      const res = await fetch(`${ENDPOINT}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: b64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (res.ok) {
        const json = (await res.json()) as GeminiResponse;
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        let cleanText = rawText;
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        }
        const parsed = JSON.parse(cleanText) as { word?: string; ayah?: number; start?: number; end?: number }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[detect-audio] Forced alignment succeeded with ${model}: aligned ${parsed.length} words for duration ${durationSec.toFixed(1)}s`);
          const resultWords: { text: string; ayah: number; start: number; end: number }[] = [];
          for (let i = 0; i < parsed.length; i++) {
            const pw = parsed[i]!;
            if (typeof pw.start === "number" && typeof pw.end === "number") {
              const canonTok = flatTokens[i] || { word: pw.word || "", ayah: pw.ayah || 1 };
              const start = Math.max(0, Math.min(durationSec, Number(pw.start.toFixed(3))));
              const end = Math.max(start + 0.1, Math.min(durationSec, Number(pw.end.toFixed(3))));
              resultWords.push({
                text: canonTok.word,
                ayah: canonTok.ayah,
                start,
                end,
              });
            }
          }
          if (resultWords.length > 0) {
            return resultWords;
          }
        }
      }
    } catch (err) {
      console.warn(`[detect-audio] Forced alignment ${model} warning:`, (err as Error).message);
    }
  }

  return [];
}

// In-memory cache for surah verse maps
const surahVerseCache = new Map<
  number,
  Map<number, { uthmani: string; translation: string }>
>();

async function getSurahVerses(surahNum: number): Promise<Map<number, { uthmani: string; translation: string }>> {
  if (surahVerseCache.has(surahNum)) {
    return surahVerseCache.get(surahNum)!;
  }

  const map = new Map<number, { uthmani: string; translation: string }>();

  try {
    const [textRes, transRes] = await Promise.all([
      fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNum}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(7000),
      }),
      fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&translations=136&per_page=300`,
        {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(7000),
        },
      ),
    ]);

    if (textRes.ok) {
      const textJson = (await textRes.json()) as { verses?: { verse_key?: string; text_uthmani?: string }[] };
      const transJson = transRes.ok
        ? ((await transRes.json()) as {
            verses?: { verse_key?: string; translations?: { text?: string }[] }[];
          })
        : null;

      const transMap = new Map<string, string>();
      for (const v of transJson?.verses || []) {
        if (v.verse_key && v.translations?.[0]?.text) {
          transMap.set(v.verse_key, v.translations[0].text.replace(/<[^>]+>/g, "").trim());
        }
      }

      for (const v of textJson.verses || []) {
        const key = v.verse_key || "";
        const [s, a] = key.split(":").map(Number);
        if (s === surahNum && a) {
          map.set(a, {
            uthmani: v.text_uthmani?.trim() || "",
            translation: transMap.get(key) || "",
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[getSurahVerses] Live fetch failed for Surah ${surahNum}, trying fallback:`, err);
    try {
      const fbRes = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,fr.montada`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) },
      );
      if (fbRes.ok) {
        const fbJson = (await fbRes.json()) as {
          data?: [
            { ayahs?: { numberInSurah: number; text: string }[] },
            { ayahs?: { numberInSurah: number; text: string }[] },
          ];
        };
        const arAyahs = fbJson.data?.[0]?.ayahs || [];
        const frAyahs = fbJson.data?.[1]?.ayahs || [];
        for (let i = 0; i < arAyahs.length; i++) {
          const ar = arAyahs[i]!;
          map.set(ar.numberInSurah, {
            uthmani: ar.text,
            translation: frAyahs[i]?.text || "",
          });
        }
      }
    } catch {
      /* exhausted */
    }
  }

  // Also check local fixture for any missing
  const surahMeta = ALL_SURAHS.find((s) => s.number === surahNum);
  if (surahMeta) {
    for (let a = 1; a <= surahMeta.ayahCount; a++) {
      if (!map.has(a)) {
        const local = lookupAyah(surahNum, a);
        if (local) {
          map.set(a, { uthmani: local.uthmani, translation: local.translation });
        }
      }
    }
  }

  if (map.size > 0) {
    surahVerseCache.set(surahNum, map);
  }
  return map;
}

/* ------------------------------------------------------------- Gemini Robust Caller */

/** Only the fields this route reads out of a Gemini response. */
type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  [key: string]: unknown;
};

async function callGeminiContent(
  apiKey: string,
  contents: unknown[],
  generationConfig: Record<string, unknown> = {},
  timeoutMs = 12_000,
): Promise<{ ok: boolean; data?: GeminiResponse; error?: string; modelUsed?: string }> {
  // Ultra-fast Flash-Lite engine prioritized for sub-second recognition
  const configuredModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const candidateModels = Array.from(
    new Set([
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      configuredModel,
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ]),
  );

  for (const model of candidateModels) {
    const maxRetries = 1;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${ENDPOINT}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.1,
              ...generationConfig,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          return { ok: true, data: json, modelUsed: model };
        }

        const errText = await res.text().catch(() => "");
        console.warn(`[detect-audio] ${model} attempt ${attempt} HTTP ${res.status}: ${errText.slice(0, 150)}`);

        // If 503 (demand spike), 429 (quota), or 404, immediately advance to next model with 0s latency
        break;
      } catch (err) {
        clearTimeout(timer);
        const isAbort = (err as Error)?.name === "AbortError";
        console.warn(`[detect-audio] ${model} attempt ${attempt} exception:`, (err as Error).message);
        if (!isAbort && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
      }
    }
  }

  return { ok: false, error: "All Gemini candidate models failed or quota exhausted" };
}

/* ------------------------------------------------------------- Whisper / STT */

async function tryWhisperTranscription(bytes: Buffer, mimeType: string, _apiKey?: string): Promise<string> {
  // 1. External Whisper API if configured
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    try {
      const form = new FormData();
      const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
      form.append("file", new Blob([bytes as unknown as BlobPart], { type: mimeType }), `audio.${ext}`);
      form.append("model", "whisper-large-v3");
      form.append("language", "ar");
      form.append("temperature", "0");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const json = (await res.json()) as { text?: string };
        if (json.text?.trim()) return json.text.trim();
      }
    } catch (e) {
      console.warn("[detect-audio] Groq Whisper failed:", (e as Error).message);
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const form = new FormData();
      const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
      form.append("file", new Blob([bytes as unknown as BlobPart], { type: mimeType }), `audio.${ext}`);
      form.append("model", "whisper-1");
      form.append("language", "ar");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: form,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const json = (await res.json()) as { text?: string };
        if (json.text?.trim()) return json.text.trim();
      }
    } catch (e) {
      console.warn("[detect-audio] OpenAI Whisper failed:", (e as Error).message);
    }
  }

  return "";
}

async function transcribeAudioWithGemini(bytes: Buffer, mimeType: string, apiKey: string): Promise<string> {
  try {
    const b64 = bytes.toString("base64");
    const prompt = "You are an expert Quran transcriber. Listen carefully to this recitation (which may be a long recitation of multiple verses or a complete surah, up to 5 minutes) and output the exact Arabic Quranic words recited from start to finish. Return ONLY the Arabic words recited, with no explanation or punctuation.";
    const res = await callGeminiContent(
      apiKey,
      [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: b64 } },
            { text: prompt },
          ],
        },
      ],
      { maxOutputTokens: 8192 },
      60_000,
    );
    if (res.ok && res.data) {
      const text = res.data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
      if (text.length >= 3) {
        return text;
      }
    }
  } catch (err) {
    console.warn("[detect-audio] Gemini audio transcription fallback warning:", (err as Error).message);
  }
  return "";
}

/* ------------------------------------------------------------- Gemini Text Match */

async function identifyPassageFromText(
  text: string,
  apiKey: string,
): Promise<{ surah: number; fromAyah: number; toAyah: number; recitedText: string; ayahs: { ayah: number; text: string }[] } | null> {
  const clean = text.trim();
  if (clean.length < 3) return null;

  const words = clean.split(/\s+/).filter(Boolean);
  const isMultiAyahLikely = words.length > 14;

  // 1. Instant check against local Canonical Quran index (0ms, 0 quota)
  if (!isMultiAyahLikely) {
    try {
      const localCandidates = matchAyah(clean, CANONICAL_INDEX, { limit: 1, minScore: 0.62 });
      if (localCandidates[0]) {
        const c = localCandidates[0];
        const [s, a] = c.id.split(":").map(Number);
        if (s && a) {
          return {
            surah: s,
            fromAyah: a,
            toAyah: a,
            recitedText: clean,
            ayahs: [{ ayah: a, text: clean }],
          };
        }
      }
    } catch {
      /* fallback to AI */
    }
  } else {
    // For longer multi-verse texts, check boundaries for instant 0ms span detection
    try {
      const startCandidate = matchAyah(words.slice(0, 10).join(" "), CANONICAL_INDEX, { limit: 1, minScore: 0.58 });
      const endCandidate = matchAyah(words.slice(-10).join(" "), CANONICAL_INDEX, { limit: 1, minScore: 0.58 });
      if (startCandidate[0] && endCandidate[0]) {
        const [s1, a1] = startCandidate[0].id.split(":").map(Number);
        const [s2, a2] = endCandidate[0].id.split(":").map(Number);
        if (s1 && s2 && s1 === s2 && a1 && a2) {
          return {
            surah: s1,
            fromAyah: Math.min(a1, a2),
            toAyah: Math.max(a1, a2),
            recitedText: clean,
            ayahs: [],
          };
        }
      }
    } catch {
      /* fallback to AI */
    }
  }

  // 2. Gemini Text identification (gemini-3.8-flash with fallback)
  try {
    const prompt = `You are an expert Quran scholar.
Given this recited Quran passage in Arabic (which may be a long recitation of multiple verses or a complete surah, up to 5 minutes):
"${clean}"

Identify:
1. 'surah': Surah number (1 to 114).
2. 'fromAyah': First Ayah recited in this passage (1-based).
3. 'toAyah': Last Ayah recited in this passage (1-based, >= fromAyah). Detect ALL consecutive Ayahs recited from the very beginning to the very end.
4. 'recitedText': Verified Arabic text.

Return ONLY valid JSON:
{"surah": 1, "fromAyah": 1, "toAyah": 7, "recitedText": "..."}`;

    const res = await callGeminiContent(
      apiKey,
      [{ parts: [{ text: prompt }] }],
      { responseMimeType: "application/json", maxOutputTokens: 4096 },
      35_000,
    );

    if (res.ok && res.data) {
      const rawText = res.data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
      if (rawText) {
        const parsed = JSON.parse(rawText) as {
          surah?: number;
          fromAyah?: number;
          toAyah?: number;
          recitedText?: string;
          ayahs?: { ayah: number; text: string }[];
        };
        if (parsed.surah && parsed.fromAyah) {
          return {
            surah: Number(parsed.surah),
            fromAyah: Number(parsed.fromAyah),
            toAyah: Number(parsed.toAyah) || Number(parsed.fromAyah),
            recitedText: parsed.recitedText || clean,
            ayahs: parsed.ayahs || [{ ayah: Number(parsed.fromAyah), text: clean }],
          };
        }
      }
    }
  } catch (err) {
    console.warn("[detect-audio] identifyPassageFromText AI attempt:", (err as Error).message);
  }

  // 3. Fallback: Quran.com API search
  try {
    const sRes = await fetch(
      `https://api.quran.com/api/v4/search?q=${encodeURIComponent(clean.slice(0, 80))}&size=1&language=ar`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) },
    );
    if (sRes.ok) {
      const sJson = (await sRes.json()) as { search?: { results?: { verse_key?: string }[] } };
      const vk = sJson.search?.results?.[0]?.verse_key;
      if (vk) {
        const [s, a] = vk.split(":").map(Number);
        if (s && a) {
          return {
            surah: s,
            fromAyah: a,
            toAyah: a,
            recitedText: clean,
            ayahs: [{ ayah: a, text: clean }],
          };
        }
      }
    }
  } catch {
    /* exhausted */
  }

  return null;
}

/* ------------------------------------------------------------------ route */

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  if (form.get("consent") !== "true") {
    return NextResponse.json(
      { error: "consent_required", message: "Explicit consent is required." },
      { status: 403 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing `file` part." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!hasAiKey() || !apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured." }, { status: 503 });
  }

  const mimeType = normMime(file.type?.toLowerCase() ?? "");
  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const durationSec = Math.max(1, Number(form.get("durationSec") ?? 0) || 10);
  const clientTranscribedText = String(form.get("transcribedText") ?? "").trim();

  let result: AiDetectionResult | null = null;
  let lastError = "";

  /* =========================================================================
     SMART MULTI-STAGE RECOGNITION PIPELINE:
     1. Text Route (Web Speech STT / Client Text Hint)
     2. Multimodal Audio Route (gemini-3.8-flash with 503 retry and 40s timeout)
     3. External Whisper Route (Groq / OpenAI if configured)
     4. Quran Canonical Fuzzy Search Safety Net
  ========================================================================= */

  // Stage 1: If client provided transcribed text, check it first
  if (clientTranscribedText && clientTranscribedText.length >= 3) {
    const passage = await identifyPassageFromText(clientTranscribedText, apiKey);
    if (passage && passage.surah) {
      result = {
        surah: passage.surah,
        fromAyah: passage.fromAyah,
        toAyah: passage.toAyah,
        isPartial: false,
        confidence: 0.96,
        recitedText: passage.recitedText,
        ayahs: passage.ayahs,
        words: [],
      };
    }
  }

  // Stage 2: Direct Audio Recognition with Gemini (gemini-3.8-flash first)
  if (!result) {
    const promptText = `You are an expert Quran recitation recognition engine.
Listen carefully to the audio clip (duration 0.0s to ${durationSec.toFixed(1)}s).
1. MULTI-AYAH PASSAGES: Detect the exact Surah and consecutive Ayahs recited.
   'surah': Exact Surah number (1 to 114).
   'fromAyah': First Ayah recited (1-based).
   'toAyah': Last Ayah recited (1-based, >= fromAyah).
   'recitedText': Verified Arabic text of what was recited.
   'ayahs': Array of {"ayah": number, "text": string} for each verse in that passage.
2. WORD TIMESTAMPS: For every word, output 'word', 'ayah', 'start', 'end' in seconds.
   TAJWEED MADD (المد): Hold 'end' across prolonged vocalization.

CRITICAL CONSTRAINT: Detect ALL consecutive Ayahs recited in the audio clip from beginning to end. Do not miss any verse recited. Return the exact surah, fromAyah, and toAyah. Short surahs (e.g. Al-Kawthar, Al-Ikhlas, An-Nasr) can have multiple short verses even in short audio clips. Be strictly accurate about the surah and ayah numbers.

Return valid JSON with keys: surah, fromAyah, toAyah, isPartial, confidence, recitedText, ayahs, words`;

    const audioRes = await callGeminiContent(
      apiKey,
      [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: b64 } },
            { text: promptText },
          ],
        },
      ],
      {
        responseMimeType: "application/json",
        responseSchema: QURAN_DETECT_SCHEMA,
        maxOutputTokens: 8192,
      },
      35_000,
    );

    if (audioRes.ok && audioRes.data) {
      const text = audioRes.data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (text.trim()) {
        try {
          const parsed = safeParseQuranAiJson(text);
          if (parsed && parsed.surah) {
            // Validate recitedText against canonical Quran index if available
            if (parsed.recitedText && parsed.recitedText.trim().length >= 6) {
              try {
                const matched = matchAyah(parsed.recitedText.trim(), CANONICAL_INDEX, { limit: 1, minScore: 0.62 });
                if (matched[0]) {
                  const [mS, mA] = matched[0].id.split(":").map(Number);
                  if (mS && mA) {
                    if (mS !== parsed.surah || Math.abs(mA - (parsed.fromAyah || 1)) > 2) {
                      console.log(`[detect-audio] Corrected AI detection from ${parsed.surah}:${parsed.fromAyah} to ${mS}:${mA} via canonical match (score: ${matched[0].score.toFixed(2)})`);
                      parsed.surah = mS;
                      parsed.fromAyah = mA;
                      const maxA = ALL_SURAHS.find((s) => s.number === mS)?.ayahCount || 286;
                      parsed.toAyah = Math.max(mA, Math.min(maxA, mA + Math.max(0, (parsed.toAyah || mA) - (parsed.fromAyah || mA))));
                    }
                  }
                }
              } catch (mErr) {
                console.warn("[detect-audio] Canonical cross-check warning:", mErr);
              }
            }
            result = parsed;
          }
        } catch (e) {
          console.warn("[detect-audio] Failed to parse audio AI JSON:", (e as Error).message);
        }
      }
    } else {
      lastError = audioRes.error || "Audio recognition failed";
    }
  }

  // Stage 2.5: Gemini Audio STT fallback (pure Arabic text) -> Canonical Index Match
  if (!result) {
    try {
      const geminiTranscribed = await transcribeAudioWithGemini(bytes, mimeType, apiKey);
      if (geminiTranscribed && geminiTranscribed.length >= 3) {
        console.log(`[detect-audio] Gemini STT recovered text: "${geminiTranscribed.slice(0, 60)}..."`);
        const passage = await identifyPassageFromText(geminiTranscribed, apiKey);
        if (passage && passage.surah) {
          result = {
            surah: passage.surah,
            fromAyah: passage.fromAyah,
            toAyah: passage.toAyah,
            isPartial: false,
            confidence: 0.94,
            recitedText: passage.recitedText,
            ayahs: passage.ayahs,
            words: [],
          };
        }
      }
    } catch (err) {
      console.warn("[detect-audio] Gemini STT fallback warning:", (err as Error).message);
    }
  }

  // Stage 3: External Whisper STT if configured
  if (!result) {
    const whisperText = await tryWhisperTranscription(bytes, mimeType, apiKey);
    if (whisperText && whisperText.length >= 3) {
      const passage = await identifyPassageFromText(whisperText, apiKey);
      if (passage && passage.surah) {
        result = {
          surah: passage.surah,
          fromAyah: passage.fromAyah,
          toAyah: passage.toAyah,
          isPartial: false,
          confidence: 0.92,
          recitedText: passage.recitedText,
          ayahs: passage.ayahs,
          words: [],
        };
      }
    }
  }

  // Stage 4: Fuzzy safety net if client text exists
  if (!result && clientTranscribedText) {
    try {
      const match = matchAyah(clientTranscribedText, CANONICAL_INDEX, { limit: 1, minScore: 0.38 });
      if (match[0]) {
        const [s, a] = match[0].id.split(":").map(Number);
        if (s && a) {
          result = {
            surah: s,
            fromAyah: a,
            toAyah: a,
            isPartial: false,
            confidence: 0.85,
            recitedText: clientTranscribedText,
            ayahs: [{ ayah: a, text: clientTranscribedText }],
            words: [],
          };
        }
      }
    } catch {
      /* exhausted */
    }
  }

  if (!result || !result.surah) {
    console.error("[detect-audio] Pipeline found no match. Error:", lastError);
    return NextResponse.json(
      {
        error: "تعذر التعرف التلقائي على الآية الكريمة.",
        detail: lastError || "Please pick the surah and ayah manually",
        canManualSelect: true,
      },
      { status: 422 },
    );
  }

  const surahMeta = ALL_SURAHS.find((s) => s.number === result.surah);
  const surahNameArabic = surahMeta?.nameArabic || "";
  const surahNameSimple = surahMeta?.nameSimple || "";
  const maxAyahsInSurah = surahMeta?.ayahCount || 286;

  const rawFrom = Math.max(1, Math.min(maxAyahsInSurah, Number(result.fromAyah) || 1));
  let rawTo = Math.max(rawFrom, Math.min(maxAyahsInSurah, Number(result.toAyah) || rawFrom));

  // Guard against wildly hallucinated wide ayah ranges
  // Short surahs (e.g. Al-Kawthar, Al-Ikhlas) are recited quickly; 5-minute recitations can span dozens of ayahs.
  const maxPlausibleAyahs = Math.max(15, Math.ceil(durationSec / 0.7));
  if (rawTo - rawFrom + 1 > maxPlausibleAyahs) {
    console.warn(`[detect-audio] Clamping hallucinated ayah span (${rawFrom}..${rawTo}) to max plausible (${maxPlausibleAyahs} ayahs for ${durationSec.toFixed(1)}s)`);
    rawTo = Math.min(maxAyahsInSurah, rawFrom + maxPlausibleAyahs - 1);
  }

  const fromAyah = rawFrom;
  let toAyah = rawTo;
  const isPartial = Boolean(result.isPartial);

  // 1. Fetch official Uthmani text and translations for all ayahs in the passage
  const verseMap = await getSurahVerses(result.surah);
  let passageAyahs: {
    ayah: number;
    uthmani: string;
    translation: string;
    isPartial?: boolean;
  }[] = [];

  for (let a = fromAyah; a <= toAyah; a++) {
    const vData = verseMap.get(a) || { uthmani: "", translation: "" };
    passageAyahs.push({
      ayah: a,
      uthmani: vData.uthmani,
      translation: vData.translation,
      isPartial: isPartial && a === fromAyah,
    });
  }

  // 2. High-Precision Acoustic Forced Alignment for Quranic words
  const canonicalAyahsForWords = passageAyahs.map((pa) => ({ ayah: pa.ayah, text: pa.uthmani }));
  let alignedWords: { text: string; ayah: number; start: number; end: number }[] = [];

  if (result.words && result.words.length > 0) {
    alignedWords = alignWordsWithCanonical(result.words, canonicalAyahsForWords);
  } else {
    // Run AI Acoustic Forced Alignment against known canonical words
    const aiForced = await alignCanonicalWordsToAudioWithAi(
      bytes,
      mimeType,
      canonicalAyahsForWords,
      durationSec,
      apiKey,
    );
    if (aiForced.length > 0) {
      alignedWords = aiForced;
    } else {
      // Fallback: Tajweed-weighted distribution
      alignedWords = distributeCanonicalWordsAcrossDuration(canonicalAyahsForWords, durationSec);
    }
  }

  // If words were aligned, ensure toAyah reflects the actual recited ayahs in the audio clip
  if (alignedWords.length > 0) {
    const lastRecitedAyah = alignedWords[alignedWords.length - 1]?.ayah;
    if (lastRecitedAyah && lastRecitedAyah >= fromAyah && lastRecitedAyah < toAyah) {
      console.log(`[detect-audio] Trimming unrecited tail ayahs: adjusting toAyah from ${toAyah} to ${lastRecitedAyah}`);
      toAyah = lastRecitedAyah;
      passageAyahs = passageAyahs.filter((pa) => pa.ayah <= toAyah);
    }
  }

  // 3. Assemble complete response
  const firstAyahData = passageAyahs[0] || { uthmani: "", translation: "" };
  const fullPassageUthmani = passageAyahs.map((pa) => pa.uthmani).filter(Boolean).join(" ۝ ");
  const fullPassageTranslation = passageAyahs.map((pa) => pa.translation).filter(Boolean).join(" ");

  return NextResponse.json({
    surah: result.surah,
    ayah: fromAyah,
    fromAyah,
    toAyah,
    isPartial,
    surahName: surahNameArabic,
    surahNameArabic,
    surahNameSimple,
    uthmani: fullPassageUthmani || firstAyahData.uthmani,
    translation: fullPassageTranslation || firstAyahData.translation,
    confidence: result.confidence || 0.95,
    audioUrl: getAudioUrl(result.surah, fromAyah),
    recitedText: result.recitedText || "",
    ayahs: passageAyahs.map((pa) => ({
      ayah: pa.ayah,
      text: pa.uthmani,
      uthmani: pa.uthmani,
      translation: pa.translation,
      isPartial: pa.isPartial,
    })),
    words: alignedWords,
  });
}

