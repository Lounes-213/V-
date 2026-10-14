/**
 * Sound detection — voice activity, silence and speech runs, computed locally.
 *
 * The audio never leaves the device for this: we look at a mono PCM buffer that
 * the browser already decoded for the waveform, and we classify frames by
 * energy plus zero-crossing rate. Speech is loud *and* low-crossing; a hiss is
 * low-energy or high-crossing; music is loud with a mid crossing rate, which is
 * why the thresholds are three-way rather than a single gate.
 *
 * Everything here is deterministic and frame-based, so the same audio always
 * produces the same cuts — the timeline can depend on it.
 */

export type AudioFrame = {
  /** Seconds from the start of the buffer. */
  start: number;
  end: number;
  /** RMS energy, 0–1. */
  rms: number;
  /**
   * Zero-crossing rate, 0–1: the share of samples where the waveform changes
   * sign. 0 is a constant signal, 1 is a full Nyquist alternation. Speech sits
   * low (most of its energy is under ~3.4 kHz), hiss and cymbals sit high.
   */
  zcr: number;
};

export type VoiceActivityOptions = {
  frameMs?: number;
  /** Frames below this RMS are silence. */
  silenceThreshold?: number;
  /** Frames above this RMS with a low crossing rate are speech. */
  speechThreshold?: number;
  /** Zero-crossing rate above which a loud frame is noise, not a voice. */
  maxSpeechZcr?: number;
  /** Consecutive speech frames required to open a speech run. */
  minSpeechMs?: number;
  /** Speech runs shorter than this are dropped as clicks and breaths. */
  minRunMs?: number;
  /** Silence runs shorter than this are not worth cutting. */
  minSilenceMs?: number;
  /** Padding kept around speech so cuts do not clip the first phoneme. */
  paddingMs?: number;
};

const DEFAULTS: Required<VoiceActivityOptions> = {
  frameMs: 20,
  silenceThreshold: 0.008,
  speechThreshold: 0.02,
  maxSpeechZcr: 0.15,
  minSpeechMs: 80,
  minRunMs: 200,
  minSilenceMs: 320,
  paddingMs: 90,
};

export type SilenceRange = { start: number; end: number; durationSec: number; meanRms: number };
export type SpeechRange = { start: number; end: number; durationSec: number; meanRms: number };

export type SoundAnalysis = {
  durationSec: number;
  frames: AudioFrame[];
  speech: SpeechRange[];
  silences: SilenceRange[];
  /** Speech seconds / total seconds. */
  speechRatio: number;
  /** Longest stretch with no speech, in seconds. */
  longestSilenceSec: number;
  /** Loudest frame, useful to warn about clipping or near-silent mixes. */
  peakRms: number;
  /** True when the track is effectively empty — nothing to transcribe. */
  isSilent: boolean;
};

function rmsOf(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let index = from; index < to; index += 1) {
    const value = samples[index] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / Math.max(1, to - from));
}

function crossingsOf(samples: Float32Array, from: number, to: number): number {
  let crossings = 0;
  for (let index = from + 1; index < to; index += 1) {
    const previous = samples[index - 1] ?? 0;
    const current = samples[index] ?? 0;
    if ((previous <= 0 && current > 0) || (previous >= 0 && current < 0)) crossings += 1;
  }
  return crossings;
}

export function frameAudio(
  samples: Float32Array,
  sampleRate: number,
  options: VoiceActivityOptions = {},
): AudioFrame[] {
  const { frameMs } = { ...DEFAULTS, ...options };
  const frameSamples = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const frames: AudioFrame[] = [];

  for (let offset = 0; offset + frameSamples <= samples.length; offset += frameSamples) {
    const to = offset + frameSamples;
    frames.push({
      start: offset / sampleRate,
      end: to / sampleRate,
      rms: rmsOf(samples, offset, to),
      zcr: crossingsOf(samples, offset, to) / frameSamples,
    });
  }

  return frames;
}

const isSpeechFrame = (frame: AudioFrame, options: Required<VoiceActivityOptions>): boolean =>
  frame.rms >= options.speechThreshold && frame.zcr < options.maxSpeechZcr;

const isSilentFrame = (frame: AudioFrame, options: Required<VoiceActivityOptions>): boolean =>
  frame.rms < options.silenceThreshold;

/** Merges consecutive runs that pass `keep` into ranges in seconds. */
function runs<T extends { start: number; end: number; durationSec: number; meanRms: number }>(
  frames: AudioFrame[],
  keep: (frame: AudioFrame) => boolean,
  minMs: number,
  build: (from: AudioFrame, to: AudioFrame, meanRms: number) => T,
): T[] {
  const out: T[] = [];
  let current: AudioFrame[] = [];

  const flush = () => {
    const first = current[0];
    const last = current[current.length - 1];
    if (first && last) {
      const durationSec = last.end - first.start;
      if (durationSec * 1000 >= minMs) {
        const meanRms = current.reduce((sum, frame) => sum + frame.rms, 0) / current.length;
        out.push(build(first, last, meanRms));
      }
    }
    current = [];
  };

  for (const frame of frames) {
    if (keep(frame)) current.push(frame);
    else flush();
  }
  flush();
  return out;
}

