import type { Project } from "./types";

/**
 * Retimes every timeline artefact in a project so the whole edit matches a real
 * media duration.
 *
 * Why this exists: transcripts, clips, Quran matches and suggestions are all
 * timed against a duration. When the real bytes show up (the decoded file, not
 * an assumption) that duration becomes the source of truth and everything else
 * has to follow it, proportionally and without losing relative order.
 *
 * Times are rounded to milliseconds — the same precision the rest of the
 * timeline uses — and the result is guaranteed monotonic per artefact.
 */
export function retimeProject(project: Project, durationSec: number): Project {
  const from = project.durationSec;
  if (!Number.isFinite(durationSec) || durationSec <= 0) return project;
  if (!Number.isFinite(from) || from <= 0) return { ...project, durationSec };
  if (Math.abs(from - durationSec) < 0.01) return project;

  const scale = durationSec / from;
  const at = (seconds: number) => Number((seconds * scale).toFixed(3));

  return {
    ...project,
    durationSec,
    words: project.words.map((word) => ({
      ...word,
      start: at(word.start),
      end: Math.max(at(word.start), at(word.end)),
    })),
    clips: project.clips.map((clip) => ({
      ...clip,
      sourceIn: at(clip.sourceIn),
      // Clip bounds stay ordered and never run past the end of the media.
      sourceOut: Math.min(durationSec, Math.max(at(clip.sourceIn), at(clip.sourceOut))),
    })),
    suggestions: project.suggestions.map((suggestion) => ({
      ...suggestion,
      start: at(suggestion.start),
      end: Math.max(at(suggestion.start), at(suggestion.end)),
    })),
    quran: project.quran.map((match) => ({
      ...match,
      start: at(match.start),
      end: Math.max(at(match.start), at(match.end)),
    })),
  };
}

/**
 * True when a project's timings are worth re-fitting: either it has no media
 * timing at all yet, or it drifts more than 5% (about a frame and a half of
 * budget at 30fps) from the real file.
 */
export function needsRetime(project: Project, durationSec: number): boolean {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return false;
  if (!Number.isFinite(project.durationSec) || project.durationSec <= 0) return true;
  return Math.abs(project.durationSec - durationSec) / durationSec > 0.05;
}
