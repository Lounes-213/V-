import { describe, expect, it } from "vitest";
import { mixToMono, peaksFromChannel, placeholderPeaks, resamplePeaks, slicePeaks } from "./waveform";

function ramp(length: number, peak = 1): Float32Array {
  const out = new Float32Array(length);
  for (let index = 0; index < length; index += 1) out[index] = (index / length) * peak;
  return out;
}

describe("peaksFromChannel", () => {
  it("returns one peak per bucket", () => {
    expect(peaksFromChannel(ramp(1000), 100)).toHaveLength(100);
  });

  it("takes the maximum, not the average", () => {
    const data = new Float32Array([0, 0, 1, 0, 0, 0, 0, 0]);
    const peaks = peaksFromChannel(data, 2);
    expect(peaks[0]).toBeCloseTo(1);
    expect(peaks[1]).toBeCloseTo(0);
  });

  it("handles an empty channel", () => {
    const peaks = peaksFromChannel(new Float32Array(0), 8);
    expect(peaks).toHaveLength(8);
    expect(peaks.every((value) => value === 0)).toBe(true);
  });

  it("always produces at least one bucket", () => {
    expect(peaksFromChannel(ramp(10), 0)).toHaveLength(1);
  });

  it("normalises quiet recordings upward", () => {
    const peaks = peaksFromChannel(ramp(1000, 0.1), 10);
    expect(Math.max(...peaks)).toBeGreaterThan(0.5);
  });

  it("never exceeds 1", () => {
    const peaks = peaksFromChannel(ramp(1000, 1), 20);
    expect(Math.max(...peaks)).toBeLessThanOrEqual(1);
  });
});

describe("resamplePeaks", () => {
  const source = peaksFromChannel(ramp(2000), 200);

  it("downsamples to fewer buckets", () => {
    expect(resamplePeaks(source, 50)).toHaveLength(50);
  });

  it("interpolates when zooming past the data", () => {
    const zoomed = resamplePeaks(source, 800);
    expect(zoomed).toHaveLength(800);
    expect(Math.max(...zoomed)).toBeLessThanOrEqual(1);
  });

  it("copes with an empty source", () => {
    expect(resamplePeaks(new Float32Array(0), 12)).toHaveLength(12);
  });
});

describe("slicePeaks", () => {
  it("extracts the requested window", () => {
    const peaks = peaksFromChannel(ramp(4000), 1000);
    const slice = slicePeaks(peaks, 100, 20, 40, 200);
    expect(slice.peaks).toHaveLength(200);
    expect(slice.startSec).toBeCloseTo(20);
    expect(slice.secPerBucket).toBeCloseTo(0.1);
  });

  it("stays inside the source array", () => {
    const peaks = peaksFromChannel(ramp(1000), 500);
    const slice = slicePeaks(peaks, 10, 9.9, 10, 64);
    expect(slice.peaks.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});

describe("mixToMono", () => {
  it("averages two channels", () => {
    const mono = mixToMono(new Float32Array([1, 0]), new Float32Array([0, 1]));
    expect(Array.from(mono)).toEqual([0.5, 0.5]);
  });

  it("uses the shorter channel", () => {
    expect(mixToMono(new Float32Array([1, 1, 1]), new Float32Array([1]))).toHaveLength(1);
  });
});

describe("placeholderPeaks", () => {
  it("is deterministic for a given seed", () => {
    const a = placeholderPeaks(42, 7, 100);
    const b = placeholderPeaks(42, 7, 100);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("differs between projects", () => {
    const a = placeholderPeaks(42, 7, 100);
    const b = placeholderPeaks(42, 99, 100);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it("stays in range", () => {
    const peaks = placeholderPeaks(60, 3, 500);
    expect(peaks.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});
