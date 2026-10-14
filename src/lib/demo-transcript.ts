import fixture from "./fixtures/demo-transcript.json";
import type { Word } from "./types";

/**
 * The demo project's transcript — produced by Gemini from the bundled clip with
 * the prompt in `prompts/transcribe-captions.md`, then committed as a fixture.
 *
 * It is real speech: an Algerian speaker from Oran talking about a photography
 * club, switching into French mid-sentence the way people actually do. That is
 * what makes the captions, the timings and the Quran matcher honest — nothing
 * here was typed by a human to look plausible.
 *
 * Regenerate with: node scripts/transcribe-demo.mjs
 */
export type DemoTranscriptSource = {
  file: string;
  sha256: string;
  bytes: number;
  license: string;
};

export type DemoTranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words: { text: string; start: number; end: number }[];
};

export type DemoTranscript = {
  source: DemoTranscriptSource;
  generatedAt: string;
  model: string;
  prompt: { id: string; version: number };
  language: string;
  durationSec: number;
  segments: DemoTranscriptSegment[];
};

export const demoTranscript = fixture as unknown as DemoTranscript;

/** Flattens the fixture into the editor's word model, preserving real timings. */
export function demoTranscriptWords(): Word[] {
  const words: Word[] = [];
  let index = 0;

  for (const segment of demoTranscript.segments) {
    for (const word of segment.words) {
      const text = word.text.trim();
      if (!text) continue;
      words.push({
        id: `w${String(index).padStart(3, "0")}`,
        text,
        start: word.start,
        end: Math.max(word.start + 0.05, word.end),
        speaker: 0,
      });
      index += 1;
    }
  }

  return words;
}

/** Duration of the real clip: the last word plus a short tail. */
export function demoTranscriptDuration(words: Word[]): number {
  const last = words[words.length - 1];
  return Number(((last?.end ?? 0) + 0.8).toFixed(2));
}

/** Provenance for the UI: which model, which prompt, which licence. */
export function demoTranscriptProvenance() {
  return {
    model: demoTranscript.model,
    prompt: `${demoTranscript.prompt.id} v${demoTranscript.prompt.version}`,
    generatedAt: demoTranscript.generatedAt,
    language: demoTranscript.language,
    license: demoTranscript.source.license,
    sourceFile: demoTranscript.source.file,
  };
}

export function hasDemoTranscript(): boolean {
  return demoTranscript.segments.length > 0 && demoTranscriptWords().length > 0;
}
