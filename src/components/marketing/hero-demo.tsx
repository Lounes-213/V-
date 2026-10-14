"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Captions, Sparkles, Trash2, Wand2 } from "lucide-react";
import { placeholderPeaks } from "@/lib/waveform";
import { cn } from "@/lib/cn";

/**
 * The hero loop. It shows the actual product action — a word is struck out and
 * the timeline physically shortens — rather than a generic video mockup.
 *
 * Frame work is done on a canvas (peaks + playhead); the caption text only
 * re-renders when the active word changes, so the animation stays cheap on a
 * landing page that also has to hit a Lighthouse budget.
 */
const CUE = ["الحمد", "لله،", "اليوم", "نشرحو", "كيفاش", "نقصّو", "فيديو", "بكلمة", "وحدة."];
const CUT_AT = 4; // index of the word the demo removes
const SCRIPT_DURATION = 6.4;
const HOLD_AFTER_CUT = 2.2;

export function HeroDemo() {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"playing" | "cutting" | "cut">(() => (reduce ? "cut" : "playing"));
  const [activeWord, setActiveWord] = useState(0);
  const peaks = useRef<Float32Array>(placeholderPeaks(SCRIPT_DURATION, 12, 640));

  // Reduced motion can flip after mount (OS setting, or the preference loads
  // late), so mirror it into the phase during render.
  const [lastReduce, setLastReduce] = useState(reduce);
  if (reduce !== lastReduce) {
    setLastReduce(reduce);
    setPhase(reduce ? "cut" : "playing");
  }

  useEffect(() => {
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let raf = 0;
    let start = performance.now();
    let lastWord = -1;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const elapsed = ((now - start) / 1000) % (SCRIPT_DURATION + HOLD_AFTER_CUT);
      const cut = elapsed >= SCRIPT_DURATION;

      if (cut !== (phase === "cut")) setPhase(cut ? "cut" : "playing");
      else if (!cut && elapsed > SCRIPT_DURATION - 0.7 && phase !== "cutting") setPhase("cutting");
      else if (!cut && elapsed < SCRIPT_DURATION - 0.7 && phase !== "playing") setPhase("playing");

      const wordIndex = Math.min(
        CUE.length - 1,
        Math.floor((elapsed / SCRIPT_DURATION) * CUE.length),
      );
      if (wordIndex !== lastWord) {
        lastWord = wordIndex;
        setActiveWord(wordIndex);
      }
      if (elapsed >= SCRIPT_DURATION) start = now - SCRIPT_DURATION * 1000;

      context.clearRect(0, 0, width, height);

      // Progress through the (already shortened) programme.
      const progress = cut ? 1 : elapsed / SCRIPT_DURATION;
      const cutShare = 1 / CUE.length;
      const total = 1 - cutShare * (cut ? 1 : 0);
      const playhead = progress * total * width;

      const data = peaks.current;
      const bars = 128;
      const barWidth = width / bars;
      const mid = height / 2;

      for (let index = 0; index < bars; index += 1) {
        const ratio = index / bars;
        const value = data[Math.floor(ratio * data.length)] ?? 0;
        const amplitude = Math.max(2, value * (height * 0.44));
        // The removed word's slice collapses as the cut lands.
        const inCut = ratio > CUT_AT * cutShare && ratio < (CUT_AT + 1) * cutShare;
        const collapsed = inCut && cut;
        const x = index * barWidth + barWidth * 0.5;

        if (inCut && !collapsed) {
          context.fillStyle = "rgba(240, 80, 110, 0.45)";
        } else if (collapsed) {
          context.fillStyle = "rgba(232, 237, 244, 0.12)";
        } else {
          context.fillStyle =
            x <= playhead ? "rgba(25, 195, 125, 0.85)" : "rgba(139, 151, 168, 0.34)";
        }

        context.fillRect(x - barWidth * 0.3, mid - amplitude, barWidth * 0.6, amplitude * 2);
      }

      context.strokeStyle = "rgba(232, 176, 75, 0.95)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(playhead, 6);
      context.lineTo(playhead, height - 6);
      context.stroke();
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce, phase]);

  const striking = phase === "cutting" || phase === "cut";

  return (
    <div className="panel relative overflow-hidden">
      <div
        aria-hidden
        className="grid-backdrop pointer-events-none absolute inset-0 opacity-70"
      />

      {/* Preview stage */}
      <div className="relative flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative mx-auto aspect-[9/16] w-[42%] max-w-[9.5rem] shrink-0 overflow-hidden rounded-lg border border-border bg-ink sm:w-[38%]">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,rgb(25_195_125/0.18),transparent_60%)]" />
          {/* Frame content: an abstract shot of the speaker's b-roll */}
          <div className="absolute inset-x-3 top-6 space-y-1.5">
            <div className="h-1.5 w-2/3 rounded-full bg-raised" />
            <div className="h-1.5 w-1/2 rounded-full bg-raised" />
          </div>

          <div className="absolute inset-x-2 bottom-3">
            <div
              dir="rtl"
              className="rounded-md border border-white/10 bg-black/45 px-2 py-1.5 text-center text-[11px] leading-relaxed text-white backdrop-blur-sm"
              style={{ fontFamily: '"Cairo", sans-serif' }}
            >
              {CUE.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className={cn(
                    "transition-colors duration-200",
                    index === activeWord && !striking && "text-primary",
                    index === CUT_AT && striking && "text-danger line-through opacity-50",
                  )}
                >
                  {word}
                  {index < CUE.length - 1 ? " " : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute inset-x-2 top-2 flex items-center justify-between">
            <span className="num-tabular rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-[9px] text-white/85">
              0:0{Math.min(9, Math.max(1, Math.round((activeWord / CUE.length) * 6 + 1)))}
            </span>
            <span className="rounded-sm bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white/85">
              9:16
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {/* Transcript strip */}
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-ink/60 p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-subtle uppercase">
              <Captions aria-hidden className="size-3" />
              {t("featureTextTitle")}
            </p>
            <p
              dir="rtl"
              className="text-right text-[13px] leading-[2] text-muted"
              style={{ fontFamily: '"Cairo", sans-serif' }}
            >
              {CUE.map((word, index) => (
                <span
                  key={`script-${word}-${index}`}
                  className={cn(
                    "inline-block rounded-sm px-0.5 transition-all duration-300",
                    index === activeWord && "bg-primary-soft text-fg",
                    index === CUT_AT && striking && "text-danger/70 line-through",
                  )}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>

          {/* Waveform row */}
          <div className="relative h-16 overflow-hidden rounded-lg border border-border bg-ink/60 px-2">
            <canvas ref={canvasRef} className="size-full" aria-hidden />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors",
                striking
                  ? "border-danger/40 bg-danger-soft text-danger"
                  : "border-primary/35 bg-primary-soft text-primary",
              )}
            >
              {striking ? <Trash2 aria-hidden className="size-3" /> : <Wand2 aria-hidden className="size-3" />}
              {striking ? t("demoWordDeleted") : t("featureTextDesc").split(".")[0]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold-soft px-2 py-1 text-[10px] font-medium text-gold">
              <Sparkles aria-hidden className="size-3" />
              {t("proofLanguages")}
            </span>
          </div>
        </div>
      </div>

      <p className="num-tabular sr-only" aria-live="off">
        {phase === "cut" ? t("demoWordDeleted") : CUE[activeWord]}
      </p>
    </div>
  );
}
