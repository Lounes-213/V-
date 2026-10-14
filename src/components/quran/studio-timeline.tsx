"use client";

import * as React from "react";

/**
 * The editing timeline for the Quran studio: a CapCut-shaped ruler with the
 * recitation on it, but built around what actually drives this screen — words
 * with real timings.
 *
 * Three tracks, top to bottom:
 *  • ruler + playhead (click anywhere to seek, drag to scrub)
 *  • loudness waveform of the recitation itself
 *  • one chip per word, clickable to jump straight to it
 *
 * Time always runs left→right, even in Arabic: a timeline that flipped with the
 * locale would put "later" on the left and make every scrub backwards. Only the
 * Arabic *text inside* the chips is RTL.
 */

export type TimelineWord = { text: string; start: number; end: number; ayah?: number };
export type TimelineLoop = { start: number; end: number } | null;

type Props = {
  words: TimelineWord[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  loop: TimelineLoop;
  /** Normalised 0–1 loudness per bucket. Falls back to word density. */
  envelope?: number[];
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onLoopChange: (loop: TimelineLoop) => void;
};

const MIN_PPS = 3;
const MAX_PPS = 900;
const RULER_TARGET_PX = 82;
const TICK_STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

function timecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function niceStep(secondsPerTarget: number): number {
  for (const step of TICK_STEPS) if (step >= secondsPerTarget) return step;
  return TICK_STEPS[TICK_STEPS.length - 1]!;
}

/** Loudness buckets derived from word spans, used when there is no analysis. */
function envelopeFromWords(words: TimelineWord[], duration: number, buckets = 240): number[] {
  const out = new Array<number>(buckets).fill(0);
  if (!duration) return out;
  const size = duration / buckets;
  for (const word of words) {
    const from = Math.max(0, Math.floor(word.start / size));
    const to = Math.min(buckets - 1, Math.floor(Math.max(word.start + 0.001, word.end) / size));
    for (let i = from; i <= to; i += 1) out[i] = Math.min(1, (out[i] ?? 0) + 0.55);
  }
  return out;
}

export function StudioTimeline({
  words,
  duration,
  currentTime,
  isPlaying,
  loop,
  envelope,
  onSeek,
  onTogglePlay,
  onLoopChange,
}: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [manualPps, setManualPps] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);

  /* ------------------------------------------------------------- scaling -- */

  React.useEffect(() => {
    const node = scrollerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setViewportWidth(width);
    });
    observer.observe(node);
    setViewportWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const safeDuration = duration > 0 ? duration : 0.001;
  const fitPps = viewportWidth > 0 ? viewportWidth / safeDuration : 0;
  const pps = Math.min(MAX_PPS, Math.max(MIN_PPS, manualPps ?? (fitPps || MIN_PPS)));
  const zoom = fitPps > 0 ? pps / fitPps : 1;
  const trackWidth = Math.max(viewportWidth, safeDuration * pps);

  const zoomBy = (factor: number) => setManualPps(Math.min(MAX_PPS, Math.max(MIN_PPS, pps * factor)));

  /* ------------------------------------------------------------- seeking -- */

  const timeAt = React.useCallback(
    (clientX: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return 0;
      const rect = scroller.getBoundingClientRect();
      const x = clientX - rect.left + scroller.scrollLeft;
      return Math.min(safeDuration, Math.max(0, x / pps));
    },
    [pps, safeDuration],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    onSeek(timeAt(event.clientX));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onSeek(timeAt(event.clientX));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // Follow the playhead while playing, and never fight the user's own drag.
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || dragging || !isPlaying) return;
    const x = Math.min(trackWidth, currentTime * pps);
    const margin = scroller.clientWidth * 0.3;
    if (x < scroller.scrollLeft + margin) {
      scroller.scrollLeft = Math.max(0, x - margin);
    } else if (x > scroller.scrollLeft + scroller.clientWidth - margin) {
      scroller.scrollLeft = x - (scroller.clientWidth - margin);
    }
  }, [currentTime, isPlaying, pps, dragging, trackWidth]);

  /* --------------------------------------------------------------- words -- */

  const activeIndex = React.useMemo(() => {
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]!;
      if (currentTime >= word.start && currentTime < word.end) return i;
    }
    // Between words: the last word that already started.
    let last = -1;
    for (let i = 0; i < words.length; i += 1) {
      if (words[i]!.start <= currentTime) last = i;
      else break;
    }
    return last;
  }, [words, currentTime]);

  const stepWord = (direction: 1 | -1) => {
    if (words.length === 0) return;
    const index = Math.min(words.length - 1, Math.max(0, activeIndex + direction));
    const target = words[index];
    if (target) onSeek(direction === -1 ? target.start : Math.max(target.start, target.end - 0.15));
  };

  /** Span of the ayah the playhead is inside — what the loop button repeats. */
  const activeAyah = React.useMemo(() => {
    const word = activeIndex >= 0 ? words[activeIndex] : words[0];
    if (!word || word.ayah === undefined) return null;
    const same = words.filter((item) => item.ayah === word.ayah);
    if (same.length === 0) return null;
    return {
      ayah: word.ayah,
      start: Math.min(...same.map((item) => item.start)),
      end: Math.max(...same.map((item) => item.end)),
    };
  }, [words, activeIndex]);

  const loopActive =
    loop !== null && Math.abs(loop.start - (activeAyah?.start ?? -1)) < 0.001 && Math.abs(loop.end - (activeAyah?.end ?? -1)) < 0.001;

  /* ------------------------------------------------------------ waveform -- */

  const buckets = React.useMemo(
    () => (envelope && envelope.length > 0 ? envelope : envelopeFromWords(words, safeDuration)),
    [envelope, words, safeDuration],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const height = 54;
    const width = Math.ceil(trackWidth);
    const ratio = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bars = buckets.length;
    if (bars === 0) return;
    const barWidth = Math.max(2, width / bars);
    const mid = height / 2;

    for (let i = 0; i < bars; i += 1) {
      const value = Math.max(0.04, Math.min(1, buckets[i] ?? 0));
      const played = (i + 0.5) / bars <= currentTime / safeDuration;
      const barHeight = Math.max(3, value * (height - 10));
      ctx.fillStyle = played ? "rgba(77,155,255,0.95)" : "rgba(150,170,200,0.35)";
      ctx.fillRect(i * barWidth + 0.5, mid - barHeight / 2, Math.max(1.5, barWidth - 2), barHeight);
    }
  }, [buckets, trackWidth, currentTime, safeDuration]);

  /* --------------------------------------------------------------- ruler -- */

  const tickStep = niceStep(RULER_TARGET_PX / pps);
  const ticks: number[] = [];
  for (let t = 0; t <= safeDuration + 0.0001; t += tickStep) ticks.push(Number(t.toFixed(3)));

  const scrollIntoView = (time: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const x = time * pps;
    if (x < scroller.scrollLeft || x > scroller.scrollLeft + scroller.clientWidth - 40) {
      scroller.scrollLeft = Math.max(0, x - scroller.clientWidth * 0.25);
    }
  };

  const jumpTo = (time: number) => {
    scrollIntoView(time);
    onSeek(time);
  };

  return (
    <section
      aria-label="مسار المونتاج الزمني"
      dir="ltr"
      className="rounded-2xl border p-3"
      style={{ borderColor: "rgba(43,127,255,0.28)", background: "rgba(8,12,22,0.72)" }}
    >
      {/* --------------------------------------------------------- toolbar -- */}
      <div
        dir="rtl"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}
      >
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            background: isPlaying ? "rgba(239,68,68,0.22)" : "linear-gradient(135deg, #2B7FFF, #1552CC)",
            color: isPlaying ? "#FCA5A5" : "#0A0D18",
          }}
        >
          {isPlaying ? "⏸ إيقاف" : "▶ تشغيل"}
        </button>

        <button
          type="button"
          onClick={() => stepWord(-1)}
          disabled={activeIndex <= 0}
          aria-label="الكلمة السابقة"
          style={{ ...chipButton, opacity: activeIndex <= 0 ? 0.4 : 1 }}
        >
          ⏮ كلمة
        </button>
        <button
          type="button"
          onClick={() => stepWord(1)}
          disabled={activeIndex >= words.length - 1}
          aria-label="الكلمة التالية"
          style={{ ...chipButton, opacity: activeIndex >= words.length - 1 ? 0.4 : 1 }}
        >
          كلمة ⏭
        </button>

        <span
          className="force-ltr"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            color: "#E8EEF7",
          }}
        >
          <span style={{ color: "#4D9BFF" }}>{timecode(currentTime)}</span>
          <span style={{ color: "rgba(200,210,230,0.5)" }}> / {timecode(safeDuration)}</span>
        </span>

        <span style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => {
            const ayah = activeAyah;
            if (!ayah) return;
            onLoopChange(loopActive ? null : { start: ayah.start, end: ayah.end });
            if (!loopActive) onSeek(ayah.start);
          }}
          disabled={!activeAyah}
          aria-pressed={loopActive}
          title={activeAyah ? `تكرار الآية ${activeAyah.ayah}` : "تكرار الآية"}
          style={{
            ...chipButton,
            opacity: activeAyah ? 1 : 0.4,
            background: loopActive ? "rgba(77,155,255,0.22)" : "rgba(255,255,255,0.06)",
            color: loopActive ? "#8AB9FF" : "#E8EEF7",
            border: `1px solid ${loopActive ? "rgba(77,155,255,0.5)" : "rgba(255,255,255,0.14)"}`,
          }}
        >
          🔁 {loopActive ? "إلغاء التكرار" : "تكرار الآية"}
        </button>

        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.6)}
            disabled={zoom <= 1.001}
            aria-label="تصغير التايملاين"
            style={{ ...chipButton, opacity: zoom <= 1.001 ? 0.4 : 1 }}
          >
            ➖
          </button>
          <span style={{ fontSize: 11, color: "rgba(200,210,230,0.65)", minWidth: 38, textAlign: "center" }}>
            {`×${zoom.toFixed(1)}`}
          </span>
          <button
            type="button"
            onClick={() => zoomBy(1.6)}
            aria-label="تكبير التايملاين"
            style={chipButton}
          >
            ➕
          </button>
          <button
            type="button"
            onClick={() => setManualPps(null)}
            aria-label="ملاءمة التايملاين"
            style={chipButton}
          >
            ⤢ ملاءمة
          </button>
        </span>
      </div>

      {/* -------------------------------------------------------- timeline -- */}
      <div
        ref={scrollerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="slider"
        tabIndex={0}
        aria-label="موضع التشغيل"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={timecode(currentTime)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onSeek(Math.max(0, currentTime - (event.shiftKey ? 1 : 0.1)));
          else if (event.key === "ArrowRight") onSeek(Math.min(safeDuration, currentTime + (event.shiftKey ? 1 : 0.1)));
          else if (event.key === "Home") onSeek(0);
          else if (event.key === "End") onSeek(safeDuration);
          else if (event.key === " ") {
            event.preventDefault();
            onTogglePlay();
          } else return;
          event.preventDefault();
        }}
        className="timeline-scroller"
        style={{
          position: "relative",
          overflowX: "auto",
          overflowY: "hidden",
          borderRadius: 12,
          background: "rgba(4,7,14,0.85)",
          border: "1px solid rgba(255,255,255,0.07)",
          cursor: dragging ? "grabbing" : "pointer",
          touchAction: "pan-x",
          outline: "none",
        }}
      >
        <div ref={surfaceRef} style={{ position: "relative", width: trackWidth, minWidth: "100%" }}>
          {/* ruler */}
          <div style={{ position: "relative", height: 22, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {ticks.map((tick) => (
              <span
                key={tick}
                className="force-ltr"
                style={{
                  position: "absolute",
                  left: tick * pps,
                  top: 3,
                  fontSize: 9,
                  color: "rgba(200,210,230,0.45)",
                  borderLeft: "1px solid rgba(255,255,255,0.14)",
                  paddingLeft: 3,
                  height: 16,
                  whiteSpace: "nowrap",
                }}
              >
                {timecode(tick)}
              </span>
            ))}
          </div>

          {/* loop region */}
          {loop ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 22,
                bottom: 0,
                left: loop.start * pps,
                width: Math.max(2, (loop.end - loop.start) * pps),
                background: "rgba(77,155,255,0.14)",
                borderLeft: "2px solid rgba(77,155,255,0.8)",
                borderRight: "2px solid rgba(77,155,255,0.8)",
                pointerEvents: "none",
              }}
            />
          ) : null}

          {/* waveform */}
          <canvas ref={canvasRef} style={{ display: "block" }} />

          {/* word chips */}
          <div style={{ position: "relative", height: 46, marginTop: 2 }}>
            {words.map((word, index) => {
              const left = word.start * pps;
              const width = Math.max(16, (word.end - word.start) * pps - 3);
              const active = index === activeIndex;
              const inside = loop ? word.start >= loop.start && word.end <= loop.end : false;
              return (
                <button
                  key={`${word.start}-${index}`}
                  type="button"
                  // Chips must not start a scrub on the track underneath them.
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    jumpTo(word.start);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (word.ayah === undefined) return;
                    const same = words.filter((item) => item.ayah === word.ayah);
                    if (same.length === 0) return;
                    onLoopChange({
                      start: Math.min(...same.map((item) => item.start)),
                      end: Math.max(...same.map((item) => item.end)),
                    });
                  }}
                  title={`${word.text} · ${timecode(word.start)}`}
                  aria-label={`الكلمة ${word.text} عند ${timecode(word.start)}`}
                  aria-current={active ? "true" : undefined}
                  style={{
                    position: "absolute",
                    left,
                    width,
                    top: 6,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: width > 34 ? "0 6px" : 0,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    fontFamily: "'Amiri', 'Cairo', serif",
                    whiteSpace: "nowrap",
                    color: active ? "#0A0D18" : "#DDE6F2",
                    background: active
                      ? "linear-gradient(135deg, #8AB9FF, #4D9BFF)"
                      : inside
                        ? "rgba(77,155,255,0.22)"
                        : "rgba(255,255,255,0.09)",
                    boxShadow: active ? "0 0 14px rgba(77,155,255,0.55)" : "none",
                    transform: active ? "translateY(-1px)" : "none",
                    transition: "background 120ms linear, color 120ms linear",
                  }}
                >
                  {/* Below ~30px the Arabic glyphs would be unreadable slivers,
                      so the chip stays a solid block and leans on its tooltip. */}
                  {width > 30 ? (
                    <span dir="rtl" style={{ pointerEvents: "none" }}>
                      {word.text}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* playhead */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: Math.min(trackWidth, currentTime * pps),
              width: 2,
              background: "linear-gradient(180deg, #8AB9FF, #4D9BFF)",
              boxShadow: "0 0 10px rgba(77,155,255,0.8)",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -2,
                left: -5,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#8AB9FF",
                boxShadow: "0 0 10px rgba(77,155,255,0.9)",
              }}
            />
          </div>
        </div>
      </div>

      <p
        dir="rtl"
        style={{ margin: "8px 2px 0", fontSize: 11, color: "rgba(200,210,230,0.6)" }}
      >
        انقر على أي كلمة للقفز إليها · انقر مرتين على الكلمة لتكرار آيتها · اسحب المؤشر للتنقل ·{" "}
        {activeIndex >= 0 ? `الكلمة ${activeIndex + 1} من ${words.length}` : `${words.length} كلمة`}
      </p>
    </section>
  );
}

const chipButton: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#E8EEF7",
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
