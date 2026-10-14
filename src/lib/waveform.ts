/**
 * Waveform pipeline.
 *
 * Peaks are computed once per media file from the real decoded audio
 * (`AudioBuffer`) and then re-bucketed at whatever resolution the timeline asks
 * for. Nothing here draws — that is the canvas layer's job.
 */

/** Max-abs peak per bucket, normalised to 0…1. */
export function peaksFromChannel(channel: Float32Array, buckets: number): Float32Array {
  const peaks = new Float32Array(Math.max(1, buckets));
  if (channel.length === 0) return peaks;

  const bucketSize = channel.length / buckets;
  let globalMax = 0;

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = Math.floor(bucket * bucketSize);
    const to = Math.min(channel.length, Math.floor((bucket + 1) * bucketSize));
    let peak = 0;
    for (let index = from; index < to; index += 1) {
      const value = Math.abs(channel[index] ?? 0);
      if (value > peak) peak = value;
    }
    peaks[bucket] = peak;
    if (peak > globalMax) globalMax = peak;
  }

  // Normalise so quiet recordings still read as a waveform instead of a flat line.
  // Gain is capped so amplified room noise never masquerades as speech energy.
  if (globalMax > 0 && globalMax < 0.7) {
    const gain = Math.min(6, 0.92 / globalMax);
    for (let index = 0; index < peaks.length; index += 1) {
      peaks[index] = Math.min(1, (peaks[index] ?? 0) * gain);
    }
  }

  return peaks;
}

/** Re-buckets a peak array for a different zoom level (max, never average). */
export function resamplePeaks(peaks: Float32Array, buckets: number): Float32Array {
  if (peaks.length === 0) return new Float32Array(buckets);
  if (buckets >= peaks.length) {
    // Zoomed in past the data: interpolate so the line stays smooth.
    const out = new Float32Array(buckets);
    const ratio = (peaks.length - 1) / Math.max(1, buckets - 1);
    for (let index = 0; index < buckets; index += 1) {
      const position = index * ratio;
      const low = Math.floor(position);
      const high = Math.min(peaks.length - 1, low + 1);
      const t = position - low;
      out[index] = (peaks[low] ?? 0) * (1 - t) + (peaks[high] ?? 0) * t;
    }
    return out;
  }
  return peaksFromChannel(peaks, buckets);
}

export type PeakSlice = { peaks: Float32Array; startSec: number; secPerBucket: number };

export function slicePeaks(
  peaks: Float32Array,
  duration: number,
  fromSec: number,
  toSec: number,
  buckets: number,
): PeakSlice {
  const secPerBucket = Math.max(1e-4, (toSec - fromSec) / buckets);
  const secPerSourceBucket = duration / peaks.length;
  const out = new Float32Array(buckets);
  const firstSource = Math.floor(fromSec / secPerSourceBucket);

  let globalMax = 0;
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const ratio = bucket / buckets;
    const sourceIndex = Math.min(
      peaks.length - 1,
      Math.max(0, firstSource + Math.floor(ratio * (toSec - fromSec) / secPerSourceBucket)),
    );
    const value = peaks[sourceIndex] ?? 0;
    out[bucket] = value;
    if (value > globalMax) globalMax = value;
  }

  // Keep the drawn amplitude proportional to what is on screen.
  if (globalMax > 0 && globalMax < 0.35) {
    for (let index = 0; index < out.length; index += 1) {
      out[index] = Math.min(1, (out[index] ?? 0) / globalMax * 0.9);
    }
  }

  return { peaks: out, startSec: fromSec, secPerBucket };
}

/* --------------------------------------------------------- browser side -- */

export type DecodedAudio = { peaks: Float32Array; duration: number; sampleRate: number };

/** Decodes any file the browser can play and returns peaks for the timeline. */
export async function decodeAudioFile(file: Blob, buckets = 4000): Promise<DecodedAudio> {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("Web Audio API is not available in this browser.");

  const context = new AudioCtor();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    // Mono-sum so a stereo file gives one honest waveform.
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    const mono = right ? mixToMono(left, right) : left;
    return {
      peaks: peaksFromChannel(mono, buckets),
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
    };
  } finally {
    void context.close();
  }
}

/**
 * Same decode, but hands back the mono samples as well.
 *
 * The waveform only needs peaks; sound detection needs the samples themselves,
 * and decoding twice for the same file would be wasteful on a long import.
 */
export async function decodeAudioSamples(file: Blob): Promise<DecodedAudio & { samples: Float32Array }> {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("Web Audio API is not available in this browser.");

  const context = new AudioCtor();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    const mono = right ? mixToMono(left, right) : left;
    return {
      samples: mono,
      peaks: peaksFromChannel(mono, 4000),
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
    };
  } finally {
    void context.close();
  }
}

export function mixToMono(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length);
  const out = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    out[index] = ((left[index] ?? 0) + (right[index] ?? 0)) / 2;
  }
  return out;
}

/**
 * Deterministic placeholder peaks so the timeline has honest geometry before a
 * real file is attached (seeded LCG — same project, same picture).
 */
export function placeholderPeaks(duration: number, seed: number, buckets = 1200): Float32Array {
  const peaks = new Float32Array(buckets);
  let state = seed || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let index = 0; index < buckets; index += 1) {
    const time = (index / buckets) * duration;
    // Speech-like envelope: bursts of energy with pauses between phrases.
    const phrase = Math.sin(time * 1.7) * 0.5 + 0.5;
    const syllable = 0.35 + 0.65 * Math.abs(Math.sin(time * 9.3 + next() * 0.4));
    const silence = phrase < 0.22 ? 0.12 : 1;
    peaks[index] = Math.min(1, syllable * phrase * silence + next() * 0.08);
  }
  return peaks;
}
