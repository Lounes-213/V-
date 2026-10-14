"use client";

import * as React from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ALL_SURAHS, alignAyahsToAudioRuns, fetchSurahVerses } from "@/lib/quran/canonical";
import { decodeAudioSamples } from "@/lib/waveform";
import { analyzeSound } from "@/lib/audio/voice-activity";
import { getMedia, putProject } from "@/lib/db";
import { readMediaFile } from "@/lib/media-store";
import type { Project } from "@/lib/types";

export function AlignSurahDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: (updated: Project) => void;
}) {
  const { open, onOpenChange, project, onSuccess } = props;
  const { toast } = useToast();

  const [surahNum, setSurahNum] = React.useState<number>(1);
  const [ayahFrom, setAyahFrom] = React.useState<number>(1);
  const [busy, setBusy] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState("");

  const currentSurah = ALL_SURAHS.find((s) => s.number === surahNum) || ALL_SURAHS[0]!;

  const handleAlign = async () => {
    setBusy(true);
    setStatusMsg("جاري تحميل آيات السورة من المصحف الشريف...");

    try {
      // 1. Fetch Ayahs for the selected Surah
      const verses = await fetchSurahVerses(surahNum, ayahFrom);
      if (verses.length === 0) {
        toast({
          title: "تعذر جلب الآيات",
          description: "يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.",
          tone: "danger",
        });
        setBusy(false);
        return;
      }

      setStatusMsg("جاري تحليل النطق والوقف في الصوت...");

      // 2. Extract speech runs from media if available
      let speechRuns: { start: number; end: number; durationSec: number }[] = [];
      try {
        const mediaHandle = await getMedia(project.id);
        let blob: Blob | null | undefined = mediaHandle?.blob;
        if (!blob && mediaHandle?.opfsPath) {
          blob = await readMediaFile(mediaHandle.opfsPath);
        }

        if (blob) {
          const decoded = await decodeAudioSamples(blob);
          const sound = analyzeSound(decoded.samples, decoded.sampleRate);
          speechRuns = sound.speech;
        }
      } catch {
        /* Fallback: if audio cannot be decoded directly, alignment will synthesize intervals */
      }

      setStatusMsg("جاري مواءمة الآيات مع التلاوة والوقف...");

      // 3. Align Ayahs strictly to audio runs ("ila ntaq" vs "ila habes")
      const aligned = alignAyahsToAudioRuns({
        ayahs: verses,
        speechRuns,
        totalDuration: project.durationSec,
        projectId: project.id,
      });

      const updatedProject: Project = {
        ...project,
        words: aligned.words,
        quran: aligned.matches,
        suggestions: aligned.suggestions,
        updatedAt: Date.now(),
      };

      await putProject(updatedProject);
      onSuccess(updatedProject);
      onOpenChange(false);

      toast({
        title: "تمت محاذاة السورة بنجاح",
        description: `${currentSurah.nameArabic} · ${aligned.matches.length} آية متطابقة مع الصوت`,
        tone: "success",
      });
    } catch (err) {
      toast({
        title: "حدث خطأ أثناء المحاذاة",
        description: (err as Error)?.message || "يرجى المحاولة مجدداً.",
        tone: "danger",
      });
    } finally {
      setBusy(false);
      setStatusMsg("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="محاذاة سورة مع تلاوة الصوت · Align Surah to Audio"
        description="اختر السورة القرآنية ليقوم النظام بجلب نصها العثماني ومحاذاتها تلقائياً مع مواضع نطق القارئ وسكناته (الوقف والابتداء)."
        className="max-w-lg"
      >
        <div className="mt-4 space-y-4">
          <Field label="السورة الكريمة (Surah)" htmlFor="surah-select">
            <Select value={String(surahNum)} onValueChange={(val) => setSurahNum(Number(val))}>
              <SelectTrigger id="surah-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {ALL_SURAHS.map((s) => (
                  <SelectItem key={s.number} value={String(s.number)}>
                    {s.number}. {s.nameArabic} ({s.nameSimple}) — {s.ayahCount} آية
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="من الآية (From Ayah)" htmlFor="ayah-from">
            <Input
              id="ayah-from"
              type="number"
              min={1}
              max={currentSurah.ayahCount}
              value={ayahFrom}
              onChange={(e) => setAyahFrom(Math.max(1, Math.min(currentSurah.ayahCount, parseInt(e.target.value) || 1)))}
            />
          </Field>

          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3.5 text-xs text-muted">
            <p className="flex items-center gap-1.5 font-medium text-gold">
              <Sparkles className="size-3.5 shrink-0" />
              محاذاة ذكية مع نطق القارئ:
            </p>
            <p className="mt-1">
              يتم تقسيم الآيات وتوقيت الكلمات بناءً على مواضع النطق الفعلي (Voice Activity Runs)، مع الحفاظ التام على
              لحظات الوقف والتنفس خالية من أي كلمات.
            </p>
          </div>

          {statusMsg ? (
            <div className="flex items-center gap-2 rounded-lg bg-surface/80 p-2.5 text-xs text-fg">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>{statusMsg}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              variant="gold"
              icon={busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
              disabled={busy}
              onClick={() => void handleAlign()}
            >
              {busy ? "جاري المحاذاة..." : "بدء المحاذاة مع الصوت"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