/**
 * Full analysis of one mono channel: speech runs, cuttable silences, and the
 * summary numbers the editor shows next to the waveform.
 */
export function analyzeSound(
  samples: Float32Array,
  sampleRate = 48_000,
  options: VoiceActivityOptions = {},
): SoundAnalysis {
  const frames = frameAudio(samples, sampleRate, options);
  const durationSec = samples.length / sampleRate;

  // Thresholds follow the recording's own level. A phone interview at -18 dBFS
  // and a studio master at -3 dBFS are both speech; fixed cut-offs would call
  // the quiet one silence, which is exactly the bug this avoids.
  const peak = frames.reduce((max, frame) => Math.max(max, frame.rms), 0);
  const isAmbientFloor = peak < 0.001;
  const defaultSilence = isAmbientFloor ? DEFAULTS.silenceThreshold : Math.max(0.0005, peak * 0.08);
  const defaultSpeech = isAmbientFloor ? DEFAULTS.speechThreshold : Math.max(0.001, peak * 0.2);

  const settings: Required<VoiceActivityOptions> = {
    ...DEFAULTS,
    // Only override when the caller did not ask for an explicit number.
    silenceThreshold: options.silenceThreshold ?? defaultSilence,
    speechThreshold: options.speechThreshold ?? defaultSpeech,
    maxSpeechZcr: options.maxSpeechZcr ?? DEFAULTS.maxSpeechZcr,
    ...options,
  };

  if (frames.length === 0) {
    return {
      durationSec,
      frames,
      speech: [],
      silences: [],
      speechRatio: 0,
      longestSilenceSec: 0,
      peakRms: 0,
      isSilent: true,
    };
  }

  const speech = runs<SpeechRange>(
    frames,
    (frame) => isSpeechFrame(frame, settings),
    settings.minRunMs,
    (from, to, meanRms) => ({
      start: Number(from.start.toFixed(3)),
      end: Number(to.end.toFixed(3)),
      durationSec: Number((to.end - from.start).toFixed(3)),
      meanRms: Number(meanRms.toFixed(4)),
    }),
  );

  const silences = runs<SilenceRange>(
    frames,
    (frame) => isSilentFrame(frame, settings),
    settings.minSilenceMs,
    (from, to, meanRms) => ({
      start: Number(from.start.toFixed(3)),
      end: Number(to.end.toFixed(3)),
      durationSec: Number((to.end - from.start).toFixed(3)),
      meanRms: Number(meanRms.toFixed(4)),
    }),
  );

  const speechSeconds = speech.reduce((sum, range) => sum + range.durationSec, 0);

  return {
    durationSec: Number(durationSec.toFixed(3)),
    frames,
    speech,
    silences,
    speechRatio: Number((durationSec > 0 ? speechSeconds / durationSec : 0).toFixed(3)),
    longestSilenceSec: Number(silences.reduce((max, range) => Math.max(max, range.durationSec), 0).toFixed(3)),
    peakRms: Number(peak.toFixed(4)),
    isSilent: peak < settings.silenceThreshold,
  };
}

/**
 * The ranges to *keep*: speech expanded by a padding so nothing is clipped, with
 * frames that fall outside the audio removed. This is what a one-tap "cut the
 * dead air" produces, and it is derived from the audio, not guessed.
 */
export function speechRanges(
  analysis: SoundAnalysis,
  options: VoiceActivityOptions = {},
): { start: number; end: number }[] {
  const { paddingMs } = { ...DEFAULTS, ...options };
  const padding = paddingMs / 1000;

  const padded = analysis.speech.map((range) => ({
    start: Math.max(0, Number((range.start - padding).toFixed(3))),
    end: Math.min(analysis.durationSec, Number((range.end + padding).toFixed(3))),
  }));

  const merged: { start: number; end: number }[] = [];
  for (const range of padded) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }

  return merged;
}

/** Silence gaps between the kept ranges — the complement the editor can cut. */
export function cuttableGaps(
  analysis: SoundAnalysis,
  options: VoiceActivityOptions = {},
): { start: number; end: number; durationSec: number }[] {
  const { minSilenceMs } = { ...DEFAULTS, ...options };
  const keep = speechRanges(analysis, options);
  const gaps: { start: number; end: number; durationSec: number }[] = [];
  let cursor = 0;

  for (const range of keep) {
    if (range.start - cursor > 0) {
      gaps.push({
        start: Number(cursor.toFixed(3)),
        end: Number(range.start.toFixed(3)),
        durationSec: Number((range.start - cursor).toFixed(3)),
      });
    }
    cursor = Math.max(cursor, range.end);
  }

  if (analysis.durationSec - cursor > 0) {
    gaps.push({
      start: Number(cursor.toFixed(3)),
      end: Number(analysis.durationSec.toFixed(3)),
      durationSec: Number((analysis.durationSec - cursor).toFixed(3)),
    });
  }

  return gaps.filter((gap) => gap.durationSec * 1000 >= minSilenceMs);
}
