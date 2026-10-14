"use client";

import { DEFAULT_RULES, buildCueText, detectDirection, groupWordsIntoCues, type Cue } from "./captions";
import { findFont } from "./caption-fonts";
import { outputToSource, totalDuration } from "./timeline";
import type { BackgroundStyle, CaptionPreset, Project, VideoTransform } from "./types";
import { resolveTransform } from "./types";

/**
 * Export pipeline.
 *
 * Frames are drawn on a canvas and captured with `captureStream()` +
 * `MediaRecorder`, which gives us a real, download-and-post-it file with burned
 * captions — including Arabic shaping, because the browser's own text engine
 * shapes the glyphs (canvas `fillText`), not a naive per-character renderer.
 *
 * `WebCodecs` + a muxer would be faster than realtime for long exports; the
 * interface below is deliberately shaped so that path can slot in without
 * touching the UI.
 */

export type ExportFormat = "webm" | "mp4" | "m4a";

export type RenderRequest = {
  project: Project;
  preset: CaptionPreset;
  background: BackgroundStyle;
  format: ExportFormat;
  /** 0 = keep source size, otherwise a target height. */
  targetHeight?: number;
  fps?: number;
  /** Optional decoded media to composite behind the captions. */
  source?: HTMLVideoElement | HTMLImageElement | null;
  onProgress: (percent: number, step: string) => void;
  signal?: AbortSignal;
};

export type RenderResult = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  durationSec: number;
  width: number;
  height: number;
  /** True when the browser fell back to a lower-fidelity capture path. */
  degraded: boolean;
};

