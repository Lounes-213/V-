"use client";

import * as React from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AyahAudioPlayerProps = {
  audioUrl?: string;
  surah: number;
  ayah: number;
  reciterId?: number;
};

export function AyahAudioPlayer({ audioUrl, surah, ayah, reciterId = 7 }: AyahAudioPlayerProps) {
  const [playing, setPlaying] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const folder = reciterId === 1 ? "Abdul_Basit_Murattal_192kbps" : reciterId === 2 ? "Husary_128kbps" : "Alafasy_128kbps";
  const url =
    audioUrl ||
    `https://everyayah.com/data/${folder}/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(true);

      audio.oncanplay = () => {
        setLoading(false);
      };

      audio.onended = () => {
        setPlaying(false);
      };

      audio.onerror = () => {
        setLoading(false);
        setPlaying(false);
      };
    }

    audioRef.current
      .play()
      .then(() => {
        setPlaying(true);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setPlaying(false);
      });
  };

  return (
    <Button
      variant={playing ? "gold" : "ghost"}
      size="xs"
      onClick={toggle}
      className={playing ? "animate-pulse border-gold/50" : ""}
      title="Listen to recitation / استماع للتلاوة"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin text-gold" />
      ) : playing ? (
        <Square className="size-3.5 fill-current text-gold" />
      ) : (
        <Volume2 className="size-3.5 text-gold" />
      )}
      <span className="text-[11px] font-medium">
        {playing ? "إيقاف" : "استماع"}
      </span>
    </Button>
  );
}
