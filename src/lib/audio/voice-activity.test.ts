import { describe, expect, it } from "vitest";
import { analyzeSound, cuttableGaps, frameAudio, speechRanges } from "./voice-activity";

const RATE = 48_000;

/** Deterministic speech-ish tone: loud, few crossings, amplitude modulated. */
function speech(seconds: number, amplitude = 0.35, frequency = 180): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let index = 0; index < out.length; index += 1) {
    const t = index / RATE;
    const wobble = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4 * t);
    out[index] = amplitude * wobble * Math.sin(2 * Math.PI * frequency * t);
  }
  return out;
}

function silence(seconds: number, noise = 0.0005): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let index = 0; index < out.length; index += 1) {
    // Deterministic low-level noise floor, not random, so runs are reproducible.
    out[index] = noise * Math.sin(index * 0.7);
  }
  return out;
}

function hiss(seconds: number, amplitude = 0.2): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let index = 0; index < out.length; index += 1) {
    out[index] = amplitude * Math.sin(index * 2.1);
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

describe("frameAudio", () => {
  it("frames the buffer at the requested size", () => {
    const frames = frameAudio(speech(1), RATE, { frameMs: 20 });
    expect(frames).toHaveLength(50);
    expect(frames[1]!.start).toBeCloseTo(0.02, 3);
    expect(frames[1]!.end).toBeCloseTo(0.04, 3);
  });

  it("returns nothing for a buffer shorter than one frame", () => {
    expect(frameAudio(new Float32Array(10), RATE)).toEqual([]);
  });
});

describe("analyzeSound", () => {
  it("finds a speech run in the middle of silence", () => {
    const audio = join([silence(1), speech(2), silence(1)]);
    const analysis = analyzeSound(audio, RATE);

    expect(analysis.speech).toHaveLength(1);
    expect(analysis.speech[0]!.start).toBeGreaterThan(0.85);
    expect(analysis.speech[0]!.end).toBeLessThan(3.15);
    expect(analysis.speech[0]!.durationSec).toBeGreaterThan(1.6);
  });

  it("reports a speech ratio that matches the audio", () => {
    const analysis = analyzeSound(join([speech(3), silence(1)]), RATE);
    expect(analysis.speechRatio).toBeGreaterThan(0.6);
    expect(analysis.speechRatio).toBeLessThan(0.9);
  });

  it("measures the longest silence", () => {
    const analysis = analyzeSound(join([speech(1), silence(3), speech(1), silence(0.5)]), RATE);
    expect(analysis.longestSilenceSec).toBeGreaterThan(2.5);
  });

  it("calls an empty track silent", () => {
    const analysis = analyzeSound(silence(3), RATE);
    expect(analysis.isSilent).toBe(true);
    expect(analysis.speech).toHaveLength(0);
  });

  it("does not call steady hiss speech", () => {
    const analysis = analyzeSound(hiss(3), RATE);
    expect(analysis.speech).toHaveLength(0);
    expect(analysis.isSilent).toBe(false);
  });

  it("drops runs too short to be words", () => {
    const analysis = analyzeSound(join([silence(1), speech(0.05), silence(1)]), RATE);
    expect(analysis.speech).toHaveLength(0);
  });

  it("handles an empty buffer without throwing", () => {
    const analysis = analyzeSound(new Float32Array(0), RATE);
    expect(analysis.isSilent).toBe(true);
    expect(analysis.frames).toEqual([]);
    expect(analysis.speechRatio).toBe(0);
  });

  it("scales the numbers to the frame size it is given", () => {
    const audio = join([silence(1), speech(2), silence(1)]);
    const coarse = analyzeSound(audio, RATE, { frameMs: 50 });
    const fine = analyzeSound(audio, RATE, { frameMs: 10 });
    expect(coarse.speech[0]!.start).toBeCloseTo(fine.speech[0]!.start, 0);
  });
});

describe("speechRanges", () => {
  it("keeps padding around speech and merges overlaps", () => {
    const audio = join([silence(1), speech(1), silence(0.1), speech(1), silence(1)]);
    const analysis = analyzeSound(audio, RATE);
    const keep = speechRanges(analysis, { paddingMs: 200 });

    expect(keep).toHaveLength(1);
    expect(keep[0]!.start).toBeLessThanOrEqual(0.85);
    expect(keep[0]!.end).toBeGreaterThanOrEqual(3.15);
  });

  it("never runs outside the audio", () => {
    const analysis = analyzeSound(join([speech(1), silence(1)]), RATE);
    for (const range of speechRanges(analysis, { paddingMs: 500 })) {
      expect(range.start).toBeGreaterThanOrEqual(0);
      expect(range.end).toBeLessThanOrEqual(analysis.durationSec);
    }
  });

  it("returns nothing when there is no speech", () => {
    expect(speechRanges(analyzeSound(silence(2), RATE))).toEqual([]);
  });
});

describe("cuttableGaps", () => {
  it("lists the dead air between speech runs", () => {
    const audio = join([silence(1), speech(1.5), silence(1.5), speech(1.5), silence(1)]);
    const gaps = cuttableGaps(analyzeSound(audio, RATE));

    expect(gaps.length).toBeGreaterThanOrEqual(3);
    expect(gaps[0]!.start).toBe(0);
    for (const gap of gaps) {
      expect(gap.durationSec).toBeGreaterThanOrEqual(0.32);
    }
  });

  it("never overlaps the speech it keeps", () => {
    const audio = join([silence(0.8), speech(1), silence(0.9), speech(1), silence(0.8)]);
    const analysis = analyzeSound(audio, RATE);
    const keep = speechRanges(analysis);
    const gaps = cuttableGaps(analysis);

    for (const gap of gaps) {
      for (const range of keep) {
        expect(gap.end <= range.start + 0.001 || gap.start >= range.end - 0.001).toBe(true);
      }
    }
  });

  it("finds nothing to cut in continuous speech", () => {
    expect(cuttableGaps(analyzeSound(speech(3), RATE))).toEqual([]);
  });
});
