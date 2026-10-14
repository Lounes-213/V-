import { describe, expect, it } from "vitest";
import { analyzeSound, cuttableGaps } from "./voice-activity";

const RATE = 48_000;

/**
 * The bug this guards: an interview recorded quietly (phone at arm's length,
 * -30 dBFS peaks) used to be reported as mostly silence, because the speech
 * threshold was an absolute RMS value. A 5-minute recording showed "21% speech"
 * while it was in fact continuous talking.
 *
 * The detector now derives its thresholds from the recording's own peak, so the
 * same audio is classified the same way at any level.
 */
function speechAt(amplitude: number, seconds: number, frequency = 165): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let index = 0; index < out.length; index += 1) {
    const t = index / RATE;
    const wobble = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3 * t);
    out[index] = amplitude * wobble * Math.sin(2 * Math.PI * frequency * t);
  }
  return out;
}

function quietNoise(amplitude: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let index = 0; index < out.length; index += 1) {
    out[index] = amplitude * Math.sin(index * 1.7);
  }
  return out;
}

function join(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

describe("level independence", () => {
  it("reports the same speech ratio for the same performance at any level", () => {
    const loud = analyzeSound(join([speechAt(0.6, 4), quietNoise(0.0004, 1)]), RATE);
    const quiet = analyzeSound(join([speechAt(0.04, 4), quietNoise(0.0004, 1)]), RATE);
    const veryQuiet = analyzeSound(join([speechAt(0.012, 4), quietNoise(0.0002, 1)]), RATE);

    expect(loud.speechRatio).toBeGreaterThan(0.7);
    expect(quiet.speechRatio).toBeGreaterThan(0.7);
    expect(veryQuiet.speechRatio).toBeGreaterThan(0.7);
    expect(Math.abs(loud.speechRatio - quiet.speechRatio)).toBeLessThan(0.12);
    expect(Math.abs(quiet.speechRatio - veryQuiet.speechRatio)).toBeLessThan(0.12);
  });

  it("still finds the pauses between quiet speech runs", () => {
    const audio = join([speechAt(0.03, 2), quietNoise(0.0003, 1.4), speechAt(0.03, 2)]);
    const analysis = analyzeSound(audio);

    expect(analysis.speech).toHaveLength(2);
    expect(analysis.longestSilenceSec).toBeGreaterThan(0.9);
    expect(cuttableGaps(analysis).length).toBeGreaterThanOrEqual(1);
  });

  it("does not mistake a quiet recording for silence", () => {
    const analysis = analyzeSound(speechAt(0.01, 3), RATE);
    expect(analysis.isSilent).toBe(false);
    expect(analysis.speech.length).toBeGreaterThan(0);
  });

  it("still calls a genuinely empty track silent", () => {
    const analysis = analyzeSound(quietNoise(0.0002, 2), RATE);
    expect(analysis.isSilent).toBe(true);
    expect(analysis.speech).toEqual([]);
  });

  it("honours explicit thresholds when a caller sets them", () => {
    const audio = join([speechAt(0.5, 2), quietNoise(0.0003, 1)]);
    const strict = analyzeSound(audio, RATE, { speechThreshold: 0.9 });
    const relaxed = analyzeSound(audio, RATE, { speechThreshold: 0.01 });

    expect(strict.speech).toHaveLength(0);
    expect(relaxed.speech).toHaveLength(1);
  });
});
