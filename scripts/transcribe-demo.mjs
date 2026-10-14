#!/usr/bin/env node
/**
 * Builds the demo transcript fixture from the real demo clip by asking Gemini to
 * transcribe it with the versioned prompt in prompts/transcribe-captions.md.
 *
 * Nothing here is hand-written: run it again and you get another machine
 * transcription of the same bytes. The fixture records which model, which prompt
 * version and which media hash produced it, so a reviewer can tell when it moves.
 *
 * Usage: node scripts/transcribe-demo.mjs [mediaPath] [--out path] [--dry]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MEDIA = resolve(ROOT, process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "public/demo/demo-clip.webm");
const OUT_FLAG = process.argv.indexOf("--out");
const OUT = resolve(
  ROOT,
  OUT_FLAG !== -1 ? process.argv[OUT_FLAG + 1] : "src/lib/fixtures/demo-transcript.json",
);
const DRY = process.argv.includes("--dry");
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

function loadEnv() {
  const file = join(ROOT, ".env.local");
  const env = {};
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return env;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !match[1].startsWith("#")) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function readPrompt() {
  const source = readFileSync(join(ROOT, "prompts", "transcribe-captions.md"), "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  const meta = {};
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const at = line.indexOf(":");
      if (at !== -1) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  return { meta, body: source.slice(fm ? fm[0].length : 0).trim() };
}

const SCHEMA = {
  type: "object",
  properties: {
    language: { type: "string", description: "BCP-47-ish label of the dominant spoken language" },
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
};

async function callGemini({ apiKey, model, prompt, bytes, mimeType }) {
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: bytes.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  };

  const response = await fetch(`${ENDPOINT}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 900)}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error(`Empty response (finishReason: ${json.candidates?.[0]?.finishReason}).`);
  return { parsed: JSON.parse(text), usage: json.usageMetadata ?? {} };
}

/** Sanity pass: the fixture must be internally consistent before it is written. */
function audit(segments, durationSec) {
  const problems = [];
  let previousEnd = -1;
  let wordCount = 0;

  segments.forEach((segment, index) => {
    if (!(segment.end > segment.start)) problems.push(`segment ${index}: end <= start`);
    if (segment.start < previousEnd - 0.25) problems.push(`segment ${index}: overlaps the previous one`);
    if (segment.end > durationSec + 1) problems.push(`segment ${index}: ends past the media (${segment.end})`);
    previousEnd = segment.end;
    for (const word of segment.words) {
      wordCount += 1;
      if (!(word.end >= word.start)) problems.push(`word "${word.text}" has end < start`);
    }
    const joined = segment.words.map((word) => word.text).join(" ").trim();
    if (joined && segment.text.trim() && joined !== segment.text.trim()) {
      problems.push(`segment ${index}: word list does not match the segment text`);
    }
  });

  const coverage = durationSec ? previousEnd / durationSec : 0;
  return { problems, wordCount, coverage };
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || "gemini-flash-latest";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing — put it in .env.local (git-ignored).");
    process.exit(1);
  }

  const bytes = readFileSync(MEDIA);
  const mimeType = MEDIA.endsWith(".webm") ? "video/webm" : MEDIA.endsWith(".mp4") ? "video/mp4" : "application/octet-stream";
  const { meta, body } = readPrompt();
  const mediaHash = createHash("sha256").update(bytes).digest("hex");

  console.log(`media   : ${relative(ROOT, MEDIA)} (${(bytes.length / 1e6).toFixed(2)} MB, ${mimeType})`);
  console.log(`prompt  : ${meta.id ?? "transcribe-captions"} v${meta.version ?? "?"}`);
  console.log(`model   : ${model}`);
  console.log(`sha256  : ${mediaHash.slice(0, 16)}…`);

  if (DRY) {
    console.log("--dry: request built, nothing sent.");
    return;
  }

  const started = Date.now();
  const { parsed, usage } = await callGemini({ apiKey, model, prompt: body, bytes, mimeType });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const segments = (parsed.segments ?? []).filter((segment) => segment.text?.trim());
  const durationSec = Number((segments.at(-1)?.end ?? 0).toFixed(2));
  const { problems, wordCount, coverage } = audit(segments, durationSec);

  console.log(`\nsegments: ${segments.length}  words: ${wordCount}  last end: ${durationSec}s  (${elapsed}s)`);
  console.log(`tokens  : ${usage.promptTokenCount ?? "?"} in / ${usage.candidatesTokenCount ?? "?"} out`);
  console.log("\nfirst 6 segments:");
  for (const segment of segments.slice(0, 6)) {
    console.log(`  [${segment.start.toFixed(2)}–${segment.end.toFixed(2)}] ${segment.text}`);
  }
  if (problems.length) {
    console.log(`\n! ${problems.length} audit warning(s):`);
    for (const problem of problems.slice(0, 12)) console.log(`  - ${problem}`);
  } else {
    console.log("\naudit: clean");
  }
  console.log(`coverage: ${(coverage * 100).toFixed(1)}% of the transcribed span`);

  const fixture = {
    $comment:
      "Generated by scripts/transcribe-demo.mjs from the demo clip with Gemini. Do not hand-edit: re-run the script.",
    source: {
      file: relative(ROOT, MEDIA).replace(/\\/g, "/"),
      sha256: mediaHash,
      bytes: bytes.length,
      license: "CC BY-SA 4.0 — Wikitongues, Anass Sedrati (see public/demo/README.md)",
    },
    generatedAt: new Date().toISOString(),
    model,
    prompt: { id: meta.id ?? "transcribe-captions", version: Number(meta.version ?? 0) },
    usage,
    language: parsed.language ?? "ar",
    durationSec,
    segments,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`\n✓ wrote ${relative(ROOT, OUT).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
});
