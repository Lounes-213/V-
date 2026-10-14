"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  Loader2,
  Search,
  Square,
  Volume2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ALL_SURAHS } from "@/lib/quran/surahs-data";
import { fetchCanonicalAyah, lookupAyah, type CanonicalAyah } from "@/lib/quran/canonical";
import type { QuranMatch } from "@/lib/types";

type AddVerseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectDuration: number;
  onAdd: (match: QuranMatch, shouldApplyToCaptions: boolean) => void;
};

const POPULAR_AYAHS = [
  { label: "الفاتحة", surah: 1, ayah: 1 },
  { label: "آية الكرسي", surah: 2, ayah: 255 },
  { label: "يس", surah: 36, ayah: 1 },
  { label: "الرحمن", surah: 55, ayah: 1 },
  { label: "الملك", surah: 67, ayah: 1 },
  { label: "الإخلاص", surah: 112, ayah: 1 },
  { label: "الفلق", surah: 113, ayah: 1 },
  { label: "الناس", surah: 114, ayah: 1 },
];

export function AddVerseDialog({
  open,
  onOpenChange,
  projectDuration,
  onAdd,
}: AddVerseDialogProps) {
  const [tab, setTab] = React.useState<"browse" | "search">("browse");

  // Browse state
  const [surahNum, setSurahNum] = React.useState<number>(1);
  const [ayahNum, setAyahNum] = React.useState<number>(1);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    {
      id: string;
      surah: number;
      ayah: number;
      surahNameArabic: string;
      surahNameSimple: string;
      uthmani: string;
      translation: string;
      audioUrl?: string;
    }[]
  >([]);
  const [searching, setSearching] = React.useState(false);

  // Active loaded verse preview
  const [loadedVerse, setLoadedVerse] = React.useState<
    (CanonicalAyah & { audioUrl?: string }) | null
  >(null);
  const [loadingVerse, setLoadingVerse] = React.useState(false);

  // Timing state
  const [startTime, setStartTime] = React.useState<string>("0.0");
  const [endTime, setEndTime] = React.useState<string>("6.0");
  const [applyCaptions, setApplyCaptions] = React.useState(true);

  // Audio preview state
  const [audioPlaying, setAudioPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const activeSurah = ALL_SURAHS.find((s) => s.number === surahNum) ?? ALL_SURAHS[0]!;

  // Stop audio on close
  React.useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
    }
  }, [open]);

  // Load verse whenever surahNum or ayahNum changes
  React.useEffect(() => {
    let cancelled = false;
    setLoadingVerse(true);

    const direct = lookupAyah(surahNum, ayahNum);
    if (direct) {
      setLoadedVerse({
        ...direct,
        audioUrl: `https://everyayah.com/data/Alafasy_128kbps/${String(surahNum).padStart(3, "0")}${String(ayahNum).padStart(3, "0")}.mp3`,
      });
      setLoadingVerse(false);
      return;
    }

    void fetchCanonicalAyah(surahNum, ayahNum).then((result) => {
      if (cancelled) return;
      setLoadedVerse(result ?? null);
      setLoadingVerse(false);
    });

    return () => {
      cancelled = true;
    };
  }, [surahNum, ayahNum]);

  // Live Quran search handler
  const handleSearch = React.useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/quran?action=search&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        setSearchResults(json.results || []);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const toggleAudio = (url?: string) => {
    if (!url) return;
    if (audioPlaying) {
      audioRef.current?.pause();
      setAudioPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    audio
      .play()
      .then(() => setAudioPlaying(true))
      .catch(() => setAudioPlaying(false));
  };

  const handleSelectSearchResult = (result: (typeof searchResults)[0]) => {
    setSurahNum(result.surah);
    setAyahNum(result.ayah);
    setLoadedVerse({
      id: `${result.surah}:${result.ayah}`,
      surah: result.surah,
      ayah: result.ayah,
      uthmani: result.uthmani,
      translation: result.translation,
      surahNameArabic: result.surahNameArabic,
      surahNameSimple: result.surahNameSimple,
      surahNameTranslated: result.surahNameSimple,
      ayahCount: ALL_SURAHS.find((s) => s.number === result.surah)?.ayahCount || 1,
      audioUrl: result.audioUrl,
    });
    setTab("browse");
  };

  const handleConfirm = () => {
    if (!loadedVerse) return;
    const start = Math.max(0, parseFloat(startTime) || 0);
    const end = Math.max(start + 0.5, parseFloat(endTime) || start + 5.0);

    const match: QuranMatch = {
      id: `q-manual-${loadedVerse.surah}-${loadedVerse.ayah}-${Date.now().toString(36)}`,
      surah: loadedVerse.surah,
      surahName: loadedVerse.surahNameArabic,
      ayah: loadedVerse.ayah,
      uthmani: loadedVerse.uthmani,
      translation: loadedVerse.translation,
      confidence: 1.0,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      reviewed: true,
      fromCache: false,
    };

    onAdd(match, applyCaptions);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="إضافة آية من القرآن الكريم · Add Quran Verse"
        description="تصفح كافة سور وآيات القرآن الكريم الـ 114 أو ابحث عن أي نص قرآني مع الاستماع للتلاوة وإدراجه في الفيديو."
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="mt-4 space-y-4">
          {/* Quick shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <span className="text-xs text-subtle me-1">آيات مشهورة:</span>
            {POPULAR_AYAHS.map((item) => (
              <button
                key={`${item.surah}:${item.ayah}`}
                type="button"
                onClick={() => {
                  setSurahNum(item.surah);
                  setAyahNum(item.ayah);
                  setTab("browse");
                }}
                className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs text-gold transition-colors hover:border-gold hover:bg-gold/20"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-border bg-raised/40 p-1">
            <button
              type="button"
              onClick={() => setTab("browse")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === "browse" ? "bg-primary-soft text-primary font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              <BookOpen className="inline size-3.5 me-1.5" />
              تصفح السور والآيات (1-114)
            </button>
            <button
              type="button"
              onClick={() => setTab("search")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === "search" ? "bg-primary-soft text-primary font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              <Search className="inline size-3.5 me-1.5" />
              البحث في نص المصحف
            </button>
          </div>

          {tab === "browse" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-fg mb-1">السورة (114 سورة)</label>
                <Select
                  value={String(surahNum)}
                  onValueChange={(val) => {
                    const num = Number(val);
                    setSurahNum(num);
                    setAyahNum(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {ALL_SURAHS.map((s) => (
                      <SelectItem key={s.number} value={String(s.number)}>
                        <span className="font-mono text-xs text-subtle me-1.5">{s.number}.</span>
                        <span className="font-semibold text-fg">{s.nameArabic}</span>
                        <span className="text-xs text-muted ms-1.5">({s.nameSimple} · {s.ayahCount} آية)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1">
                  رقم الآية (من 1 إلى {activeSurah.ayahCount})
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={activeSurah.ayahCount}
                    value={ayahNum}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(activeSurah.ayahCount, Number(e.target.value) || 1));
                      setAyahNum(v);
                    }}
                  />
                  <span className="text-xs text-subtle shrink-0">من {activeSurah.ayahCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute start-3 inset-y-0 my-auto size-4 text-subtle" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    void handleSearch(e.target.value);
                  }}
                  placeholder="اكتب كلمات من الآية (مثال: الله نور السماوات، قل هو الله احد...)"
                  className="ps-9"
                  dir="auto"
                />
              </div>

              {searching ? (
                <div className="flex items-center justify-center py-6 text-xs text-subtle">
                  <Loader2 className="size-4 animate-spin me-2 text-gold" />
                  جاري البحث في القرآن الكريم...
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-border/40">
                  {searchResults.map((item) => (
                    <li key={item.id} className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-start p-2 rounded-lg hover:bg-gold/10 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs text-gold">
                          <span>سورة {item.surahNameArabic} · الآية {item.ayah}</span>
                          <span className="text-[10px] text-subtle">{item.id}</span>
                        </div>
                        <p dir="rtl" className="font-quran text-base mt-1 text-fg">
                          {item.uthmani}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchQuery.length >= 2 ? (
                <p className="text-center text-xs text-subtle py-4">لم يتم العثور على نتائج مطابقة.</p>
              ) : null}
            </div>
          )}

          {/* Loaded verse display */}
          {loadingVerse ? (
            <div className="rounded-xl border border-border bg-ink/30 p-6 flex items-center justify-center text-xs text-subtle">
              <Loader2 className="size-5 animate-spin text-gold me-2" />
              جاري جلب الآية بالرسم العثماني المعتمد...
            </div>
          ) : loadedVerse ? (
            <div className="rounded-xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-2">
                <div className="flex items-center gap-2">
                  <Badge tone="gold">
                    سورة {loadedVerse.surahNameArabic} · الآية {loadedVerse.ayah}
                  </Badge>
                  <span className="text-[11px] text-subtle">
                    {activeSurah.revelation === "makkah" ? "مكية" : "مدنية"} · {activeSurah.nameSimple}
                  </span>
                </div>

                {loadedVerse.audioUrl ? (
                  <Button
                    variant={audioPlaying ? "gold" : "ghost"}
                    size="xs"
                    onClick={() => toggleAudio(loadedVerse.audioUrl)}
                  >
                    {audioPlaying ? (
                      <Square className="size-3.5 fill-current me-1.5 text-gold" />
                    ) : (
                      <Volume2 className="size-3.5 me-1.5 text-gold" />
                    )}
                    {audioPlaying ? "إيقاف التلاوة" : "استماع للآية"}
                  </Button>
                ) : null}
              </div>

              <p dir="rtl" className="font-quran text-2xl leading-[2.4] text-fg text-center py-2">
                {loadedVerse.uthmani}
                <span className="text-gold mx-2">۝</span>
              </p>

              {loadedVerse.translation ? (
                <p className="text-xs text-muted border-t border-border/40 pt-2" dir="ltr">
                  <span className="font-semibold text-fg/70">Translation: </span>
                  {loadedVerse.translation}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Timings and caption insertion */}
          <div className="rounded-lg border border-border bg-raised/30 p-3 space-y-3">
            <h4 className="text-xs font-semibold text-fg">توقيت الآية في الفيديو (بالثواني)</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="بداية الظهور (ثواني)" htmlFor="start-time">
                <Input
                  id="start-time"
                  type="number"
                  step="0.1"
                  min="0"
                  max={projectDuration || 3600}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>
              <Field label="نهاية الظهور (ثواني)" htmlFor="end-time">
                <Input
                  id="end-time"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max={projectDuration || 3600}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={applyCaptions}
                onChange={(e) => setApplyCaptions(e.target.checked)}
                className="rounded border-border text-gold focus:ring-gold size-4"
              />
              <span className="text-xs text-fg">
                تطبيق النص القرآني مباشرة على شريط الترجمة المرئية (Captions)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              variant="gold"
              icon={<Check />}
              disabled={!loadedVerse}
              onClick={handleConfirm}
            >
              إدراج الآية في المشروع
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