const ASPECT: Record<Project["aspect"], [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

export function pickMimeType(format: ExportFormat): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates =
    format === "m4a"
      ? ["audio/mp4", "audio/webm"]
      : format === "mp4"
        ? ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"]
        : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function canRender(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

export async function renderProject(request: RenderRequest): Promise<RenderResult> {
  const { project, preset, background, format, onProgress, signal } = request;
  const fps = request.fps ?? 30;
  const [baseWidth, baseHeight] = ASPECT[project.aspect];
  const scale = request.targetHeight ? request.targetHeight / baseHeight : 1;
  const width = Math.round(baseWidth * scale / 2) * 2;
  const height = Math.round(baseHeight * scale / 2) * 2;

  const mimeType = pickMimeType(format);
  if (!mimeType) throw new Error("UNSUPPORTED_BROWSER");

  const clips = project.clips;
  const duration = totalDuration(clips);
  if (duration <= 0) throw new Error("EMPTY_PROJECT");

  const rules = { ...DEFAULT_RULES, ...project.rules };
  const cues = groupWordsIntoCues(project.words, rules);
  const font = findFont(preset.fontId);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("NO_CANVAS");

  // Make sure the caption font is ready before the first frame is captured.
  await document.fonts?.load(`${preset.weight} 48px ${font.family}`).catch(() => undefined);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrateFor(project, request) });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const started = performance.now();
  recorder.start(250);

  let aborted = false;
  const onAbort = () => {
    aborted = true;
    if (recorder.state !== "inactive") recorder.stop();
  };
  signal?.addEventListener("abort", onAbort);

  try {
    await new Promise<void>((resolve, reject) => {
      const frame = async (now: number) => {
        if (aborted) {
          resolve();
          return;
        }
        const elapsed = (now - started) / 1000;
        if (elapsed >= duration) {
          resolve();
          return;
        }

        try {
          const source = outputToSource(elapsed, clips);
          drawFrame(ctx, {
            width,
            height,
            preset,
            background,
            project,
            cue: cueAt(cues, source ?? 0),
            activeWordId: wordIdAt(project, source ?? 0),
            sourceImage: request.source ?? null,
            sourceTime: source ?? 0,
          });
          onProgress(
            Math.min(99, (elapsed / duration) * 100),
            format === "m4a" ? "encoding-audio" : "encoding-video",
          );
        } catch (error) {
          reject(error);
          return;
        }

        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    });
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
  }

  if (aborted) throw new DOMException("Aborted", "AbortError");

  onProgress(100, "finalising");

  const extension = mimeType.startsWith("audio") ? "m4a" : mimeType.includes("mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mimeType });

  return {
    blob,
    fileName: `${project.name.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "dz-studio"}-export.${extension}`,
    mimeType,
    durationSec: duration,
    width,
    height,
    degraded: !mimeType.includes("vp9") && !mimeType.includes("avc1"),
  };
}

function bitrateFor(project: Project, request: RenderRequest): number {
  const [width, height] = ASPECT[project.aspect];
  const pixels = width * height * (request.targetHeight ? (request.targetHeight / height) ** 2 : 1);
  const perPixel = request.project.status === "exported" ? 0.08 : 0.1;
  return Math.round(Math.min(16_000_000, Math.max(2_000_000, pixels * perPixel)));
}

function cueAt(cues: Cue[], sourceTime: number): Cue | undefined {
  return cues.find((cue) => sourceTime >= cue.start && sourceTime <= cue.end);
}

function wordIdAt(project: Project, sourceTime: number): string | null {
  const word = project.words.find(
    (candidate) => !candidate.deleted && sourceTime >= candidate.start && sourceTime <= candidate.end,
  );
  return word?.id ?? null;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  options: {
    width: number;
    height: number;
    preset: CaptionPreset;
    background: BackgroundStyle;
    project: Project;
    cue?: Cue;
    activeWordId?: string | null;
    sourceImage?: HTMLVideoElement | HTMLImageElement | null;
    sourceTime?: number;
  },
): void {
  const { width, height, preset, background, project, cue, activeWordId, sourceImage, sourceTime } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0B0F14";
  ctx.fillRect(0, 0, width, height);

  if (sourceImage && isDrawable(sourceImage)) {
    // The transform belongs to whichever clip covers this source moment.
    const at = sourceTime ?? 0;
    const activeClip = project.clips.find(
      (clip) => at >= clip.sourceIn && at <= clip.sourceOut,
    );
    drawCover(ctx, sourceImage, width, height, background, activeClip?.transform);
  } else {
    // No media attached: a calm brand backdrop so the burned captions read as intended.
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, background.gradientFrom);
    gradient.addColorStop(1, background.gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (background.footerBar) {
    ctx.fillStyle = "rgba(11,15,20,0.72)";
    ctx.fillRect(0, height * (1 - background.footerHeight / 100), width, height * (background.footerHeight / 100));
  }

  const font = findFont(preset.fontId);
  const direction = cue ? detectDirection(cue.text) : "ltr";
  const text = cue ? buildCueText(cue.words, { ...DEFAULT_RULES, ...project.rules }) : "";
  const lines = text.split("\n");

  const fontSize = (preset.size / 62) * (height / 19.2) * (direction === "rtl" ? 1.02 : 1);
  const lineHeight = fontSize * (preset.lineHeight + (font.lineHeightBonus ?? 0));

  ctx.font = `${preset.weight} ${fontSize}px ${font.family}, ${direction === "rtl" ? "Cairo" : "Inter"}, sans-serif`;
  ctx.textAlign = preset.alignment === "start" ? "start" : preset.alignment === "end" ? "end" : "center";
  ctx.textBaseline = "alphabetic";
  ctx.direction = direction;
  ctx.letterSpacing = `${preset.letterSpacing * fontSize}px`;

  const anchorX =
    preset.alignment === "start"
      ? width * 0.06
      : preset.alignment === "end"
        ? width * 0.94
        : width / 2;
  const baseY =
    preset.position === "top"
      ? height * 0.16 - preset.offsetY * height
      : preset.position === "middle"
        ? height * 0.5 - preset.offsetY * height
        : height * 0.82 - preset.offsetY * height;

  // Background plate behind the whole block.
  if (preset.background !== "none") {
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    const plateWidth = Math.min(width * (preset.maxWidth / 100), widest + preset.padding * 2 + fontSize * 0.6);
    const plateHeight = lines.length * lineHeight + preset.padding * 1.4;
    const plateX =
      preset.alignment === "start"
        ? anchorX - preset.padding * 0.6
        : preset.alignment === "end"
          ? anchorX - plateWidth + preset.padding * 0.6
          : anchorX - plateWidth / 2;

    ctx.save();
    ctx.fillStyle =
      preset.background === "blur"
        ? "rgba(11,15,20,0.34)"
        : `rgba(11,15,20,${preset.backgroundOpacity})`;
    roundRect(ctx, plateX, baseY - lineHeight * 0.78 - (lines.length - 1) * lineHeight - preset.padding * 0.4, plateWidth, plateHeight, preset.radius);
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, lineIndex) => {
    const y = baseY - (lines.length - 1 - lineIndex) * lineHeight;
    const tokens = line.split(" ");

    if (preset.highlightActiveWord && activeWordId) {
      // Draw token by token so the spoken word can take the highlight colour.
      const totalWidth = ctx.measureText(line).width;
      let cursorX =
        preset.alignment === "start"
          ? anchorX
          : preset.alignment === "end"
            ? anchorX - totalWidth
            : anchorX - totalWidth / 2;

      for (const token of tokens) {
        const word = cue?.words.find((candidate) => candidate.text === token);
        const active = word?.id === activeWordId;
        ctx.save();
        ctx.textAlign = "start";
        if (active) {
          ctx.font = `${preset.weight} ${fontSize * preset.emphasisScale}px ${font.family}, sans-serif`;
          ctx.fillStyle = preset.highlightColor;
        } else {
          ctx.fillStyle = preset.color;
        }
        paintText(ctx, token, cursorX, y, preset);
        cursorX += ctx.measureText(token).width + ctx.measureText(" ").width;
        ctx.restore();
      }
      return;
    }

    ctx.save();
    ctx.fillStyle = preset.color;
    paintText(ctx, line, anchorX, y, preset);
    ctx.restore();
  });

  if (background.watermark && background.watermarkText) {
    ctx.save();
    ctx.globalAlpha = background.watermarkOpacity;
    ctx.font = `600 ${Math.round(height * 0.022)}px Inter, sans-serif`;
    ctx.fillStyle = "#E8EDF4";
    ctx.textAlign = "end";
    ctx.direction = "ltr";
    ctx.fillText(background.watermarkText, width * 0.94, height * 0.965);
    ctx.restore();
  }

  ctx.restore();
}

/** Outline first, then fill, so heavy weights never lose their edge. */
function paintText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  preset: CaptionPreset,
) {
  if (preset.outlineWidth > 0) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = (preset.outlineWidth * ctx.canvas.height) / 600;
    ctx.strokeStyle = "rgba(4,10,7,0.9)";
    ctx.strokeText(text, x, y);
  }
  if (preset.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = ctx.canvas.height * 0.012;
    ctx.shadowOffsetY = ctx.canvas.height * 0.003;
  }
  ctx.fillText(text, x, y);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function isDrawable(element: HTMLVideoElement | HTMLImageElement): boolean {
  if ("readyState" in element) return element.readyState >= 2 && element.videoWidth > 0;
  return element.complete && element.naturalWidth > 0;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLVideoElement | HTMLImageElement,
  width: number,
  height: number,
  background: BackgroundStyle,
  transform?: VideoTransform,
) {
  const sourceWidth = "videoWidth" in image ? image.videoWidth : image.naturalWidth;
  const sourceHeight = "videoHeight" in image ? image.videoHeight : image.naturalHeight;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  if (background.kind === "blur" && background.blur > 0) {
    // Blurred fill of the same frame behind the letterboxed picture.
    ctx.save();
    ctx.filter = `blur(${(background.blur * ctx.canvas.height) / 900}px)`;
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.restore();
    ctx.drawImage(
      image,
      (width - sourceWidth * (height / sourceHeight)) / 2,
      0,
      sourceWidth * (height / sourceHeight),
      height,
    );
    return;
  }

  applyTransform(ctx, transform, width, height, () => {
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  });
}

/**
 * Applies the CapCut-style clip transform (scale 0.2–3, offsets in % of frame,
 * rotation, flips) around a draw callback, so preview and export share one
 * interpretation of the values.
 */
export function applyTransform(
  ctx: CanvasRenderingContext2D,
  value: VideoTransform | undefined,
  width: number,
  height: number,
  draw: () => void,
): void {
  const transform = resolveTransform(value);
  if (transform.scale === 1 && transform.x === 0 && transform.y === 0 && transform.rotation === 0 && !transform.flipH && !transform.flipV) {
    draw();
    return;
  }

  ctx.save();
  ctx.translate(width / 2 + (transform.x / 100) * width, height / 2 + (transform.y / 100) * height);
  if (transform.rotation !== 0) ctx.rotate((transform.rotation * Math.PI) / 180);
  const flipX = transform.flipH ? -1 : 1;
  const flipY = transform.flipV ? -1 : 1;
  ctx.scale(transform.scale * flipX, transform.scale * flipY);
  ctx.translate(-width / 2, -height / 2);
  draw();
  ctx.restore();
}

/** PNG of one frame — used for project cards and share previews. */
export function snapshotFrame(
  options: Parameters<typeof drawFrame>[1],
): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  drawFrame(ctx, options);
  return canvas.toDataURL("image/jpeg", 0.82);
}
